import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { sessionsRepository, usersRepository } from "@/src/modules/auth/auth.repository";
import type { AuthenticatedUser } from "@/src/modules/auth/auth.types";

export const SESSION_COOKIE_NAME = "session_id";
export const CSRF_COOKIE_NAME = "csrf_token";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(input: {
  userId: string;
  tenantId: string | null;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<{ rawToken: string; csrfToken: string; expiresAt: Date }> {
  const rawToken = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await sessionsRepository.create({
    id: hashToken(rawToken),
    userId: input.userId,
    tenantId: input.tenantId,
    expiresAt,
    userAgent: input.userAgent,
    ip: input.ip,
  });

  return { rawToken, csrfToken: generateToken(), expiresAt };
}

export async function setSessionCookies(rawToken: string, csrfToken: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";

  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  cookieStore.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(CSRF_COOKIE_NAME);
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | undefined> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return undefined;

  const session = await sessionsRepository.findById(hashToken(rawToken));
  if (!session || session.expiresAt.getTime() < Date.now()) return undefined;

  const user = await usersRepository.findById(session.userId);
  if (!user) return undefined;

  return { userId: user.id, tenantId: user.tenantId, role: user.role, email: user.email };
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (rawToken) {
    await sessionsRepository.deleteById(hashToken(rawToken));
  }
  await clearSessionCookies();
}
