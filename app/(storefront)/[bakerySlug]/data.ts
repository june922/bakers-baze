import { unstable_cache } from "next/cache";
import { cache } from "react";
import { storefrontCacheTag } from "@/src/lib/cache-invalidator";
import { resolveTenantBySlug } from "@/src/lib/tenant-context";
import { storefrontService } from "@/src/modules/storefront/storefront.service";
import type {
  StorefrontCategoryPageData,
  StorefrontData,
  StorefrontProductPageData,
} from "@/src/modules/storefront/storefront.types";

export const loadStorefrontData = cache(async (bakerySlug: string): Promise<StorefrontData | undefined> => {
  const bakery = await resolveTenantBySlug(bakerySlug);
  if (!bakery) return undefined;

  const getCached = unstable_cache(
    () => storefrontService.getStorefrontData(bakery.id),
    ["storefront-data", bakery.id],
    { tags: [storefrontCacheTag(bakery.id)] }
  );
  return getCached();
});

export const loadCategoryPageData = cache(
  async (bakerySlug: string, categorySlug: string): Promise<StorefrontCategoryPageData | undefined> => {
    const bakery = await resolveTenantBySlug(bakerySlug);
    if (!bakery) return undefined;

    const getCached = unstable_cache(
      () => storefrontService.getCategoryPageData(bakery.id, categorySlug),
      ["storefront-category-data", bakery.id, categorySlug],
      { tags: [storefrontCacheTag(bakery.id)] }
    );
    return getCached();
  }
);

export const loadProductPageData = cache(
  async (
    bakerySlug: string,
    categorySlug: string,
    productSlug: string
  ): Promise<StorefrontProductPageData | undefined> => {
    const bakery = await resolveTenantBySlug(bakerySlug);
    if (!bakery) return undefined;

    const getCached = unstable_cache(
      () => storefrontService.getProductPageData(bakery.id, categorySlug, productSlug),
      ["storefront-product-data", bakery.id, categorySlug, productSlug],
      { tags: [storefrontCacheTag(bakery.id)] }
    );
    return getCached();
  }
);
