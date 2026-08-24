import StorefrontSettingsForm from "@/src/components/dashboard/StorefrontSettingsForm";
import { NotFoundError } from "@/src/lib/errors";
import { toTenantContext } from "@/src/lib/tenant-context";
import { requireBaker } from "@/src/modules/auth/auth.service";
import { storefrontService } from "@/src/modules/storefront/storefront.service";
import type { StorefrontSettings } from "@/src/modules/storefront/storefront.types";

export default async function StorefrontSettingsPage() {
  const ctx = toTenantContext(await requireBaker());

  let settings: StorefrontSettings | undefined;
  try {
    settings = await storefrontService.getSettings(ctx);
  } catch (error) {
    if (!(error instanceof NotFoundError)) throw error;
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Storefront settings</h1>
        <p className="text-sm text-zinc-500">Controls your public storefront&apos;s branding and content.</p>
      </div>
      <StorefrontSettingsForm settings={settings} />
    </div>
  );
}
