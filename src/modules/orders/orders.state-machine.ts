import type { Knex } from "knex";
import { ConflictError, NotFoundError } from "@/src/lib/errors";
import type { OrderActorType, OrderStatus } from "./orders.types";

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  requested: ["confirmed", "declined", "cancelled"],
  confirmed: ["awaiting_payment", "cancelled"],
  declined: [],
  awaiting_payment: ["partially_paid", "paid", "payment_failed", "cancelled"],
  partially_paid: ["paid", "preparing", "cancelled"],
  paid: ["preparing", "cancelled"],
  payment_failed: ["awaiting_payment", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

interface OrderStatusRow {
  id: string;
  tenant_id: string;
  status: string;
}

/**
 * Locks the order row (SELECT ... FOR UPDATE) inside the given transaction,
 * validates the transition against ALLOWED_TRANSITIONS, applies it, and
 * records it in order_status_history — all atomically, per ARCHITECTURE.md
 * §10, so a concurrent baker action and a future payment webhook can never
 * race into an invalid state.
 */
export async function transitionOrder(
  trx: Knex.Transaction,
  params: {
    tenantId: string;
    orderId: string;
    toStatus: OrderStatus;
    actorType: OrderActorType;
    actorUserId?: string | null;
    note?: string | null;
  }
): Promise<OrderStatus> {
  const order = await trx<OrderStatusRow>("orders")
    .where({ id: params.orderId, tenant_id: params.tenantId })
    .forUpdate()
    .first();

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  const fromStatus = order.status as OrderStatus;
  const allowed = ALLOWED_TRANSITIONS[fromStatus] ?? [];

  if (!allowed.includes(params.toStatus)) {
    throw new ConflictError(`Cannot transition order from "${fromStatus}" to "${params.toStatus}"`);
  }

  await trx("orders")
    .where({ id: params.orderId, tenant_id: params.tenantId })
    .update({ status: params.toStatus, updated_at: trx.fn.now() });

  await trx("order_status_history").insert({
    tenant_id: params.tenantId,
    order_id: params.orderId,
    from_status: fromStatus,
    to_status: params.toStatus,
    actor_type: params.actorType,
    actor_user_id: params.actorUserId ?? null,
    note: params.note ?? null,
  });

  return params.toStatus;
}

/**
 * Records the very first history row for a newly created order (no
 * from_status, no row lock needed — the row doesn't exist for anyone else yet).
 */
export async function recordInitialStatus(
  trx: Knex.Transaction,
  params: { tenantId: string; orderId: string; toStatus: OrderStatus; actorType: OrderActorType }
): Promise<void> {
  await trx("order_status_history").insert({
    tenant_id: params.tenantId,
    order_id: params.orderId,
    from_status: null,
    to_status: params.toStatus,
    actor_type: params.actorType,
    actor_user_id: null,
    note: null,
  });
}
