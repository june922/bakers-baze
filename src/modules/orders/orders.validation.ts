import { z } from "zod";

const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
  selectedOptions: z
    .array(
      z.object({
        optionGroupId: z.string().uuid(),
        optionValueId: z.string().uuid(),
      })
    )
    .max(50),
});

export const checkoutSchema = z
  .object({
    items: z.array(cartItemSchema).min(1).max(50),
    customerName: z.string().min(1).max(255),
    customerPhone: z
      .string()
      .min(7)
      .max(20)
      .regex(/^[+0-9][0-9\s-]{6,19}$/, "Enter a valid phone number"),
    customerEmail: z.string().email().nullable().optional(),
    fulfilmentMethod: z.enum(["pickup", "delivery"]),
    requestedFor: z.coerce.date(),
    deliveryAddress: z.string().min(1).max(1000).nullable().optional(),
  })
  .refine((data) => data.fulfilmentMethod !== "delivery" || !!data.deliveryAddress, {
    message: "deliveryAddress is required when fulfilmentMethod is delivery",
    path: ["deliveryAddress"],
  });

export const declineOrderSchema = z.object({
  note: z.string().max(1000).nullable().optional(),
});

export const cancelOrderSchema = z.object({
  note: z.string().max(1000).nullable().optional(),
});
