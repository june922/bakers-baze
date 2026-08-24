import db from "@/src/lib/db";
import type { Role, Session, User } from "./auth.types";

interface UserRow {
  id: string;
  role: string;
  tenant_id: string | null;
  email: string;
  phone: string | null;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

interface SessionRow {
  id: string;
  user_id: string;
  tenant_id: string | null;
  expires_at: Date;
  user_agent: string | null;
  ip: string | null;
  created_at: Date;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    role: row.role as Role,
    tenantId: row.tenant_id,
    email: row.email,
    phone: row.phone,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    expiresAt: row.expires_at,
    userAgent: row.user_agent,
    ip: row.ip,
    createdAt: row.created_at,
  };
}

export const usersRepository = {
  async findByEmail(email: string): Promise<User | undefined> {
    const row = await db<UserRow>("users").where({ email: email.toLowerCase() }).first();
    return row ? toUser(row) : undefined;
  },

  async findById(id: string): Promise<User | undefined> {
    const row = await db<UserRow>("users").where({ id }).first();
    return row ? toUser(row) : undefined;
  },

  async findByIdForTenant(tenantId: string, id: string): Promise<User | undefined> {
    const row = await db<UserRow>("users").where({ id, tenant_id: tenantId }).first();
    return row ? toUser(row) : undefined;
  },

  async create(input: {
    role: Role;
    tenantId: string | null;
    email: string;
    phone?: string | null;
    passwordHash: string;
  }): Promise<User> {
    const [row] = await db<UserRow>("users")
      .insert({
        role: input.role,
        tenant_id: input.tenantId,
        email: input.email.toLowerCase(),
        phone: input.phone ?? null,
        password_hash: input.passwordHash,
      })
      .returning("*");
    return toUser(row);
  },
};

export const sessionsRepository = {
  async create(input: {
    id: string;
    userId: string;
    tenantId: string | null;
    expiresAt: Date;
    userAgent?: string | null;
    ip?: string | null;
  }): Promise<Session> {
    const [row] = await db<SessionRow>("sessions")
      .insert({
        id: input.id,
        user_id: input.userId,
        tenant_id: input.tenantId,
        expires_at: input.expiresAt,
        user_agent: input.userAgent ?? null,
        ip: input.ip ?? null,
      })
      .returning("*");
    return toSession(row);
  },

  async findById(id: string): Promise<Session | undefined> {
    const row = await db<SessionRow>("sessions").where({ id }).first();
    return row ? toSession(row) : undefined;
  },

  async findByIdForTenant(tenantId: string, id: string): Promise<Session | undefined> {
    const row = await db<SessionRow>("sessions").where({ id, tenant_id: tenantId }).first();
    return row ? toSession(row) : undefined;
  },

  async deleteById(id: string): Promise<void> {
    await db("sessions").where({ id }).delete();
  },

  async deleteAllForUser(userId: string): Promise<void> {
    await db("sessions").where({ user_id: userId }).delete();
  },
};
