import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import db from "@/src/lib/db";
import { ConflictError, NotFoundError } from "@/src/lib/errors";
import type { TenantContext } from "@/src/lib/tenant-context";
import {
  productOptionGroupsRepository,
  productOptionValuesRepository,
  productsRepository,
} from "@/src/modules/products/products.repository";
import { productsService } from "@/src/modules/products/products.service";
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

describe("products service — CRUD and tenant isolation", () => {
  beforeAll(cleanUp);
  afterEach(cleanUp);
  afterAll(async () => {
    await db.destroy();
  });

  it("creates a category and rejects a duplicate slug within the same tenant", async () => {
    const { ctx } = await seedTenant();
    await productsService.createCategory(ctx, { name: "Cakes", slug: "cakes" });
    await expect(productsService.createCategory(ctx, { name: "Cakes 2", slug: "cakes" })).rejects.toThrow(
      ConflictError
    );
  });

  it("allows the same slug across two different tenants", async () => {
    const { ctx: ctxA } = await seedTenant();
    const { ctx: ctxB } = await seedTenant();
    await expect(productsService.createCategory(ctxA, { name: "Cakes", slug: "cakes" })).resolves.toMatchObject({
      slug: "cakes",
    });
    await expect(productsService.createCategory(ctxB, { name: "Cakes", slug: "cakes" })).resolves.toMatchObject({
      slug: "cakes",
    });
  });

  it("creates a product with option groups/values and returns the full nested detail", async () => {
    const { ctx } = await seedTenant();
    const category = await productsService.createCategory(ctx, { name: "Cakes", slug: "cakes" });

    const product = await productsService.createProduct(ctx, {
      categoryId: category.id,
      name: "Vanilla Cake",
      slug: "vanilla-cake",
      basePrice: 200000,
      status: "published",
      imageUrls: ["https://example.com/cake.jpg"],
    });

    const group = await productsService.createOptionGroup(ctx, product.id, {
      name: "Size",
      selectionType: "single",
      required: true,
    });
    await productsService.createOptionValue(ctx, group.id, { label: "Small", priceDelta: 0 });
    await productsService.createOptionValue(ctx, group.id, { label: "Large", priceDelta: 50000 });

    const detail = await productsService.getProduct(ctx, product.id);
    expect(detail.images).toHaveLength(1);
    expect(detail.optionGroups).toHaveLength(1);
    expect(detail.optionGroups[0].values).toHaveLength(2);
  });

  it("rejects creating a product with a category that belongs to a different tenant", async () => {
    const { ctx: ctxA } = await seedTenant();
    const { ctx: ctxB } = await seedTenant();
    const categoryA = await productsService.createCategory(ctxA, { name: "Cakes", slug: "cakes" });

    await expect(
      productsService.createProduct(ctxB, {
        categoryId: categoryA.id,
        name: "Stolen",
        slug: "stolen",
        basePrice: 1000,
      })
    ).rejects.toThrow(NotFoundError);
  });

  it("prevents one tenant from reading, updating, or deleting another tenant's product", async () => {
    const { ctx: ctxA } = await seedTenant();
    const { ctx: ctxB } = await seedTenant();

    const productA = await productsService.createProduct(ctxA, { name: "Cake A", slug: "cake-a", basePrice: 1000 });

    await expect(productsService.getProduct(ctxB, productA.id)).rejects.toThrow(NotFoundError);
    await expect(productsService.updateProduct(ctxB, productA.id, { name: "Hijacked" })).rejects.toThrow(
      NotFoundError
    );
    await expect(productsService.deleteProduct(ctxB, productA.id)).rejects.toThrow(NotFoundError);

    const stillThere = await productsService.getProduct(ctxA, productA.id);
    expect(stillThere.name).toBe("Cake A");
  });

  it("prevents cross-tenant repository access to option groups and values", async () => {
    const { ctx: ctxA, tenantId: tenantAId } = await seedTenant();
    const { tenantId: tenantBId } = await seedTenant();

    const productA = await productsService.createProduct(ctxA, {
      name: "Cake A",
      slug: "cake-a-2",
      basePrice: 1000,
    });
    const groupA = await productsService.createOptionGroup(ctxA, productA.id, {
      name: "Size",
      selectionType: "single",
    });
    const valueA = await productsService.createOptionValue(ctxA, groupA.id, { label: "Small" });

    await expect(productOptionGroupsRepository.findByIdForTenant(tenantBId, groupA.id)).resolves.toBeUndefined();
    await expect(productOptionValuesRepository.findByIdForTenant(tenantBId, valueA.id)).resolves.toBeUndefined();
    await expect(productOptionGroupsRepository.findByIdForTenant(tenantAId, groupA.id)).resolves.toMatchObject({
      id: groupA.id,
    });
  });

  it("cascades product deletion to its option groups and values at the database level", async () => {
    const { ctx } = await seedTenant();
    const product = await productsService.createProduct(ctx, { name: "Cake", slug: "cake-cascade", basePrice: 1000 });
    const group = await productsService.createOptionGroup(ctx, product.id, { name: "Size", selectionType: "single" });
    await productsService.createOptionValue(ctx, group.id, { label: "Small" });

    await productsService.deleteProduct(ctx, product.id);

    const remainingGroups = await db("product_option_groups").where({ id: group.id });
    expect(remainingGroups).toHaveLength(0);
  });

  it("only returns published products from listPublishedForTenant", async () => {
    const { ctx, tenantId } = await seedTenant();
    await productsService.createProduct(ctx, { name: "Draft Cake", slug: "draft-cake", basePrice: 1000, status: "draft" });
    await productsService.createProduct(ctx, {
      name: "Live Cake",
      slug: "live-cake",
      basePrice: 1000,
      status: "published",
    });

    const published = await productsRepository.listPublishedForTenant(tenantId);
    expect(published).toHaveLength(1);
    expect(published[0].slug).toBe("live-cake");
  });
});
