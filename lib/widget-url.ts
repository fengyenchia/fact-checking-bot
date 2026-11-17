import { getDomain } from "tldts";

export function parseWidgetUrl(value: string): URL | null {
  const raw = value.trim();
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  if (!/^https?:\/\/[^/?#]/i.test(candidate) || /[\s\\]/.test(raw)) return null;

  try {
    const url = new URL(candidate);
    const host = url.hostname.replace(/\.$/, "");
    if (url.username || url.password || host.split(".").some((label) => !label)) return null;

    // IP addresses (including 123 normalized by URL) have no main domain.
    return getDomain(host) ? url : null;
  } catch {
    return null;
  }
}
