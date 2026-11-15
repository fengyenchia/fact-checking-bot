function isDocumentUrl(href: string) {
  try {
    const { protocol } = new URL(href)
    return protocol === "https:" || protocol === "http:"
  } catch {
    return false
  }
}

export function DocumentLink({ href, children }: { href: string; children: string }) {
  if (!isDocumentUrl(href)) return <span>{children}</span>
  return (
    <a href={href} target="_blank" rel="noreferrer" className="break-all underline underline-offset-4">
      {children}
    </a>
  )
}
