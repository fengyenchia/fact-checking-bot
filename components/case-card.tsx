import { IconArrowUpRight } from "@tabler/icons-react";

export type CaseCardData = {
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
};

const dashboardCasesUrl = "https://165dashboard.tw/city-case-summary";
const dashboardOrigin = new URL(dashboardCasesUrl).origin;

function getDashboardUrl(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl);
    if (url.origin === dashboardOrigin && !url.username && !url.password) return url.href;
  } catch {
    // Use the dashboard case list if there is no valid dashboard URL.
  }
  return dashboardCasesUrl;
}

function CaseCard({ item }: { item: CaseCardData }) {
  return (
    <a
      href={getDashboardUrl(item.sourceUrl)}
      target="_blank"
      rel="noreferrer"
      className="flex h-full min-h-40 flex-col rounded-widget border border-black3 bg-white p-3 text-black hover:bg-muted/40 active:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <h4 className="line-clamp-2 min-h-12 text-center text-base leading-6 wrap-anywhere">{item.title}</h4>
      <p className="line-clamp-3 text-sm leading-5 wrap-anywhere text-black3">{item.summary}</p>
      <span className="mt-auto grid size-8 shrink-0 self-end place-items-center rounded-widget bg-yellow2">
        <IconArrowUpRight aria-hidden size={20} stroke={2} />
      </span>
      <span className="sr-only">在新分頁開啟 165 打詐儀錶板</span>
    </a>
  );
}

export function CaseCarousel({ cases, headingAlign = "center" }: {
  cases: CaseCardData[];
  headingAlign?: "left" | "center";
}) {
  if (!cases.length) return null;

  return (
    <section className="min-w-0 space-y-1.5">
      <h3 className={`text-base font-medium ${headingAlign === "left" ? "text-left" : "text-center"}`}>查看其他案例：</h3>
      <div
        role="region"
        aria-label="相關案例，可橫向捲動"
        tabIndex={0}
        className="snap-x snap-proximity scroll-px-1 overflow-x-auto overscroll-x-contain p-1 outline-ring focus-visible:outline-2 scrollbar-none"
      >
        <ul className="flex gap-2.5">
          {cases.map((item) => (
            <li key={item.id} className="w-[72%] max-w-56 shrink-0 snap-start">
              <CaseCard item={item} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
