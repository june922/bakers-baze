import { z } from "zod";

// Restricted to http(s) — rendered as <img src>/CSS url(); disallowing other
// schemes (e.g. javascript:) is defense-in-depth for these baker-supplied URLs.
const httpUrlSchema = z.string().url({ protocol: /^https?$/ });

export const updateStorefrontSettingsSchema = z.object({
  templateKey: z.string().min(1).max(100).optional(),
  displayName: z.string().min(1).max(255).optional(),
  tagline: z.string().max(255).nullable().optional(),
  aboutText: z.string().max(5000).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  address: z.string().max(1000).nullable().optional(),
  heroImageUrl: httpUrlSchema.nullable().optional(),
  logoUrl: httpUrlSchema.nullable().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #8a5a3b")
    .nullable()
    .optional(),
  branding: z.record(z.string(), z.unknown()).optional(),
  social: z.record(z.string(), z.unknown()).optional(),
});
