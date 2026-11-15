import "server-only"

export class InvalidAdminInput extends Error {}

export function readValue(data: FormData, name: string, label: string, limit: number, mandatory = false) {
  const raw = data.get(name)
  const value = typeof raw === "string" ? raw.trim() : ""
  if (mandatory && !value) throw new InvalidAdminInput(`請填寫${label}。`)
  if (value.length > limit) throw new InvalidAdminInput(`${label}最多 ${limit} 個字元。`)
  return value
}

export function parseSourceUrl(value: string, httpsOnly = false) {
  if (!value) return null
  try {
    const url = new URL(value)
    if ((url.protocol === "https:" || (!httpsOnly && url.protocol === "http:")) && !url.username && !url.password) {
      return url.href
    }
  } catch {
    // The same validation message also covers malformed URLs.
  }
  throw new InvalidAdminInput(httpsOnly ? "來源網址需為有效的 HTTPS 網址。" : "來源網址需為有效的 HTTP 或 HTTPS 網址。")
}

export function parseCaseSourceDate(value: string) {
  const parts = /^(\d{3,4})-(\d{2})-(\d{2})$/.exec(value)
  const formatError = "請填寫有效的發布日期，例如 115-11-12 或 2026-11-12。"
  if (!parts || Number(parts[1]) === 0) throw new InvalidAdminInput(formatError)

  const [, year, month, day] = parts
  const calendarDate = `${year.length === 3 ? Number(year) + 1911 : year}-${month}-${day}`
  const parsed = new Date(`${calendarDate}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== calendarDate) {
    throw new InvalidAdminInput(formatError)
  }
  return calendarDate
}

export function parseCaseSourceCity(value: string) {
  if (!/^[\p{Script=Han}]{2,4}[縣市]$/u.test(value)) {
    throw new InvalidAdminInput("請填寫發布縣市全名，例如臺北市。")
  }
  return value
}
