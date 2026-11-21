export type ConversationSession = {
  id: string;
  sentAt: number | null;
  dateKey: string;
};

// A test day follows Taiwan's calendar, independently of the device time zone.
export function conversationDateKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((value) => value.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function restoreConversationSession(
  raw: string | null,
  now: Date = new Date(),
): ConversationSession {
  const dateKey = conversationDateKey(now);
  try {
    const saved: unknown = raw ? JSON.parse(raw) : null;
    if (
      saved && typeof saved === "object" &&
      "id" in saved && typeof saved.id === "string" && saved.id.length > 0 &&
      "dateKey" in saved && saved.dateKey === dateKey &&
      "sentAt" in saved &&
      (saved.sentAt === null ||
        (typeof saved.sentAt === "number" && Number.isFinite(saved.sentAt) && saved.sentAt >= 0))
    ) {
      return { id: saved.id, sentAt: saved.sentAt, dateKey };
    }
  } catch {
    // Malformed or legacy storage must not carry progress into a new test day.
  }
  return { id: crypto.randomUUID(), sentAt: null, dateKey };
}
