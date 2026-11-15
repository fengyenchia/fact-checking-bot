import "server-only"

import type { CaseCardData } from "@/components/case-card"
import { featuredPost } from "@/data/posts"
import { scenarioVersion } from "@/data/scenarios/ticket"
import { getDatabase } from "./database"
import { embedText, hasOpenAi } from "./openai"

function caseCard(row: Record<string, unknown>): CaseCardData {
  // Older cases can display an excerpt until a short summary is generated.
  const original = Array.from(String(row.summary))
  const excerpt = original.length > 60 ? `${original.slice(0, 59).join("")}…` : original.join("")
  return {
    id: String(row.id),
    title: String(row.title),
    summary: typeof row.card_summary === "string" ? row.card_summary : excerpt,
    sourceName: String(row.source_name),
    sourceUrl: String(row.source_url),
  }
}

export async function findCases(query: string, productHint: string | null) {
  const sql = getDatabase()
  if (!sql) throw new Error("案例資料庫尚未設定")

  const embedding = JSON.stringify(await embedText(query))
  const rows = await sql`
    SELECT id, title, summary, card_summary, source_name, source_url
    FROM (
      SELECT *, 1 - (embedding <=> ${embedding}::vector) AS similarity,
        CASE WHEN ${productHint}::text IS NOT NULL
          AND product_type ILIKE '%' || ${productHint}::text || '%' THEN 0.15 ELSE 0 END AS product_score,
        CASE WHEN EXISTS (
          SELECT 1 FROM unnest(method_tags) AS tags(tag)
          WHERE length(tag) > 1 AND strpos(${query}, tag) > 0
        ) THEN 0.12 ELSE 0 END AS method_score
      FROM cases
      WHERE included AND embedding IS NOT NULL
    ) AS candidates
    WHERE source_url LIKE 'https://%'
      AND similarity >= 0.25
      AND (similarity >= 0.4 OR product_score + method_score > 0)
    ORDER BY similarity + product_score + method_score DESC, id
    LIMIT 3
  `

  return rows.map((row) => ({ card: caseCard(row), summary: String(row.summary) }))
}

export async function getHomepageCards(): Promise<CaseCardData[]> {
  const sql = getDatabase()
  if (!sql) return []

  const rows = await sql`
    SELECT entry.id, entry.title, entry.summary, entry.card_summary, entry.source_name, entry.source_url
    FROM homepage_cards AS saved
    CROSS JOIN LATERAL jsonb_array_elements(saved.cards) WITH ORDINALITY AS selected(card, position)
    JOIN cases AS entry ON entry.id = selected.card->>'id'
    WHERE saved.script_version = ${scenarioVersion} AND entry.included
    ORDER BY selected.position
  `
  return rows.map(caseCard)
}

export async function prepareHomepageCards(): Promise<CaseCardData[]> {
  const sql = getDatabase()
  if (!sql || !hasOpenAi()) throw new Error("請先設定 Neon 和 OpenAI")

  const query = [featuredPost.topic, featuredPost.text].filter(Boolean).join("\n")
  const matches = await findCases(query, featuredPost.topic ?? null)
  const cards = matches.map(({ card }) => card)

  await sql`
    INSERT INTO homepage_cards (script_version, cards)
    VALUES (${scenarioVersion}, ${JSON.stringify(cards)}::jsonb)
    ON CONFLICT (script_version) DO UPDATE SET cards = excluded.cards, updated_at = now()
  `
  return cards
}
