import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { ForbiddenError, RateLimitError, UnauthorizedError } from "@/src/lib/errors";
import { checkRateLimit } from "@/src/lib/rate-limit";
import {
  createSession,
  destroyCurrentSession,
  getAuthenticatedUser,
  setSessionCookies,
} from "@/src/lib/session";
import { usersRepository } from "./auth.repository";
import type { AuthenticatedUser, Role } from "./auth.types";

const PASSWORD_HASH_ROUNDS = 12;

// Two independent buckets: per-IP (stops one source hammering many accounts)
// and per-email (stops a distributed attack on one account). Both must pass.
const LOGIN_RATE_LIMIT = { limit: 5, windowMs: 60_000 };

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, PASSWORD_HASH_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Comparing against a real bcrypt hash when no user is found keeps the login
// response time consistent whether or not the account exists — otherwise
// skipping bcrypt.compare() on a miss creates a timing side-channel an
// attacker could use to enumerate registered emails. Generated lazily once
// (not hardcoded) so it's guaranteed to be a valid hash at the real cost factor.
let dummyPasswordHash: Promise<string> | null = null;
function getDummyPasswordHash(): Promise<string> {
  if (!dummyPasswordHash) {
    dummyPasswordHash = bcrypt.hash(randomUUID(), PASSWORD_HASH_ROUNDS);
  }
  return dummyPasswordHash;
}

async function enforceLoginRateLimit(scope: Role, email: string, ip: string | null): Promise<void> {
  const emailResult = await checkRateLimit({
    key: `login:${scope}:email:${email.toLowerCase()}`,
    ...LOGIN_RATE_LIMIT,
  });
  if (!emailResult.allowed) {
    throw new RateLimitError(emailResult.retryAfterMs, "Too many login attempts for this account. Try again later.");
  }

  if (ip) {
    const ipResult = await checkRateLimit({ key: `login:${scope}:ip:${ip}`, ...LOGIN_RATE_LIMIT });
    if (!ipResult.allowed) {
      throw new RateLimitError(ipResult.retryAfterMs, "Too many login attempts. Try again later.");
    }
  }
}

export interface RequestContext {
  userAgent: string | null;
  ip: string | null;
}

async function loginWithRole(
  email: string,
  password: string,
  expectedRole: Role,
  requestContext: RequestContext
): Promise<AuthenticatedUser> {
  await enforceLoginRateLimit(expectedRole, email, requestContext.ip);

  const user = await usersRepository.findByEmail(email);
  const validPassword = await verifyPassword(password, user?.passwordHash ?? (await getDummyPasswordHash()));

  if (!user || user.role !== expectedRole || !validPassword) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const { rawToken, csrfToken, expiresAt } = await createSession({
    userId: user.id,
    tenantId: user.tenantId,
    userAgent: requestContext.userAgent,
    ip: requestContext.ip,
  });
  await setSessionCookies(rawToken, csrfToken, expiresAt);

  return { userId: user.id, tenantId: user.tenantId, role: user.role, email: user.email };
}

export async function loginBaker(
  email: string,
  password: string,
  requestContext: RequestContext
): Promise<AuthenticatedUser> {
  return loginWithRole(email, password, "baker", requestContext);
}

export async function loginAdmin(
  email: string,
  password: string,
  requestContext: RequestContext
): Promise<AuthenticatedUser> {
  return loginWithRole(email, password, "platform_admin", requestContext);
}

export async function logout(): Promise<void> {
  await destroyCurrentSession();
}

export async function requireBaker(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new UnauthorizedError("Not authenticated");
  }
  if (user.role !== "baker" || !user.tenantId) {
    throw new ForbiddenError("Baker access required");
  }
  return user;
}

export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new UnauthorizedError("Not authenticated");
  }
  if (user.role !== "platform_admin") {
    throw new ForbiddenError("Admin access required");
  }
  return user;
}
