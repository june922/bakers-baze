import db from "@/src/lib/db";
import { ConflictError, NotFoundError, ValidationError } from "@/src/lib/errors";
import type { TenantContext } from "@/src/lib/tenant-context";
import { customersRepository } from "@/src/modules/customers/customers.repository";
import { productsRepository } from "@/src/modules/products/products.repository";
import type { ProductDetail } from "@/src/modules/products/products.types";
import { orderItemsRepository, ordersRepository, tenantOrderCountersRepository } from "./orders.repository";
import { recordInitialStatus, transitionOrder } from "./orders.state-machine";
import { generateTrackingToken, hashTrackingToken } from "./tracking-token";
import type { CartItemInput, CheckoutInput, CheckoutResult, Order, OrderDetail, OrderStatus } from "./orders.types";

interface ValidatedItem {
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitPriceSnapshot: number;
  orderingMode: ProductDetail["orderingMode"];
  customizations: Array<{ optionGroupName: string; optionValueLabel: string; priceDelta: number }>;
  lineTotal: number;
}

async function validateAndSnapshotItem(tenantId: string, item: CartItemInput): Promise<ValidatedItem> {
  const product = await productsRepository.findDetailByIdForTenant(tenantId, item.productId);

  if (!product || product.status !== "published") {
    throw new ConflictError("One or more items in your cart are no longer available");
  }

  const customizations: ValidatedItem["customizations"] = [];
  let deltaTotal = 0;

  for (const group of product.optionGroups) {
    const selectedForGroup = item.selectedOptions.filter((s) => s.optionGroupId === group.id);

    if (group.required && selectedForGroup.length === 0) {
      throw new ConflictError(`"${group.name}" is required for ${product.name}`);
    }
    if (group.selectionType === "single" && selectedForGroup.length > 1) {
      throw new ConflictError(`Only one selection is allowed for "${group.name}"`);
    }

    for (const selected of selectedForGroup) {
      const value = group.values.find((v) => v.id === selected.optionValueId);
      if (!value || !value.available) {
        throw new ConflictError(`A selected option for "${group.name}" is no longer available`);
      }
      customizations.push({ optionGroupName: group.name, optionValueLabel: value.label, priceDelta: value.priceDelta });
      deltaTotal += value.priceDelta;
    }
  }

  const recognizedGroupIds = new Set(product.optionGroups.map((g) => g.id));
  if (item.selectedOptions.some((s) => !recognizedGroupIds.has(s.optionGroupId))) {
    throw new ConflictError(`Invalid option selection for ${product.name}`);
  }

  return {
    productId: product.id,
    productNameSnapshot: product.name,
    quantity: item.quantity,
    unitPriceSnapshot: product.basePrice,
    orderingMode: product.orderingMode,
    customizations,
    lineTotal: (product.basePrice + deltaTotal) * item.quantity,
  };
}

function formatOrderNumber(sequence: number): string {
  return `ORD-${String(sequence).padStart(4, "0")}`;
}

export const ordersService = {
  /**
   * Public checkout — tenantId is resolved server-side from the bakery slug
   * by the caller (never trusted from the request body). Every product and
   * option reference is re-validated against live tenant data here; nothing
   * from the client cart is trusted beyond ids and quantities.
   */
  async checkout(tenantId: string, input: CheckoutInput): Promise<CheckoutResult> {
    if (input.requestedFor.getTime() < Date.now()) {
      throw new ValidationError("requestedFor must be in the future");
    }

    const validatedItems = await Promise.all(input.items.map((item) => validateAndSnapshotItem(tenantId, item)));
    const isInstant = validatedItems.every((item) => item.orderingMode === "instant");
    const amountDue = validatedItems.reduce((sum, item) => sum + item.lineTotal, 0);

    const rawTrackingToken = generateTrackingToken();
    const trackingTokenHash = hashTrackingToken(rawTrackingToken);

    const result = await db.transaction(async (trx) => {
      const customer = await customersRepository.upsertForTenant(trx, tenantId, {
        name: input.customerName,
        phone: input.customerPhone,
        email: input.customerEmail ?? null,
      });

      const sequence = await tenantOrderCountersRepository.assignNextOrderNumber(trx, tenantId);
      const orderNumber = formatOrderNumber(sequence);
      const initialStatus: OrderStatus = isInstant ? "confirmed" : "requested";

      const order = await ordersRepository.createWithinTransaction(trx, {
        tenantId,
        orderNumber,
        trackingTokenHash,
        status: initialStatus,
        fulfilmentMethod: input.fulfilmentMethod,
        requestedFor: input.requestedFor,
        deliveryAddress: input.fulfilmentMethod === "delivery" ? input.deliveryAddress ?? null : null,
        customerId: customer.id,
        amountDue,
      });

      await recordInitialStatus(trx, { tenantId, orderId: order.id, toStatus: initialStatus, actorType: "system" });

      let finalStatus: OrderStatus = initialStatus;
      if (isInstant) {
        finalStatus = await transitionOrder(trx, {
          tenantId,
          orderId: order.id,
          toStatus: "awaiting_payment",
          actorType: "system",
        });
      }

      await orderItemsRepository.createManyWithinTransaction(trx, tenantId, order.id, validatedItems);

      return { orderId: order.id, orderNumber, status: finalStatus };
    });

    return { ...result, trackingToken: rawTrackingToken };
  },

  async getByTrackingToken(rawToken: string): Promise<OrderDetail | undefined> {
    return ordersRepository.findDetailByTrackingTokenHash(hashTrackingToken(rawToken));
  },

  async listOrders(ctx: TenantContext): Promise<Order[]> {
    return ordersRepository.listForTenant(ctx.tenantId);
  },

  async getOrder(ctx: TenantContext, orderId: string): Promise<OrderDetail> {
    const order = await ordersRepository.findDetailByIdForTenant(ctx.tenantId, orderId);
    if (!order) throw new NotFoundError("Order not found");
    return order;
  },

  async confirmOrder(ctx: TenantContext, orderId: string): Promise<Order> {
    // Confirming a request-confirm order immediately moves it on to
    // awaiting_payment too, in the same transaction — there's no separate
    // "wait for payment eligibility" step once a baker confirms.
    await db.transaction(async (trx) => {
      await transitionOrder(trx, {
        tenantId: ctx.tenantId,
        orderId,
        toStatus: "confirmed",
        actorType: "baker",
        actorUserId: ctx.userId,
      });
      await transitionOrder(trx, {
        tenantId: ctx.tenantId,
        orderId,
        toStatus: "awaiting_payment",
        actorType: "system",
      });
    });

    const order = await ordersRepository.findByIdForTenant(ctx.tenantId, orderId);
    if (!order) throw new NotFoundError("Order not found");
    return order;
  },

  async declineOrder(ctx: TenantContext, orderId: string, note: string | null): Promise<Order> {
    await db.transaction((trx) =>
      transitionOrder(trx, {
        tenantId: ctx.tenantId,
        orderId,
        toStatus: "declined",
        actorType: "baker",
        actorUserId: ctx.userId,
        note,
      })
    );
    const order = await ordersRepository.findByIdForTenant(ctx.tenantId, orderId);
    if (!order) throw new NotFoundError("Order not found");
    return order;
  },

  async cancelOrder(ctx: TenantContext, orderId: string, note: string | null): Promise<Order> {
    await db.transaction((trx) =>
      transitionOrder(trx, {
        tenantId: ctx.tenantId,
        orderId,
        toStatus: "cancelled",
        actorType: "baker",
        actorUserId: ctx.userId,
        note,
      })
    );
    const order = await ordersRepository.findByIdForTenant(ctx.tenantId, orderId);
    if (!order) throw new NotFoundError("Order not found");
    return order;
  },
};
