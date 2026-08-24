import Link from "next/link";
import CartLink from "@/src/components/storefront/CartLink";
import type { TemplateSectionProps } from "@/src/templates/types";
import CategoryNav from "./CategoryNav";

export default function Header({ data, activeCategorySlug }: TemplateSectionProps & { activeCategorySlug?: string }) {
  return (
    <header className="border-b border-black/[.08] bg-[#fbf7f2] dark:border-white/[.145] dark:bg-[#1a1512]">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/${data.bakery.slug}`}
            className="flex items-center gap-3 text-2xl font-semibold tracking-tight"
          >
            {data.settings.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.settings.logoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
            )}
            {data.settings.displayName}
          </Link>
          <CartLink bakerySlug={data.bakery.slug} />
        </div>
        <CategoryNav data={data} activeCategorySlug={activeCategorySlug} />
      </div>
    </header>
  );
}
