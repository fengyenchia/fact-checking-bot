import { IconArrowUpRight } from "@tabler/icons-react";

export type CaseCardData = {
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
};

export function CaseCard({ item }: { item: CaseCardData }) {
  let sourceUrl: URL | undefined;
  try {
    const url = new URL(item.sourceUrl);
    if (url.protocol === "https:") sourceUrl = url;
  } catch {
    // A missing or malformed source can still be displayed as plain text.
  }

  return (
    <article className="min-w-0 rounded-2xl border border-border bg-background px-4 py-3.5">
      <h3 className="text-sm leading-snug font-semibold [overflow-wrap:anywhere]">{item.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed [overflow-wrap:anywhere] text-muted-foreground">
        {item.summary}
      </p>
      <footer className="mt-2.5 flex flex-wrap items-center gap-x-2 text-xs leading-snug text-muted-foreground">
        {sourceUrl ? (
          <a
            className="inline-flex min-h-8 items-center gap-0.5 font-medium text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
            href={sourceUrl.href}
            target="_blank"
            rel="noreferrer"
          >
            {item.sourceName}
            <IconArrowUpRight aria-hidden size={13} stroke={1.8} />
          </a>
        ) : (
          <span>{item.sourceName}</span>
        )}
      </footer>
    </article>
  );
}
