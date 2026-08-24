import { cacheInvalidator, storefrontCacheTag } from "@/src/lib/cache-invalidator";
import { ConflictError, NotFoundError } from "@/src/lib/errors";
import type { TenantContext } from "@/src/lib/tenant-context";
import {
  categoriesRepository,
  productImagesRepository,
  productOptionGroupsRepository,
  productOptionValuesRepository,
  productsRepository,
} from "./products.repository";
import type {
  Category,
  OrderingMode,
  Product,
  ProductDetail,
  ProductOptionGroup,
  ProductOptionValue,
  ProductStatus,
  SelectionType,
} from "./products.types";

async function invalidateStorefront(tenantId: string): Promise<void> {
  await cacheInvalidator.invalidateTag(storefrontCacheTag(tenantId));
}

export const productsService = {
  async listCategories(ctx: TenantContext): Promise<Category[]> {
    return categoriesRepository.list(ctx.tenantId);
  },

  async createCategory(
    ctx: TenantContext,
    input: { name: string; slug: string; position?: number }
  ): Promise<Category> {
    const existing = await categoriesRepository.findBySlugForTenant(ctx.tenantId, input.slug);
    if (existing) {
      throw new ConflictError(`A category with slug "${input.slug}" already exists`);
    }
    const category = await categoriesRepository.create(ctx.tenantId, input);
    await invalidateStorefront(ctx.tenantId);
    return category;
  },

  async updateCategory(
    ctx: TenantContext,
    id: string,
    input: Partial<{ name: string; slug: string; position: number }>
  ): Promise<Category> {
    const existing = await categoriesRepository.findByIdForTenant(ctx.tenantId, id);
    if (!existing) throw new NotFoundError("Category not found");

    if (input.slug && input.slug !== existing.slug) {
      const slugTaken = await categoriesRepository.findBySlugForTenant(ctx.tenantId, input.slug);
      if (slugTaken) throw new ConflictError(`A category with slug "${input.slug}" already exists`);
    }

    const updated = await categoriesRepository.updateForTenant(ctx.tenantId, id, input);
    if (!updated) throw new NotFoundError("Category not found");
    await invalidateStorefront(ctx.tenantId);
    return updated;
  },

  async deleteCategory(ctx: TenantContext, id: string): Promise<void> {
    const deleted = await categoriesRepository.deleteForTenant(ctx.tenantId, id);
    if (deleted === 0) throw new NotFoundError("Category not found");
    await invalidateStorefront(ctx.tenantId);
  },

  async listProducts(ctx: TenantContext): Promise<Product[]> {
    return productsRepository.listForTenant(ctx.tenantId);
  },

  async getProduct(ctx: TenantContext, id: string): Promise<ProductDetail> {
    const product = await productsRepository.findDetailByIdForTenant(ctx.tenantId, id);
    if (!product) throw new NotFoundError("Product not found");
    return product;
  },

  async createProduct(
    ctx: TenantContext,
    input: {
      categoryId?: string | null;
      name: string;
      slug: string;
      description?: string | null;
      basePrice: number;
      prepTimeMinutes?: number | null;
      orderingMode?: OrderingMode;
      status?: ProductStatus;
      imageUrls?: string[];
    }
  ): Promise<ProductDetail> {
    const existing = await productsRepository.findDetailBySlugForTenant(ctx.tenantId, input.slug);
    if (existing) throw new ConflictError(`A product with slug "${input.slug}" already exists`);

    if (input.categoryId) {
      const category = await categoriesRepository.findByIdForTenant(ctx.tenantId, input.categoryId);
      if (!category) throw new NotFoundError("Category not found");
    }

    const product = await productsRepository.create(ctx.tenantId, {
      categoryId: input.categoryId ?? null,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      basePrice: input.basePrice,
      prepTimeMinutes: input.prepTimeMinutes ?? null,
      orderingMode: input.orderingMode ?? "instant",
      status: input.status ?? "draft",
    });

    if (input.imageUrls) {
      await productImagesRepository.replaceForProduct(ctx.tenantId, product.id, input.imageUrls);
    }

    await invalidateStorefront(ctx.tenantId);

    const detail = await productsRepository.findDetailByIdForTenant(ctx.tenantId, product.id);
    if (!detail) throw new NotFoundError("Product not found");
    return detail;
  },

  async updateProduct(
    ctx: TenantContext,
    id: string,
    input: Partial<{
      categoryId: string | null;
      name: string;
      slug: string;
      description: string | null;
      basePrice: number;
      prepTimeMinutes: number | null;
      orderingMode: OrderingMode;
      status: ProductStatus;
      imageUrls: string[];
    }>
  ): Promise<ProductDetail> {
    const existing = await productsRepository.findByIdForTenant(ctx.tenantId, id);
    if (!existing) throw new NotFoundError("Product not found");

    if (input.slug && input.slug !== existing.slug) {
      const slugTaken = await productsRepository.findDetailBySlugForTenant(ctx.tenantId, input.slug);
      if (slugTaken) throw new ConflictError(`A product with slug "${input.slug}" already exists`);
    }

    if (input.categoryId) {
      const category = await categoriesRepository.findByIdForTenant(ctx.tenantId, input.categoryId);
      if (!category) throw new NotFoundError("Category not found");
    }

    const { imageUrls, ...productInput } = input;
    await productsRepository.updateForTenant(ctx.tenantId, id, productInput);

    if (imageUrls) {
      await productImagesRepository.replaceForProduct(ctx.tenantId, id, imageUrls);
    }

    await invalidateStorefront(ctx.tenantId);

    const detail = await productsRepository.findDetailByIdForTenant(ctx.tenantId, id);
    if (!detail) throw new NotFoundError("Product not found");
    return detail;
  },

  async deleteProduct(ctx: TenantContext, id: string): Promise<void> {
    const deleted = await productsRepository.deleteForTenant(ctx.tenantId, id);
    if (deleted === 0) throw new NotFoundError("Product not found");
    await invalidateStorefront(ctx.tenantId);
  },

  async createOptionGroup(
    ctx: TenantContext,
    productId: string,
    input: { name: string; selectionType: SelectionType; required?: boolean; position?: number }
  ): Promise<ProductOptionGroup> {
    const product = await productsRepository.findByIdForTenant(ctx.tenantId, productId);
    if (!product) throw new NotFoundError("Product not found");

    const group = await productOptionGroupsRepository.create(ctx.tenantId, {
      productId,
      name: input.name,
      selectionType: input.selectionType,
      required: input.required ?? false,
      position: input.position,
    });
    await invalidateStorefront(ctx.tenantId);
    return group;
  },

  async updateOptionGroup(
    ctx: TenantContext,
    groupId: string,
    input: Partial<{ name: string; selectionType: SelectionType; required: boolean; position: number }>
  ): Promise<ProductOptionGroup> {
    const updated = await productOptionGroupsRepository.updateForTenant(ctx.tenantId, groupId, input);
    if (!updated) throw new NotFoundError("Option group not found");
    await invalidateStorefront(ctx.tenantId);
    return updated;
  },

  async deleteOptionGroup(ctx: TenantContext, groupId: string): Promise<void> {
    const deleted = await productOptionGroupsRepository.deleteForTenant(ctx.tenantId, groupId);
    if (deleted === 0) throw new NotFoundError("Option group not found");
    await invalidateStorefront(ctx.tenantId);
  },

  async createOptionValue(
    ctx: TenantContext,
    optionGroupId: string,
    input: { label: string; priceDelta?: number; available?: boolean; position?: number }
  ): Promise<ProductOptionValue> {
    const group = await productOptionGroupsRepository.findByIdForTenant(ctx.tenantId, optionGroupId);
    if (!group) throw new NotFoundError("Option group not found");

    const value = await productOptionValuesRepository.create(ctx.tenantId, {
      optionGroupId,
      label: input.label,
      priceDelta: input.priceDelta ?? 0,
      available: input.available ?? true,
      position: input.position,
    });
    await invalidateStorefront(ctx.tenantId);
    return value;
  },

  async updateOptionValue(
    ctx: TenantContext,
    valueId: string,
    input: Partial<{ label: string; priceDelta: number; available: boolean; position: number }>
  ): Promise<ProductOptionValue> {
    const updated = await productOptionValuesRepository.updateForTenant(ctx.tenantId, valueId, input);
    if (!updated) throw new NotFoundError("Option value not found");
    await invalidateStorefront(ctx.tenantId);
    return updated;
  },

  async deleteOptionValue(ctx: TenantContext, valueId: string): Promise<void> {
    const deleted = await productOptionValuesRepository.deleteForTenant(ctx.tenantId, valueId);
    if (deleted === 0) throw new NotFoundError("Option value not found");
    await invalidateStorefront(ctx.tenantId);
  },
};
