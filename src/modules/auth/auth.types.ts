export type Role = "platform_admin" | "baker";

export interface User {
  id: string;
  role: Role;
  tenantId: string | null;
  email: string;
  phone: string | null;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  tenantId: string | null;
  expiresAt: Date;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
}

export interface AuthenticatedUser {
  userId: string;
  tenantId: string | null;
  role: Role;
  email: string;
}
