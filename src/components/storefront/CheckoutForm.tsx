"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "./CartProvider";
import TrackingLinkCard from "./TrackingLinkCard";
import { formatPrice } from "@/src/templates/format";

interface CheckoutSuccess {
  orderNumber: string;
  status: string;
  trackingToken: string;
}

function minDateTimeLocal(): string {
  const now = new Date(Date.now() + 60 * 60 * 1000); // at least an hour from now
  now.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export default function CheckoutForm({ bakerySlug }: { bakerySlug: string }) {
  const { lines, totalPrice, clear } = useCart();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [fulfilmentMethod, setFulfilmentMethod] = useState<"pickup" | "delivery">("pickup");
  const [requestedFor, setRequestedFor] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<CheckoutSuccess | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      items: lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        selectedOptions: line.selectedOptions.map((o) => ({
          optionGroupId: o.optionGroupId,
          optionValueId: o.optionValueId,
        })),
      })),
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      fulfilmentMethod,
      requestedFor: new Date(requestedFor).toISOString(),
      deliveryAddress: fulfilmentMethod === "delivery" ? deliveryAddress : null,
    };

    try {
      const response = await fetch(`/api/storefront/${bakerySlug}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error?.message ?? "Checkout failed");
        setSubmitting(false);
        return;
      }

      clear();
      setSuccess(result.data);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (success) {
    const trackingUrl = `${window.location.origin}/track/${success.trackingToken}`;
    return (
      <main className="mx-auto flex max-w-lg flex-1 flex-col items-center gap-6 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Order {success.orderNumber} received</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {success.status === "requested"
            ? "The baker will review your request and confirm shortly."
            : "Your order is confirmed and awaiting payment."}
        </p>
        <TrackingLinkCard trackingUrl={trackingUrl} />
        <Link href={`/${bakerySlug}`} className="text-sm text-[var(--accent)] hover:underline">
          Back to storefront
        </Link>
      </main>
    );
  }

  if (lines.length === 0) {
    return (
      <main className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <Link href={`/${bakerySlug}`} className="text-sm text-[var(--accent)] hover:underline">
          Browse products
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Checkout</h1>

      <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
        <p className="mb-2 text-sm font-medium">Order summary</p>
        <ul className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          {lines.map((line) => (
            <li key={line.key}>
              {line.quantity} × {line.productName}
              {line.selectedOptions.length > 0 && ` (${line.selectedOptions.map((o) => o.optionValueLabel).join(", ")})`}
            </li>
          ))}
        </ul>
        <p className="mt-2 border-t border-black/[.08] pt-2 font-semibold dark:border-white/[.145]">
          Total: {formatPrice(totalPrice)}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1">
          <label htmlFor="checkout-name" className="text-sm font-medium">
            Your name
          </label>
          <input
            id="checkout-name"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="checkout-phone" className="text-sm font-medium">
            Phone number
          </label>
          <input
            id="checkout-phone"
            required
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="+254712345678"
            className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="checkout-email" className="text-sm font-medium">
            Email (optional)
          </label>
          <input
            id="checkout-email"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Fulfilment</legend>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="fulfilmentMethod"
                checked={fulfilmentMethod === "pickup"}
                onChange={() => setFulfilmentMethod("pickup")}
              />
              Pickup
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="fulfilmentMethod"
                checked={fulfilmentMethod === "delivery"}
                onChange={() => setFulfilmentMethod("delivery")}
              />
              Delivery
            </label>
          </div>
        </fieldset>

        {fulfilmentMethod === "delivery" && (
          <div className="flex flex-col gap-1">
            <label htmlFor="checkout-address" className="text-sm font-medium">
              Delivery address
            </label>
            <textarea
              id="checkout-address"
              required
              rows={2}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="checkout-requested-for" className="text-sm font-medium">
            {fulfilmentMethod === "pickup" ? "Pickup" : "Delivery"} date &amp; time
          </label>
          <input
            id="checkout-requested-for"
            required
            type="datetime-local"
            min={minDateTimeLocal()}
            value={requestedFor}
            onChange={(e) => setRequestedFor(e.target.value)}
            className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background disabled:opacity-50"
        >
          {submitting ? "Placing order…" : "Place order"}
        </button>
      </form>
    </main>
  );
}
