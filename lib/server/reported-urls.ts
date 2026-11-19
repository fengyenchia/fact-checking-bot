import "server-only"

import { getDomain } from "tldts"
import reports from "@/data/通報TWNIC詐騙網址彙整表_20261008.json"
import { parseWidgetUrl } from "@/lib/widget-url"

function reportDomain(url: URL) {
  return getDomain(url.hostname.replace(/\.$/, ""), { allowPrivateDomains: true })
}

const reportIndex = new Map(reports.flatMap((report) => {
  const url = parseWidgetUrl(report["網域名稱"]) ?? parseWidgetUrl(report["偽冒網址"])
  const domain = url && reportDomain(url)
  return domain ? [[domain, report] as const] : []
}))

export function findReportedDomain(url: URL) {
  const domain = reportDomain(url)
  return domain ? reportIndex.get(domain) : undefined
}
