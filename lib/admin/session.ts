import "server-only"

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { connection } from "next/server"

const cookieName = "fact_check_admin"
const sessionLifetime = 60 * 60 * 8
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/admin",
} as const

function settings() {
  const password = process.env.ADMIN_PASSWORD
  const secret = process.env.ADMIN_SESSION_SECRET
  return password && secret && secret.length >= 32 ? { password, secret } : null
}

function digest(value: string) {
  return createHash("sha256").update(value).digest()
}

function sign(payload: string, config: NonNullable<ReturnType<typeof settings>>) {
  return createHmac("sha256", config.secret)
    .update(digest(config.password))
    .update(payload)
    .digest("base64url")
}

export function isAdminConfigured() {
  return settings() !== null
}

export async function isAdmin() {
  await connection()
  const config = settings()
  const token = (await cookies()).get(cookieName)?.value
  if (!config || !token) return false

  const [expires, nonce, signature, extra] = token.split(".")
  if (!expires || !nonce || !signature || extra !== undefined) return false

  const expiresAt = Number(expires)
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return false

  return timingSafeEqual(digest(signature), digest(sign(`${expires}.${nonce}`, config)))
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login")
}

export async function startAdminSession(password: string) {
  const config = settings()
  if (!config || !timingSafeEqual(digest(password), digest(config.password))) {
    return false
  }

  const expires = Date.now() + sessionLifetime * 1000
  const payload = `${expires}.${randomBytes(16).toString("base64url")}`
  const token = `${payload}.${sign(payload, config)}`
  const jar = await cookies()
  jar.set(cookieName, token, { ...cookieOptions, maxAge: sessionLifetime })
  return true
}

export async function endAdminSession() {
  const jar = await cookies()
  jar.set(cookieName, "", { ...cookieOptions, maxAge: 0 })
}
