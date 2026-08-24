import type { Knex } from "knex";
import db from "@/src/lib/db";
import type {
  FulfilmentMethod,
  Order,
  OrderActorType,
  OrderDetail,
  OrderItem,
  OrderItemCustomization,
  OrderStatus,
  OrderStatusHistoryEntry,
} from "./orders.types";

interface OrderRow {
  id: string;
  tenant_id: string;
  order_number: string;
  tracking_token_hash: string;
  status: string;
  fulfilment_method: string;
  requested_for: Date;
  delivery_address: string | null;
  customer_id: string;
  amount_due: number;
  amount_paid: number;
  created_at: Date;
  updated_at: Date;
}

interface OrderItemRow {
  id: string;
  tenant_id: string;
  order_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  quantity: number;
  unit_price_snapshot: number;
}

interface OrderItemCustomizationRow {
  id: string;
  tenant_id: string;
  order_item_id: string;
  option_group_name: string;
  option_value_label: string;
  price_delta: number;
}

interface OrderStatusHistoryRow {
  id: string;
  tenant_id: string;
  order_id: string;
  from_status: string | null;
  to_status: string;
  actor_type: string;
  actor_user_id: string | null;
  note: string | null;
  created_at: Date;
}

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    orderNumber: row.order_number,
    status: row.status as OrderStatus,
    fulfilmentMethod: row.fulfilment_method as FulfilmentMethod,
    requestedFor: row.requested_for,
    deliveryAddress: row.delivery_address,
    customerId: row.customer_id,
    amountDue: row.amount_due,
    amountPaid: row.amount_paid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toOrderItemCustomization(row: OrderItemCustomizationRow): OrderItemCustomization {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    orderItemId: row.order_item_id,
    optionGroupName: row.option_group_name,
    optionValueLabel: row.option_value_label,
    priceDelta: row.price_delta,
  };
}

function toOrderItem(row: OrderItemRow, customizations: OrderItemCustomization[]): OrderItem {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    orderId: row.order_id,
    productId: row.product_id,
    productNameSnapshot: row.product_name_snapshot,
    quantity: row.quantity,
    unitPriceSnapshot: row.unit_price_snapshot,
    customizations,
  };
}

function toHistoryEntry(row: OrderStatusHistoryRow): OrderStatusHistoryEntry {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    orderId: row.order_id,
    fromStatus: row.from_status as OrderStatus | null,
    toStatus: row.to_status as OrderStatus,
    actorType: row.actor_type as OrderActorType,
    actorUserId: row.actor_user_id,
    note: row.note,
    createdAt: row.created_at,
  };
}

async function hydrateOrderDetail(tenantId: string, row: OrderRow): Promise<OrderDetail> {
  const itemRows = await db<OrderItemRow>("order_items")
    .where({ tenant_id: tenantId, order_id: row.id })
    .orderBy("created_at", "asc");
  const itemIds = itemRows.map((item) => item.id);

  const customizationRows = itemIds.length
    ? await db<OrderItemCustomizationRow>("order_item_customizations")
        .where({ tenant_id: tenantId })
        .whereIn("order_item_id", itemIds)
    : [];

  const customizationsByItem = new Map<string, OrderItemCustomization[]>();
  for (const custRow of customizationRows) {
    const list = customizationsByItem.get(custRow.order_item_id) ?? [];
    list.push(toOrderItemCustomization(custRow));
    customizationsByItem.set(custRow.order_item_id, list);
  }

  const items = itemRows.map((item) => toOrderItem(item, customizationsByItem.get(item.id) ?? []));

  const historyRows = await db<OrderStatusHistoryRow>("order_status_history")
    .where({ tenant_id: tenantId, order_id: row.id })
    .orderBy("created_at", "asc");

  return { ...toOrder(row), items, history: historyRows.map(toHistoryEntry) };
}

export const ordersRepository = {
  async listForTenant(tenantId: string): Promise<Order[]> {
    const rows = await db<OrderRow>("orders").where({ tenant_id: tenantId }).orderBy("created_at", "desc");
    return rows.map(toOrder);
  },

  async findByIdForTenant(tenantId: string, id: string): Promise<Order | undefined> {
    const row = await db<OrderRow>("orders").where({ id, tenant_id: tenantId }).first();
    return row ? toOrder(row) : undefined;
  },

  async findDetailByIdForTenant(tenantId: string, id: string): Promise<OrderDetail | undefined> {
    const row = await db<OrderRow>("orders").where({ id, tenant_id: tenantId }).first();
    if (!row) return undefined;
    return hydrateOrderDetail(tenantId, row);
  },

  /**
   * Public tracking lookup — deliberately NOT tenant-scoped in the WHERE
   * clause: the hashed token alone is the authorization (§6), and a customer
   * visiting /track/[token] doesn't supply (or need to know) a tenant id.
   * The tenant is derived FROM the matched row, never trusted from the caller.
   */
  async findDetailByTrackingTokenHash(trackingTokenHash: string): Promise<OrderDetail | undefined> {
    const row = await db<OrderRow>("orders").where({ tracking_token_hash: trackingTokenHash }).first();
    if (!row) return undefined;
    return hydrateOrderDetail(row.tenant_id, row);
  },

  async createWithinTransaction(
    trx: Knex.Transaction,
    input: {
      tenantId: string;
      orderNumber: string;
      trackingTokenHash: string;
      status: OrderStatus;
      fulfilmentMethod: FulfilmentMethod;
      requestedFor: Date;
      deliveryAddress: string | null;
      customerId: string;
      amountDue: number;
    }
  ): Promise<Order> {
    const [row] = await trx<OrderRow>("orders")
      .insert({
        tenant_id: input.tenantId,
        order_number: input.orderNumber,
        tracking_token_hash: input.trackingTokenHash,
        status: input.status,
        fulfilment_method: input.fulfilmentMethod,
        requested_for: input.requestedFor,
        delivery_address: input.deliveryAddress,
        customer_id: input.customerId,
        amount_due: input.amountDue,
      })
      .returning("*");
    return toOrder(row);
  },
};

export const orderItemsRepository = {
  async createManyWithinTransaction(
    trx: Knex.Transaction,
    tenantId: string,
    orderId: string,
    items: Array<{
      productId: string;
      productNameSnapshot: string;
      quantity: number;
      unitPriceSnapshot: number;
      customizations: Array<{ optionGroupName: string; optionValueLabel: string; priceDelta: number }>;
    }>
  ): Promise<void> {
    for (const item of items) {
      const [itemRow] = await trx<OrderItemRow>("order_items")
        .insert({
          tenant_id: tenantId,
          order_id: orderId,
          product_id: item.productId,
          product_name_snapshot: item.productNameSnapshot,
          quantity: item.quantity,
          unit_price_snapshot: item.unitPriceSnapshot,
        })
        .returning("*");

      if (item.customizations.length > 0) {
        await trx("order_item_customizations").insert(
          item.customizations.map((customization) => ({
            tenant_id: tenantId,
            order_item_id: itemRow.id,
            option_group_name: customization.optionGroupName,
            option_value_label: customization.optionValueLabel,
            price_delta: customization.priceDelta,
          }))
        );
      }
    }
  },
};

export const tenantOrderCountersRepository = {
  /**
   * Atomically assigns the next per-tenant order number. The UPDATE (or the
   * INSERT it falls back to via ON CONFLICT) takes a row lock, so concurrent
   * checkouts for the same tenant serialize correctly with no gaps or dupes.
   */
  async assignNextOrderNumber(trx: Knex.Transaction, tenantId: string): Promise<number> {
    const result = await trx.raw(
      `
      INSERT INTO tenant_order_counters (tenant_id, next_number)
      VALUES (?, 2)
      ON CONFLICT (tenant_id)
      DO UPDATE SET next_number = tenant_order_counters.next_number + 1
      RETURNING next_number - 1 AS assigned_number
      `,
      [tenantId]
    );
    return result.rows[0].assigned_number as number;
  },
};
