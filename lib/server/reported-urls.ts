import "server-only"

import reports from "@/data/通報TWNIC詐騙網址彙整表_20261008.json"
import { parseWidgetUrl } from "@/lib/widget-url"

function reportKey(url: URL) {
  const host = url.hostname.replace(/\.$/, "")
  const port = url.port ? `:${url.port}` : ""
  return `${host}${port}${url.pathname}${url.search}${url.hash}`
}

const reportIndex = new Map(reports.flatMap((report) => {
  const url = parseWidgetUrl(report["偽冒網址"])
  return url ? [[reportKey(url), report] as const] : []
}))

export function findReportedUrl(url: URL) {
  return reportIndex.get(reportKey(url))
}
