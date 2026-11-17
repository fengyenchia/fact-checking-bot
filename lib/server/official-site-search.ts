import "server-only";

import { parseWidgetUrl } from "@/lib/widget-url";
import { hasOpenAi, searchOfficialSiteSources } from "./openai";

function getListing(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return null;

    if (
      url.hostname === "apps.apple.com" &&
      /^\/[a-z]{2}\/app\/(?:[^/]+\/)?id\d+\/?$/i.test(url.pathname)
    ) {
      url.search = "";
      url.hash = "";
      return { url, label: "App Store" };
    }
    if (
      url.hostname === "play.google.com" &&
      url.pathname === "/store/apps/details"
    ) {
      const appId = url.searchParams.get("id");
      if (!appId || !/^[\w]+(?:\.[\w]+)+$/.test(appId)) return null;
      url.search = new URLSearchParams({ id: appId, hl: "en" }).toString();
      url.hash = "";
      return { url, label: "Google Play" };
    }
  } catch {
    return null;
  }
  return null;
}

async function verifyDeveloperWebsite(
  listing: NonNullable<ReturnType<typeof getListing>>,
  host: string,
) {
  try {
    const options: RequestInit = {
      redirect: "manual",
      cache: "no-store",
      headers: { "Accept-Language": "en, zh-TW;q=0.9" },
      signal: AbortSignal.timeout(4_000),
    };
    let response = await fetch(listing.url, options);
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      const redirect = getListing(new URL(location, listing.url).href);
      if (!redirect || redirect.url.origin !== listing.url.origin) return false;
      response = await fetch(redirect.url, options);
    }
    if (
      !response.ok ||
      !response.headers.get("content-type")?.includes("text/html")
    )
      return false;

    const html = (await response.text()).replace(
      /<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,
      "",
    );
    const label =
      listing.label === "App Store"
        ? /^(?:Developer Website|開發者網站)(?:\s|$)/i
        : /^(?:public\s+)?Website$/i;

    for (const [, href, contents] of html.matchAll(
      /<a\b[^>]*\s+href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a\s*>/gi,
    )) {
      if (
        !label.test(
          contents
            .replace(/<[^>]+>|&nbsp;|&#160;/g, " ")
            .replace(/\s+/g, " ")
            .trim(),
        )
      )
        continue;
      if (!href.startsWith("https://")) continue;
      let target = parseWidgetUrl(href.replace(/&amp;/g, "&"));
      if (
        listing.label === "Google Play" &&
        target?.hostname === "www.google.com" &&
        target.pathname === "/url"
      ) {
        const destination =
          target.searchParams.get("q") ?? target.searchParams.get("url");
        target = destination?.startsWith("https://")
          ? parseWidgetUrl(destination)
          : null;
      }
      if (
        target?.protocol === "https:" &&
        !target.port &&
        target.hostname.replace(/\.$/, "") === host
      )
        return true;
    }
  } catch {
    return false;
  }
  return false;
}

export async function findOfficialSiteEvidence(host: string) {
  if (!hasOpenAi()) return null;

  try {
    const sources = await searchOfficialSiteSources(host);
    const listings = sources
      .map(getListing)
      .filter((listing) => listing !== null)
      .slice(0, 4);
    const matches = await Promise.all(
      listings.map((listing) => verifyDeveloperWebsite(listing, host)),
    );
    const listing = listings[matches.indexOf(true)];
    return listing
      ? { sourceUrl: listing.url.href, sourceName: listing.label }
      : null;
  } catch {
    return null;
  }
}
