import { cacheInvalidator, storefrontCacheTag } from "@/src/lib/cache-invalidator";
import { NotFoundError, ValidationError } from "@/src/lib/errors";
import type { TenantContext } from "@/src/lib/tenant-context";
import { categoriesRepository, productsRepository } from "@/src/modules/products/products.repository";
import { tenantsRepository } from "@/src/modules/tenants/tenants.repository";
import { storefrontSettingsRepository } from "./storefront.repository";
import type {
  StorefrontCategoryPageData,
  StorefrontData,
  StorefrontProductPageData,
  StorefrontSettings,
} from "./storefront.types";

async function invalidateStorefront(tenantId: string): Promise<void> {
  await cacheInvalidator.invalidateTag(storefrontCacheTag(tenantId));
}

export const storefrontService = {
  async getSettings(ctx: TenantContext): Promise<StorefrontSettings> {
    const settings = await storefrontSettingsRepository.findByTenantId(ctx.tenantId);
    if (!settings) throw new NotFoundError("Storefront settings have not been configured yet");
    return settings;
  },

  async updateSettings(
    ctx: TenantContext,
    input: Partial<{
      templateKey: string;
      displayName: string;
      tagline: string | null;
      aboutText: string | null;
      contactEmail: string | null;
      contactPhone: string | null;
      address: string | null;
      heroImageUrl: string | null;
      logoUrl: string | null;
      primaryColor: string | null;
      branding: Record<string, unknown>;
      social: Record<string, unknown>;
    }>
  ): Promise<StorefrontSettings> {
    const existing = await storefrontSettingsRepository.findByTenantId(ctx.tenantId);

    let settings: StorefrontSettings;
    if (existing) {
      const updated = await storefrontSettingsRepository.updateForTenant(ctx.tenantId, input);
      if (!updated) throw new NotFoundError("Storefront settings not found");
      settings = updated;
    } else {
      if (!input.displayName) {
        throw new ValidationError("displayName is required to create storefront settings");
      }
      settings = await storefrontSettingsRepository.create(ctx.tenantId, { ...input, displayName: input.displayName });
    }

    await invalidateStorefront(ctx.tenantId);
    return settings;
  },

  /**
   * Public, unauthenticated read path — scoped by a tenantId already resolved
   * from the URL slug (see resolveTenantBySlug), never by a caller-supplied id.
   */
  async getStorefrontData(tenantId: string): Promise<StorefrontData | undefined> {
    const [bakery, settings, categories, products] = await Promise.all([
      tenantsRepository.findById(tenantId),
      storefrontSettingsRepository.findByTenantId(tenantId),
      categoriesRepository.list(tenantId),
      productsRepository.listPublishedForTenant(tenantId),
    ]);

    if (!bakery || !settings) return undefined;
    return { bakery, settings, categories, products };
  },

  async getCategoryPageData(
    tenantId: string,
    categorySlug: string
  ): Promise<StorefrontCategoryPageData | undefined> {
    const [data, category] = await Promise.all([
      storefrontService.getStorefrontData(tenantId),
      categoriesRepository.findBySlugForTenant(tenantId, categorySlug),
    ]);

    if (!data || !category) return undefined;
    return { ...data, category };
  },

  async getProductPageData(
    tenantId: string,
    categorySlug: string,
    productSlug: string
  ): Promise<StorefrontProductPageData | undefined> {
    const [data, product] = await Promise.all([
      storefrontService.getStorefrontData(tenantId),
      productsRepository.findDetailBySlugForTenant(tenantId, productSlug, { publishedOnly: true }),
    ]);

    if (!data || !product) return undefined;
    if (product.categoryId) {
      const category = data.categories.find((c) => c.id === product.categoryId);
      if (!category || category.slug !== categorySlug) return undefined;
    } else if (categorySlug !== "uncategorized") {
      return undefined;
    }

    return { ...data, product };
  },
};
