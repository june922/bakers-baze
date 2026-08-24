import { z } from "zod";

const slugSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric, hyphen-separated");

// Restricted to http(s) — image URLs are rendered as <img src>/CSS url();
// disallowing other schemes (e.g. javascript:) is defense-in-depth even
// though those sinks don't execute script URIs in modern browsers.
const httpUrlSchema = z.string().url({ protocol: /^https?$/ });

export const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  slug: slugSchema,
  position: z.number().int().min(0).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createProductSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255),
  slug: slugSchema,
  description: z.string().max(5000).nullable().optional(),
  basePrice: z.number().int().min(0),
  prepTimeMinutes: z.number().int().min(0).nullable().optional(),
  orderingMode: z.enum(["instant", "request_confirm"]).optional(),
  status: z.enum(["draft", "published"]).optional(),
  imageUrls: z.array(httpUrlSchema).max(20).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const createOptionGroupSchema = z.object({
  name: z.string().min(1).max(255),
  selectionType: z.enum(["single", "multiple"]),
  required: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export const updateOptionGroupSchema = createOptionGroupSchema.partial();

export const createOptionValueSchema = z.object({
  label: z.string().min(1).max(255),
  priceDelta: z.number().int().optional(),
  available: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export const updateOptionValueSchema = createOptionValueSchema.partial();
