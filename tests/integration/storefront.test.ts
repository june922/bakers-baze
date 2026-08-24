import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import db from "@/src/lib/db";
import { NotFoundError, ValidationError } from "@/src/lib/errors";
import type { TenantContext } from "@/src/lib/tenant-context";
import { productsService } from "@/src/modules/products/products.service";
import { storefrontService } from "@/src/modules/storefront/storefront.service";
import { tenantsRepository } from "@/src/modules/tenants/tenants.repository";

async function cleanUp(): Promise<void> {
  await db("product_option_values").del();
  await db("product_option_groups").del();
  await db("product_images").del();
  await db("products").del();
  await db("categories").del();
  await db("storefront_settings").del();
  await db("sessions").del();
  await db("users").del();
  await db("bakeries").del();
}

async function seedTenant(): Promise<{ tenantId: string; ctx: TenantContext }> {
  const bakery = await tenantsRepository.create({ slug: `bakery-${randomUUID()}` });
  return { tenantId: bakery.id, ctx: { tenantId: bakery.id, userId: randomUUID(), role: "baker" } };
}

describe("storefront service — public data assembly", () => {
  beforeAll(cleanUp);
  afterEach(cleanUp);
  afterAll(async () => {
    await db.destroy();
  });

  it("returns undefined when storefront settings have not been configured yet", async () => {
    const { tenantId } = await seedTenant();
    await expect(storefrontService.getStorefrontData(tenantId)).resolves.toBeUndefined();
  });

  it("requires displayName to create settings for the first time", async () => {
    const { ctx } = await seedTenant();
    await expect(storefrontService.updateSettings(ctx, { tagline: "Fresh daily" })).rejects.toThrow(ValidationError);
  });

  it("creates settings on first update, then applies partial patches after that", async () => {
    const { ctx } = await seedTenant();
    await storefrontService.updateSettings(ctx, { displayName: "Sweet Crumbs" });
    const updated = await storefrontService.updateSettings(ctx, { tagline: "Baked with love" });

    expect(updated.displayName).toBe("Sweet Crumbs");
    expect(updated.tagline).toBe("Baked with love");
  });

  it("saves and updates branding fields (logo and accent color) independently", async () => {
    const { ctx } = await seedTenant();
    await storefrontService.updateSettings(ctx, { displayName: "Sweet Crumbs" });
    const updated = await storefrontService.updateSettings(ctx, {
      logoUrl: "https://example.com/logo.png",
      primaryColor: "#ff8800",
    });

    expect(updated.logoUrl).toBe("https://example.com/logo.png");
    expect(updated.primaryColor).toBe("#ff8800");
    expect(updated.displayName).toBe("Sweet Crumbs");

    const clearedLogo = await storefrontService.updateSettings(ctx, { logoUrl: null });
    expect(clearedLogo.logoUrl).toBeNull();
    expect(clearedLogo.primaryColor).toBe("#ff8800");
  });

  it("assembles storefront data with only published products, once settings exist", async () => {
    const { ctx, tenantId } = await seedTenant();
    await storefrontService.updateSettings(ctx, { displayName: "Sweet Crumbs" });
    const category = await productsService.createCategory(ctx, { name: "Cakes", slug: "cakes" });
    await productsService.createProduct(ctx, {
      categoryId: category.id,
      name: "Draft Cake",
      slug: "draft-cake",
      basePrice: 1000,
      status: "draft",
    });
    await productsService.createProduct(ctx, {
      categoryId: category.id,
      name: "Live Cake",
      slug: "live-cake",
      basePrice: 1000,
      status: "published",
    });

    const data = await storefrontService.getStorefrontData(tenantId);
    expect(data).toBeDefined();
    expect(data?.categories).toHaveLength(1);
    expect(data?.products).toHaveLength(1);
    expect(data?.products[0].slug).toBe("live-cake");
  });

  it("never leaks another tenant's products into getStorefrontData", async () => {
    const { ctx: ctxA, tenantId: tenantAId } = await seedTenant();
    const { ctx: ctxB } = await seedTenant();
    await storefrontService.updateSettings(ctxA, { displayName: "Bakery A" });
    await storefrontService.updateSettings(ctxB, { displayName: "Bakery B" });
    await productsService.createProduct(ctxB, { name: "B's Cake", slug: "bs-cake", basePrice: 1000, status: "published" });

    const data = await storefrontService.getStorefrontData(tenantAId);
    expect(data?.products).toHaveLength(0);
  });

  it("resolves category page data only for a category slug that exists for that tenant", async () => {
    const { ctx, tenantId } = await seedTenant();
    await storefrontService.updateSettings(ctx, { displayName: "Sweet Crumbs" });
    await productsService.createCategory(ctx, { name: "Cakes", slug: "cakes" });

    await expect(storefrontService.getCategoryPageData(tenantId, "cakes")).resolves.toBeDefined();
    await expect(storefrontService.getCategoryPageData(tenantId, "nonexistent")).resolves.toBeUndefined();
  });

  it("resolves product page data only when the product is published and the category slug matches", async () => {
    const { ctx, tenantId } = await seedTenant();
    await storefrontService.updateSettings(ctx, { displayName: "Sweet Crumbs" });
    const category = await productsService.createCategory(ctx, { name: "Cakes", slug: "cakes" });
    await productsService.createProduct(ctx, {
      categoryId: category.id,
      name: "Live Cake",
      slug: "live-cake",
      basePrice: 1000,
      status: "published",
    });
    await productsService.createProduct(ctx, {
      categoryId: category.id,
      name: "Draft Cake",
      slug: "draft-cake",
      basePrice: 1000,
      status: "draft",
    });

    await expect(storefrontService.getProductPageData(tenantId, "cakes", "live-cake")).resolves.toBeDefined();
    await expect(storefrontService.getProductPageData(tenantId, "wrong-category", "live-cake")).resolves.toBeUndefined();
    await expect(storefrontService.getProductPageData(tenantId, "cakes", "draft-cake")).resolves.toBeUndefined();
  });

  it("rejects updating settings for a nonexistent tenant path via getSettings", async () => {
    const { ctx } = await seedTenant();
    await expect(storefrontService.getSettings(ctx)).rejects.toThrow(NotFoundError);
  });
});
