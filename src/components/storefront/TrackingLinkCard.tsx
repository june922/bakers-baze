"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function TrackingLinkCard({ trackingUrl }: { trackingUrl: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(trackingUrl, { width: 200, margin: 1 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        // QR generation failing shouldn't block showing the copyable link.
      });
    return () => {
      cancelled = true;
    };
  }, [trackingUrl]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable — the link is still shown and selectable.
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-black/[.08] p-6 text-center dark:border-white/[.145]">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Save this link to track your order — it&apos;s the only way to check its status.
      </p>
      {qrDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrDataUrl} alt="QR code linking to your order tracking page" className="h-40 w-40" />
      )}
      <div className="flex w-full max-w-sm items-center gap-2">
        <input
          readOnly
          value={trackingUrl}
          onFocus={(e) => e.target.select()}
          className="flex-1 rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
