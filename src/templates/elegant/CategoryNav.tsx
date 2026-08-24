import Link from "next/link";
import type { TemplateSectionProps } from "@/src/templates/types";

export default function CategoryNav({ data, activeCategorySlug }: TemplateSectionProps & { activeCategorySlug?: string }) {
  if (data.categories.length === 0) return null;

  return (
    <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      {data.categories.map((category) => {
        const isActive = category.slug === activeCategorySlug;
        return (
          <Link
            key={category.id}
            href={`/${data.bakery.slug}/${category.slug}`}
            className={
              isActive
                ? "font-semibold text-[var(--accent)] dark:text-[#e0b48c]"
                : "text-zinc-600 transition-colors hover:text-[var(--accent)] dark:text-zinc-400 dark:hover:text-[#e0b48c]"
            }
          >
            {category.name}
          </Link>
        );
      })}
    </nav>
  );
}
