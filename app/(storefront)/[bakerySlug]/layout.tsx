import { CartProvider } from "@/src/components/storefront/CartProvider";
import { getTemplate } from "@/src/templates/registry";
import { loadStorefrontData } from "./data";

export default async function BakeryStorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ bakerySlug: string }>;
}) {
  const { bakerySlug } = await params;
  const data = await loadStorefrontData(bakerySlug);

  if (!data || data.bakery.status === "suspended") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 p-16 text-center">
        <h1 className="text-2xl font-semibold">Storefront unavailable</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          This bakery&apos;s storefront isn&apos;t available right now. Please check back later.
        </p>
      </main>
    );
  }

  const template = getTemplate(data.settings.templateKey);
  const accentColor = data.settings.primaryColor ?? "#8a5a3b";

  return (
    <div className="flex flex-1 flex-col" style={{ "--accent": accentColor } as React.CSSProperties}>
      <CartProvider bakerySlug={data.bakery.slug}>
        <template.Header data={data} />
        <div className="flex flex-1 flex-col">{children}</div>
        <template.Footer data={data} />
      </CartProvider>
    </div>
  );
}
