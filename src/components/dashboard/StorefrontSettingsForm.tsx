"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/src/lib/dashboard-api-client";
import type { StorefrontSettings } from "@/src/modules/storefront/storefront.types";

export default function StorefrontSettingsForm({ settings }: { settings?: StorefrontSettings }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(settings?.displayName ?? "");
  const [tagline, setTagline] = useState(settings?.tagline ?? "");
  const [aboutText, setAboutText] = useState(settings?.aboutText ?? "");
  const [contactEmail, setContactEmail] = useState(settings?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(settings?.contactPhone ?? "");
  const [address, setAddress] = useState(settings?.address ?? "");
  const [heroImageUrl, setHeroImageUrl] = useState(settings?.heroImageUrl ?? "");
  const [logoUrl, setLogoUrl] = useState(settings?.logoUrl ?? "");
  const [primaryColor, setPrimaryColor] = useState(settings?.primaryColor ?? "#8a5a3b");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await apiRequest("/api/dashboard/storefront-settings", {
        method: "PATCH",
        body: {
          displayName,
          tagline: tagline || null,
          aboutText: aboutText || null,
          contactEmail: contactEmail || null,
          contactPhone: contactPhone || null,
          address: address || null,
          heroImageUrl: heroImageUrl || null,
          logoUrl: logoUrl || null,
          primaryColor: primaryColor || null,
        },
      });
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="settings-display-name" className="text-sm font-medium">
          Storefront name
        </label>
        <input
          id="settings-display-name"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="settings-tagline" className="text-sm font-medium">
          Tagline
        </label>
        <input
          id="settings-tagline"
          value={tagline ?? ""}
          onChange={(e) => setTagline(e.target.value)}
          className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="settings-about" className="text-sm font-medium">
          About
        </label>
        <textarea
          id="settings-about"
          rows={4}
          value={aboutText ?? ""}
          onChange={(e) => setAboutText(e.target.value)}
          className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="settings-email" className="text-sm font-medium">
            Contact email
          </label>
          <input
            id="settings-email"
            type="email"
            value={contactEmail ?? ""}
            onChange={(e) => setContactEmail(e.target.value)}
            className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="settings-phone" className="text-sm font-medium">
            Contact phone
          </label>
          <input
            id="settings-phone"
            value={contactPhone ?? ""}
            onChange={(e) => setContactPhone(e.target.value)}
            className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="settings-address" className="text-sm font-medium">
          Address
        </label>
        <input
          id="settings-address"
          value={address ?? ""}
          onChange={(e) => setAddress(e.target.value)}
          className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="settings-hero-image" className="text-sm font-medium">
          Hero banner image URL
        </label>
        <input
          id="settings-hero-image"
          type="url"
          value={heroImageUrl ?? ""}
          onChange={(e) => setHeroImageUrl(e.target.value)}
          placeholder="https://example.com/hero.jpg"
          className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="settings-logo" className="text-sm font-medium">
            Logo image URL
          </label>
          <input
            id="settings-logo"
            type="url"
            value={logoUrl ?? ""}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="settings-color" className="text-sm font-medium">
            Accent color
          </label>
          <input
            id="settings-color"
            type="color"
            value={primaryColor ?? "#8a5a3b"}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-10 w-16 rounded border border-black/[.08] dark:border-white/[.145]"
          />
        </div>
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
        {saving ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
