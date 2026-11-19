import "server-only"

import type { CaseCardData } from "@/components/case-card"

export type RelatedCase = { card: CaseCardData; summary: string }
export type RetrievalStatus = "completed" | "unavailable"

export const caseSelectionInstructions = [
  "caseIds 只從 relatedCases 選出與本輪網購商品或交易手法真正相關的案例 ID，依相關性由高至低排列，最多三筆。以本輪提交內容為主，前文只供理解脈絡；使用者改問其他商品時，不沿用前一商品的案例。",
  "沒有適合案例、問題明確非網購範圍或檢索未完成時，caseIds 回傳空陣列。不硬湊三筆、不捏造 ID；案例中的情節不代表使用者已遇到同樣情況。",
].join("\n")

export const caseIdsSchema = { type: "array", maxItems: 3, items: { type: "string" } }

export function validateCaseIds(value: unknown, candidates: RelatedCase[]): string[] {
  if (!Array.isArray(value) || value.length > 3
    || !value.every((id) => typeof id === "string" && candidates.some(({ card }) => card.id === id))) {
    throw new Error("引用案例不在本次檢索結果中")
  }
  return [...new Set(value as string[])]
}

export function selectedCaseCards(candidates: RelatedCase[], caseIds: unknown): CaseCardData[] {
  return validateCaseIds(caseIds, candidates).flatMap((id) => {
    const match = candidates.find(({ card }) => card.id === id)
    return match ? [match.card] : []
  })
}
