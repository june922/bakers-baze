"use client";

import { useState } from "react";
import { apiRequest } from "@/src/lib/dashboard-api-client";
import { slugify } from "@/src/lib/slugify";
import type { Category } from "@/src/modules/products/products.types";

function CategoryRow({
  category,
  onUpdated,
  onDeleted,
}: {
  category: Category;
  onUpdated: (category: Category) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [slug, setSlug] = useState(category.slug);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<Category>(`/api/dashboard/categories/${category.id}`, {
        method: "PATCH",
        body: { name, slug },
      });
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete category "${category.name}"? Products in it will become uncategorized.`)) return;
    setSaving(true);
    setError(null);
    try {
      await apiRequest(`/api/dashboard/categories/${category.id}`, { method: "DELETE" });
      onDeleted(category.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-2 rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            aria-label="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded border border-black/[.08] px-2 py-1 text-sm dark:border-white/[.145]"
          />
          <input
            aria-label="Category slug"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            className="flex-1 rounded border border-black/[.08] px-2 py-1 text-sm dark:border-white/[.145]"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setName(category.name);
              setSlug(category.slug);
              setError(null);
            }}
            className="rounded-full border border-black/[.08] px-3 py-1 text-xs dark:border-white/[.145]"
          >
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]">
      <div>
        <p className="font-medium">{category.name}</p>
        <p className="text-sm text-zinc-500">/{category.slug}</p>
      </div>
      <div className="flex items-center gap-2">
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-full border border-black/[.08] px-3 py-1 text-xs dark:border-white/[.145]"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={saving}
          className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-900"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export default function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const created = await apiRequest<Category>("/api/dashboard/categories", {
        method: "POST",
        body: { name, slug: slug || slugify(name), position: categories.length },
      });
      setCategories((prev) => [...prev, created]);
      setName("");
      setSlug("");
      setSlugTouched(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleCreate} className="flex flex-col gap-2 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
        <h2 className="text-sm font-medium">Add a category</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            required
            placeholder="Name (e.g. Cakes)"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            className="flex-1 rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
          />
          <input
            required
            placeholder="Slug (e.g. cakes)"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            className="flex-1 rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {creating ? "Adding…" : "Add"}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </form>

      {categories.length === 0 ? (
        <p className="text-sm text-zinc-500">No categories yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              onUpdated={(updated) =>
                setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
              }
              onDeleted={(id) => setCategories((prev) => prev.filter((c) => c.id !== id))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
