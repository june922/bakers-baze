export type OrderStatus =
  | "requested"
  | "confirmed"
  | "declined"
  | "awaiting_payment"
  | "partially_paid"
  | "paid"
  | "payment_failed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type FulfilmentMethod = "pickup" | "delivery";
export type OrderActorType = "system" | "baker" | "webhook";

export interface Order {
  id: string;
  tenantId: string;
  orderNumber: string;
  status: OrderStatus;
  fulfilmentMethod: FulfilmentMethod;
  requestedFor: Date;
  deliveryAddress: string | null;
  customerId: string;
  amountDue: number;
  amountPaid: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemCustomization {
  id: string;
  tenantId: string;
  orderItemId: string;
  optionGroupName: string;
  optionValueLabel: string;
  priceDelta: number;
}

export interface OrderItem {
  id: string;
  tenantId: string;
  orderId: string;
  productId: string | null;
  productNameSnapshot: string;
  quantity: number;
  unitPriceSnapshot: number;
  customizations: OrderItemCustomization[];
}

export interface OrderStatusHistoryEntry {
  id: string;
  tenantId: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorType: OrderActorType;
  actorUserId: string | null;
  note: string | null;
  createdAt: Date;
}

export interface OrderDetail extends Order {
  items: OrderItem[];
  history: OrderStatusHistoryEntry[];
}

export interface CartItemOptionSelection {
  optionGroupId: string;
  optionValueId: string;
}

export interface CartItemInput {
  productId: string;
  quantity: number;
  selectedOptions: CartItemOptionSelection[];
}

export interface CheckoutInput {
  items: CartItemInput[];
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  fulfilmentMethod: FulfilmentMethod;
  requestedFor: Date;
  deliveryAddress: string | null;
}

export interface CheckoutResult {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  trackingToken: string;
}
