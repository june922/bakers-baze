"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/src/lib/dashboard-api-client";
import { slugify } from "@/src/lib/slugify";
import type { Category, OrderingMode, ProductDetail, ProductStatus } from "@/src/modules/products/products.types";

function toMajorUnits(minorUnits: number): string {
  return (minorUnits / 100).toFixed(2);
}

function toMinorUnits(majorUnitsText: string): number {
  const parsed = Number.parseFloat(majorUnitsText);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export default function ProductForm({
  mode,
  product,
  categories,
}: {
  mode: "create" | "edit";
  product?: ProductDetail;
  categories: Category[];
}) {
  const router = useRouter();
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? toMajorUnits(product.basePrice) : "");
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(product?.prepTimeMinutes?.toString() ?? "");
  const [orderingMode, setOrderingMode] = useState<OrderingMode>(product?.orderingMode ?? "instant");
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? "draft");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [imageUrlsText, setImageUrlsText] = useState(product?.images.map((image) => image.url).join("\n") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const imageUrls = imageUrlsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = {
      name,
      slug: slug || slugify(name),
      description: description || null,
      basePrice: toMinorUnits(price),
      prepTimeMinutes: prepTimeMinutes ? Number.parseInt(prepTimeMinutes, 10) : null,
      orderingMode,
      status,
      categoryId: categoryId || null,
      imageUrls,
    };

    try {
      if (mode === "create") {
        const created = await apiRequest<ProductDetail>("/api/dashboard/products", {
          method: "POST",
          body: payload,
        });
        router.push(`/dashboard/products/${created.id}`);
        router.refresh();
      } else if (product) {
        await apiRequest<ProductDetail>(`/api/dashboard/products/${product.id}`, {
          method: "PATCH",
          body: payload,
        });
        setSuccess(true);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="product-name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="product-name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="product-slug" className="text-sm font-medium">
          Slug
        </label>
        <input
          id="product-slug"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="product-description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="product-description"
          rows={3}
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="product-price" className="text-sm font-medium">
            Price (KES)
          </label>
          <input
            id="product-price"
            required
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="product-prep-time" className="text-sm font-medium">
            Prep time (minutes, optional)
          </label>
          <input
            id="product-prep-time"
            type="number"
            min="0"
            value={prepTimeMinutes}
            onChange={(e) => setPrepTimeMinutes(e.target.value)}
            className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="product-category" className="text-sm font-medium">
            Category
          </label>
          <select
            id="product-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
          >
            <option value="">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="product-ordering-mode" className="text-sm font-medium">
            Ordering mode
          </label>
          <select
            id="product-ordering-mode"
            value={orderingMode}
            onChange={(e) => setOrderingMode(e.target.value as OrderingMode)}
            className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
          >
            <option value="instant">Instant order</option>
            <option value="request_confirm">Request to confirm</option>
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="product-status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="product-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProductStatus)}
            className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="product-images" className="text-sm font-medium">
          Image URLs (one per line)
        </label>
        <textarea
          id="product-images"
          rows={3}
          value={imageUrlsText}
          onChange={(e) => setImageUrlsText(e.target.value)}
          placeholder="https://example.com/photo.jpg"
          className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {success && <p className="text-sm text-green-600 dark:text-green-500">Saved.</p>}

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {saving ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
      </button>
    </form>
  );
}
