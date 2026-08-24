"use client";

import { useState } from "react";
import { apiRequest } from "@/src/lib/dashboard-api-client";
import type { ProductOptionGroup, ProductOptionValue, SelectionType } from "@/src/modules/products/products.types";

function toMajorUnits(minorUnits: number): string {
  return (minorUnits / 100).toFixed(2);
}

function toMinorUnits(majorUnitsText: string): number {
  const parsed = Number.parseFloat(majorUnitsText);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function OptionValueRow({
  productId,
  groupId,
  value,
  onUpdated,
  onDeleted,
}: {
  productId: string;
  groupId: string;
  value: ProductOptionValue;
  onUpdated: (value: ProductOptionValue) => void;
  onDeleted: (id: string) => void;
}) {
  const [label, setLabel] = useState(value.label);
  const [priceDelta, setPriceDelta] = useState(toMajorUnits(value.priceDelta));
  const [available, setAvailable] = useState(value.available);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const basePath = `/api/dashboard/products/${productId}/option-groups/${groupId}/values/${value.id}`;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<ProductOptionValue>(basePath, {
        method: "PATCH",
        body: { label, priceDelta: toMinorUnits(priceDelta), available },
      });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save value");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete option "${value.label}"?`)) return;
    setSaving(true);
    try {
      await apiRequest(basePath, { method: "DELETE" });
      onDeleted(value.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete value");
      setSaving(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded border border-black/[.06] p-2 sm:flex-row sm:items-center dark:border-white/[.1]">
      <input
        aria-label="Option label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={handleSave}
        className="flex-1 rounded border border-black/[.08] px-2 py-1 text-sm dark:border-white/[.145]"
      />
      <input
        aria-label="Price delta (KES)"
        type="number"
        step="0.01"
        value={priceDelta}
        onChange={(e) => setPriceDelta(e.target.value)}
        onBlur={handleSave}
        className="w-24 rounded border border-black/[.08] px-2 py-1 text-sm dark:border-white/[.145]"
      />
      <label className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        <input
          type="checkbox"
          checked={available}
          onChange={(e) => {
            setAvailable(e.target.checked);
            void handleSave();
          }}
        />
        Available
      </label>
      <button
        type="button"
        onClick={handleDelete}
        disabled={saving}
        className="rounded-full border border-red-200 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-900"
      >
        Delete
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </li>
  );
}

function AddOptionValueForm({
  productId,
  groupId,
  onCreated,
}: {
  productId: string;
  groupId: string;
  onCreated: (value: ProductOptionValue) => void;
}) {
  const [label, setLabel] = useState("");
  const [priceDelta, setPriceDelta] = useState("0.00");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await apiRequest<ProductOptionValue>(
        `/api/dashboard/products/${productId}/option-groups/${groupId}/values`,
        { method: "POST", body: { label, priceDelta: toMinorUnits(priceDelta) } }
      );
      onCreated(created);
      setLabel("");
      setPriceDelta("0.00");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add value");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        required
        placeholder="Option label (e.g. Large)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="flex-1 rounded border border-black/[.08] px-2 py-1 text-sm dark:border-white/[.145]"
      />
      <input
        type="number"
        step="0.01"
        aria-label="Price delta (KES)"
        value={priceDelta}
        onChange={(e) => setPriceDelta(e.target.value)}
        className="w-24 rounded border border-black/[.08] px-2 py-1 text-sm dark:border-white/[.145]"
      />
      <button
        type="submit"
        disabled={saving}
        className="rounded-full border border-black/[.08] px-3 py-1 text-xs disabled:opacity-50 dark:border-white/[.145]"
      >
        {saving ? "Adding…" : "Add option"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </form>
  );
}

function OptionGroupCard({
  productId,
  group,
  onUpdated,
  onDeleted,
}: {
  productId: string;
  group: ProductOptionGroup;
  onUpdated: (group: ProductOptionGroup) => void;
  onDeleted: (id: string) => void;
}) {
  const [name, setName] = useState(group.name);
  const [selectionType, setSelectionType] = useState<SelectionType>(group.selectionType);
  const [required, setRequired] = useState(group.required);
  const [values, setValues] = useState<ProductOptionValue[]>(group.values);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const basePath = `/api/dashboard/products/${productId}/option-groups/${group.id}`;

  async function handleSaveGroup() {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<ProductOptionGroup>(basePath, {
        method: "PATCH",
        body: { name, selectionType, required },
      });
      onUpdated({ ...updated, values });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save option group");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup() {
    if (!window.confirm(`Delete option group "${group.name}" and all its options?`)) return;
    setSaving(true);
    try {
      await apiRequest(basePath, { method: "DELETE" });
      onDeleted(group.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete option group");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          aria-label="Option group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSaveGroup}
          className="flex-1 rounded border border-black/[.08] px-2 py-1 text-sm font-medium dark:border-white/[.145]"
        />
        <select
          aria-label="Selection type"
          value={selectionType}
          onChange={(e) => {
            setSelectionType(e.target.value as SelectionType);
          }}
          onBlur={handleSaveGroup}
          className="rounded border border-black/[.08] px-2 py-1 text-sm dark:border-white/[.145] dark:bg-transparent"
        >
          <option value="single">Pick one</option>
          <option value="multiple">Pick multiple</option>
        </select>
        <label className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => {
              setRequired(e.target.checked);
            }}
            onBlur={handleSaveGroup}
          />
          Required
        </label>
        <button
          type="button"
          onClick={handleDeleteGroup}
          disabled={saving}
          className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-900"
        >
          Delete group
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {values.length > 0 && (
        <ul className="flex flex-col gap-2">
          {values.map((value) => (
            <OptionValueRow
              key={value.id}
              productId={productId}
              groupId={group.id}
              value={value}
              onUpdated={(updated) => setValues((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))}
              onDeleted={(id) => setValues((prev) => prev.filter((v) => v.id !== id))}
            />
          ))}
        </ul>
      )}

      <AddOptionValueForm
        productId={productId}
        groupId={group.id}
        onCreated={(created) => setValues((prev) => [...prev, created])}
      />
    </div>
  );
}

function AddOptionGroupForm({
  productId,
  onCreated,
}: {
  productId: string;
  onCreated: (group: ProductOptionGroup) => void;
}) {
  const [name, setName] = useState("");
  const [selectionType, setSelectionType] = useState<SelectionType>("single");
  const [required, setRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await apiRequest<ProductOptionGroup>(`/api/dashboard/products/${productId}/option-groups`, {
        method: "POST",
        body: { name, selectionType, required },
      });
      onCreated({ ...created, values: [] });
      setName("");
      setSelectionType("single");
      setRequired(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add option group");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleAdd}
      className="flex flex-col gap-2 rounded-lg border border-dashed border-black/[.15] p-4 sm:flex-row sm:items-center dark:border-white/[.2]"
    >
      <input
        required
        placeholder="Group name (e.g. Size)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 rounded border border-black/[.08] px-2 py-1 text-sm dark:border-white/[.145]"
      />
      <select
        value={selectionType}
        onChange={(e) => setSelectionType(e.target.value as SelectionType)}
        className="rounded border border-black/[.08] px-2 py-1 text-sm dark:border-white/[.145] dark:bg-transparent"
      >
        <option value="single">Pick one</option>
        <option value="multiple">Pick multiple</option>
      </select>
      <label className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
        Required
      </label>
      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background disabled:opacity-50"
      >
        {saving ? "Adding…" : "Add option group"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </form>
  );
}

export default function OptionGroupsManager({
  productId,
  initialGroups,
}: {
  productId: string;
  initialGroups: ProductOptionGroup[];
}) {
  const [groups, setGroups] = useState<ProductOptionGroup[]>(initialGroups);

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <OptionGroupCard
          key={group.id}
          productId={productId}
          group={group}
          onUpdated={(updated) => setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))}
          onDeleted={(id) => setGroups((prev) => prev.filter((g) => g.id !== id))}
        />
      ))}
      <AddOptionGroupForm productId={productId} onCreated={(created) => setGroups((prev) => [...prev, created])} />
    </div>
  );
}
