export type BakeryStatus = "trial" | "active" | "suspended" | "expired";

export interface Bakery {
  id: string;
  slug: string;
  status: BakeryStatus;
  templateKey: string | null;
  branding: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
