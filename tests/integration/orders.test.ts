import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import db from "@/src/lib/db";
import { ConflictError, NotFoundError, ValidationError } from "@/src/lib/errors";
import type { TenantContext } from "@/src/lib/tenant-context";
import { productsService } from "@/src/modules/products/products.service";
import { tenantsRepository } from "@/src/modules/tenants/tenants.repository";
import { ordersRepository } from "@/src/modules/orders/orders.repository";
import { ordersService } from "@/src/modules/orders/orders.service";
import { hashTrackingToken } from "@/src/modules/orders/tracking-token";
import type { CheckoutInput } from "@/src/modules/orders/orders.types";

async function cleanUp(): Promise<void> {
  await db("order_status_history").del();
  await db("order_item_customizations").del();
  await db("order_items").del();
  await db("orders").del();
  await db("tenant_order_counters").del();
  await db("customers").del();
  await db("product_option_values").del();
  await db("product_option_groups").del();
  await db("product_images").del();
  await db("products").del();
  await db("categories").del();
  await db("bakeries").del();
}

async function seedTenant(): Promise<{ tenantId: string; ctx: TenantContext }> {
  const bakery = await tenantsRepository.create({ slug: `bakery-${randomUUID()}` });
  return { tenantId: bakery.id, ctx: { tenantId: bakery.id, userId: randomUUID(), role: "baker" } };
}

async function seedInstantProduct(ctx: TenantContext, overrides: { basePrice?: number } = {}) {
  return productsService.createProduct(ctx, {
    name: "Vanilla Cake",
    slug: `vanilla-cake-${randomUUID()}`,
    basePrice: overrides.basePrice ?? 200000,
    status: "published",
    orderingMode: "instant",
  });
}

async function seedRequestConfirmProductWithOptions(ctx: TenantContext) {
  const product = await productsService.createProduct(ctx, {
    name: "Custom Cake",
    slug: `custom-cake-${randomUUID()}`,
    basePrice: 300000,
    status: "published",
    orderingMode: "request_confirm",
  });
  const group = await productsService.createOptionGroup(ctx, product.id, {
    name: "Size",
    selectionType: "single",
    required: true,
  });
  const valueSmall = await productsService.createOptionValue(ctx, group.id, { label: "Small", priceDelta: 0 });
  const valueLarge = await productsService.createOptionValue(ctx, group.id, { label: "Large", priceDelta: 50000 });
  return { product, group, valueSmall, valueLarge };
}

function baseCheckoutInput(overrides: Partial<CheckoutInput> = {}): Omit<CheckoutInput, "items"> {
  return {
    customerName: "Jane Doe",
    customerPhone: "+254712345678",
    customerEmail: null,
    fulfilmentMethod: "pickup",
    requestedFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
    deliveryAddress: null,
    ...overrides,
  };
}

describe("orders — checkout, state machine, tenant isolation", () => {
  beforeAll(cleanUp);
  afterEach(cleanUp);
  afterAll(async () => {
    await db.destroy();
  });

  it("instant-mode checkout lands the order at awaiting_payment with two history entries", async () => {
    const { ctx, tenantId } = await seedTenant();
    const product = await seedInstantProduct(ctx);

    const result = await ordersService.checkout(tenantId, {
      ...baseCheckoutInput(),
      items: [{ productId: product.id, quantity: 2, selectedOptions: [] }],
    });

    expect(result.status).toBe("awaiting_payment");
    expect(result.orderNumber).toMatch(/^ORD-\d{4}$/);

    const detail = await ordersService.getOrder(ctx, result.orderId);
    expect(detail.history.map((h) => h.toStatus)).toEqual(["confirmed", "awaiting_payment"]);
    expect(detail.amountDue).toBe(400000);
  });

  it("request_confirm checkout lands the order at requested with one history entry", async () => {
    const { ctx, tenantId } = await seedTenant();
    const { product, group, valueLarge } = await seedRequestConfirmProductWithOptions(ctx);

    const result = await ordersService.checkout(tenantId, {
      ...baseCheckoutInput(),
      items: [
        {
          productId: product.id,
          quantity: 1,
          selectedOptions: [{ optionGroupId: group.id, optionValueId: valueLarge.id }],
        },
      ],
    });

    expect(result.status).toBe("requested");

    const detail = await ordersService.getOrder(ctx, result.orderId);
    expect(detail.history.map((h) => h.toStatus)).toEqual(["requested"]);
    expect(detail.amountDue).toBe(350000);
    expect(detail.items[0].customizations[0]).toMatchObject({ optionValueLabel: "Large", priceDelta: 50000 });
  });

  it("a mixed cart with any request-confirm item follows the request-confirm flow", async () => {
    const { ctx, tenantId } = await seedTenant();
    const instant = await seedInstantProduct(ctx);
    const { product: requestConfirmProduct } = await seedRequestConfirmProductWithOptions(ctx);

    const result = await ordersService.checkout(tenantId, {
      ...baseCheckoutInput(),
      items: [
        { productId: instant.id, quantity: 1, selectedOptions: [] },
        { productId: requestConfirmProduct.id, quantity: 1, selectedOptions: [{ optionGroupId: (await productsService.getProduct(ctx, requestConfirmProduct.id)).optionGroups[0].id, optionValueId: (await productsService.getProduct(ctx, requestConfirmProduct.id)).optionGroups[0].values[0].id }] },
      ],
    });

    expect(result.status).toBe("requested");
  });

  it("rejects checkout for a draft (unpublished) product", async () => {
    const { ctx, tenantId } = await seedTenant();
    const draft = await productsService.createProduct(ctx, {
      name: "Draft Cake",
      slug: `draft-cake-${randomUUID()}`,
      basePrice: 100000,
      status: "draft",
    });

    await expect(
      ordersService.checkout(tenantId, {
        ...baseCheckoutInput(),
        items: [{ productId: draft.id, quantity: 1, selectedOptions: [] }],
      })
    ).rejects.toThrow(ConflictError);
  });

  it("rejects checkout when a required option group has no selection", async () => {
    const { ctx, tenantId } = await seedTenant();
    const { product } = await seedRequestConfirmProductWithOptions(ctx);

    await expect(
      ordersService.checkout(tenantId, {
        ...baseCheckoutInput(),
        items: [{ productId: product.id, quantity: 1, selectedOptions: [] }],
      })
    ).rejects.toThrow(ConflictError);
  });

  it("rejects checkout when a selected option value is unavailable", async () => {
    const { ctx, tenantId } = await seedTenant();
    const { product, group, valueLarge } = await seedRequestConfirmProductWithOptions(ctx);
    await productsService.updateOptionValue(ctx, valueLarge.id, { available: false });

    await expect(
      ordersService.checkout(tenantId, {
        ...baseCheckoutInput(),
        items: [
          {
            productId: product.id,
            quantity: 1,
            selectedOptions: [{ optionGroupId: group.id, optionValueId: valueLarge.id }],
          },
        ],
      })
    ).rejects.toThrow(ConflictError);
  });

  it("rejects checkout with a requestedFor date in the past", async () => {
    const { ctx, tenantId } = await seedTenant();
    const product = await seedInstantProduct(ctx);

    await expect(
      ordersService.checkout(tenantId, {
        ...baseCheckoutInput({ requestedFor: new Date(Date.now() - 60_000) }),
        items: [{ productId: product.id, quantity: 1, selectedOptions: [] }],
      })
    ).rejects.toThrow(ValidationError);
  });

  it("never trusts a client-supplied product from a different tenant", async () => {
    const { tenantId: tenantAId } = await seedTenant();
    const { ctx: ctxB } = await seedTenant();
    const productB = await seedInstantProduct(ctxB);

    await expect(
      ordersService.checkout(tenantAId, {
        ...baseCheckoutInput(),
        items: [{ productId: productB.id, quantity: 1, selectedOptions: [] }],
      })
    ).rejects.toThrow(ConflictError);
  });

  it("upserts the same customer by phone across repeat orders instead of duplicating", async () => {
    const { ctx, tenantId } = await seedTenant();
    const product = await seedInstantProduct(ctx);
    const phone = "+254700111222";

    const first = await ordersService.checkout(tenantId, {
      ...baseCheckoutInput({ customerPhone: phone, customerName: "Jane" }),
      items: [{ productId: product.id, quantity: 1, selectedOptions: [] }],
    });
    const second = await ordersService.checkout(tenantId, {
      ...baseCheckoutInput({ customerPhone: phone, customerName: "Jane Updated" }),
      items: [{ productId: product.id, quantity: 1, selectedOptions: [] }],
    });

    const orderA = await ordersService.getOrder(ctx, first.orderId);
    const orderB = await ordersService.getOrder(ctx, second.orderId);
    expect(orderA.customerId).toBe(orderB.customerId);

    const customers = await db("customers").where({ tenant_id: tenantId, phone });
    expect(customers).toHaveLength(1);
    expect(customers[0].name).toBe("Jane Updated");
  });

  it("assigns sequential per-tenant order numbers, isolated from other tenants", async () => {
    const { ctx: ctxA, tenantId: tenantAId } = await seedTenant();
    const { ctx: ctxB, tenantId: tenantBId } = await seedTenant();
    const productA = await seedInstantProduct(ctxA);
    const productB = await seedInstantProduct(ctxB);

    const a1 = await ordersService.checkout(tenantAId, {
      ...baseCheckoutInput(),
      items: [{ productId: productA.id, quantity: 1, selectedOptions: [] }],
    });
    const b1 = await ordersService.checkout(tenantBId, {
      ...baseCheckoutInput(),
      items: [{ productId: productB.id, quantity: 1, selectedOptions: [] }],
    });
    const a2 = await ordersService.checkout(tenantAId, {
      ...baseCheckoutInput(),
      items: [{ productId: productA.id, quantity: 1, selectedOptions: [] }],
    });

    expect(a1.orderNumber).toBe("ORD-0001");
    expect(a2.orderNumber).toBe("ORD-0002");
    expect(b1.orderNumber).toBe("ORD-0001");
  });

  it("stores only the tracking token hash, and the raw token correctly resolves the order", async () => {
    const { ctx, tenantId } = await seedTenant();
    const product = await seedInstantProduct(ctx);

    const result = await ordersService.checkout(tenantId, {
      ...baseCheckoutInput(),
      items: [{ productId: product.id, quantity: 1, selectedOptions: [] }],
    });

    const row = await db("orders").where({ id: result.orderId }).first();
    expect(row.tracking_token_hash).toBe(hashTrackingToken(result.trackingToken));
    expect(row.tracking_token_hash).not.toBe(result.trackingToken);

    const foundByToken = await ordersService.getByTrackingToken(result.trackingToken);
    expect(foundByToken?.id).toBe(result.orderId);

    const foundByWrongToken = await ordersService.getByTrackingToken("0".repeat(64));
    expect(foundByWrongToken).toBeUndefined();
  });

  it("enforces the confirm → decline flow via the transition map and records notes in history", async () => {
    const { ctx, tenantId } = await seedTenant();
    const { product, group, valueSmall } = await seedRequestConfirmProductWithOptions(ctx);

    const result = await ordersService.checkout(tenantId, {
      ...baseCheckoutInput(),
      items: [{ productId: product.id, quantity: 1, selectedOptions: [{ optionGroupId: group.id, optionValueId: valueSmall.id }] }],
    });

    const declined = await ordersService.declineOrder(ctx, result.orderId, "Out of stock");
    expect(declined.status).toBe("declined");

    const detail = await ordersService.getOrder(ctx, result.orderId);
    const declineEntry = detail.history.find((h) => h.toStatus === "declined");
    expect(declineEntry?.note).toBe("Out of stock");
    expect(declineEntry?.actorType).toBe("baker");
  });

  it("rejects an illegal transition (declining an already-declined order)", async () => {
    const { ctx, tenantId } = await seedTenant();
    const { product, group, valueSmall } = await seedRequestConfirmProductWithOptions(ctx);
    const result = await ordersService.checkout(tenantId, {
      ...baseCheckoutInput(),
      items: [{ productId: product.id, quantity: 1, selectedOptions: [{ optionGroupId: group.id, optionValueId: valueSmall.id }] }],
    });

    await ordersService.declineOrder(ctx, result.orderId, null);
    await expect(ordersService.declineOrder(ctx, result.orderId, null)).rejects.toThrow(ConflictError);
  });

  it("allows cancelling from awaiting_payment but not once declined", async () => {
    const { ctx, tenantId } = await seedTenant();
    const product = await seedInstantProduct(ctx);
    const result = await ordersService.checkout(tenantId, {
      ...baseCheckoutInput(),
      items: [{ productId: product.id, quantity: 1, selectedOptions: [] }],
    });

    const cancelled = await ordersService.cancelOrder(ctx, result.orderId, "Customer request");
    expect(cancelled.status).toBe("cancelled");
    await expect(ordersService.cancelOrder(ctx, result.orderId, null)).rejects.toThrow(ConflictError);
  });

  it("prevents one tenant from viewing or acting on another tenant's order", async () => {
    const { ctx: ctxA, tenantId: tenantAId } = await seedTenant();
    const { ctx: ctxB } = await seedTenant();
    const productA = await seedInstantProduct(ctxA);

    const result = await ordersService.checkout(tenantAId, {
      ...baseCheckoutInput(),
      items: [{ productId: productA.id, quantity: 1, selectedOptions: [] }],
    });

    await expect(ordersService.getOrder(ctxB, result.orderId)).rejects.toThrow(NotFoundError);
    await expect(ordersService.confirmOrder(ctxB, result.orderId)).rejects.toThrow(NotFoundError);
    await expect(ordersService.cancelOrder(ctxB, result.orderId, null)).rejects.toThrow(NotFoundError);

    await expect(ordersRepository.findByIdForTenant(ctxB.tenantId, result.orderId)).resolves.toBeUndefined();
  });

  it("only lists a tenant's own orders", async () => {
    const { ctx: ctxA, tenantId: tenantAId } = await seedTenant();
    const { ctx: ctxB, tenantId: tenantBId } = await seedTenant();
    const productA = await seedInstantProduct(ctxA);
    const productB = await seedInstantProduct(ctxB);

    await ordersService.checkout(tenantAId, {
      ...baseCheckoutInput(),
      items: [{ productId: productA.id, quantity: 1, selectedOptions: [] }],
    });
    await ordersService.checkout(tenantBId, {
      ...baseCheckoutInput(),
      items: [{ productId: productB.id, quantity: 1, selectedOptions: [] }],
    });

    const ordersA = await ordersService.listOrders(ctxA);
    const ordersB = await ordersService.listOrders(ctxB);
    expect(ordersA).toHaveLength(1);
    expect(ordersB).toHaveLength(1);
    expect(ordersA[0].id).not.toBe(ordersB[0].id);
  });
});
