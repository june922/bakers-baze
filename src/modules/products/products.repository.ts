import db from "@/src/lib/db";
import type {
  Category,
  OrderingMode,
  Product,
  ProductDetail,
  ProductImage,
  ProductOptionGroup,
  ProductOptionValue,
  ProductStatus,
  ProductSummary,
  SelectionType,
} from "./products.types";

interface CategoryRow {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  position: number;
  created_at: Date;
  updated_at: Date;
}

interface ProductRow {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  prep_time_minutes: number | null;
  ordering_mode: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

interface ProductImageRow {
  id: string;
  tenant_id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  position: number;
}

interface ProductOptionGroupRow {
  id: string;
  tenant_id: string;
  product_id: string;
  name: string;
  selection_type: string;
  required: boolean;
  position: number;
}

interface ProductOptionValueRow {
  id: string;
  tenant_id: string;
  option_group_id: string;
  label: string;
  price_delta: number;
  available: boolean;
  position: number;
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    slug: row.slug,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    categoryId: row.category_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    basePrice: row.base_price,
    prepTimeMinutes: row.prep_time_minutes,
    orderingMode: row.ordering_mode as OrderingMode,
    status: row.status as ProductStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toProductImage(row: ProductImageRow): ProductImage {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    productId: row.product_id,
    url: row.url,
    altText: row.alt_text,
    position: row.position,
  };
}

function toOptionValue(row: ProductOptionValueRow): ProductOptionValue {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    optionGroupId: row.option_group_id,
    label: row.label,
    priceDelta: row.price_delta,
    available: row.available,
    position: row.position,
  };
}

function toOptionGroup(row: ProductOptionGroupRow, values: ProductOptionValue[]): ProductOptionGroup {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    productId: row.product_id,
    name: row.name,
    selectionType: row.selection_type as SelectionType,
    required: row.required,
    position: row.position,
    values,
  };
}

export const categoriesRepository = {
  async list(tenantId: string): Promise<Category[]> {
    const rows = await db<CategoryRow>("categories")
      .where({ tenant_id: tenantId })
      .orderBy("position", "asc");
    return rows.map(toCategory);
  },

  async findByIdForTenant(tenantId: string, id: string): Promise<Category | undefined> {
    const row = await db<CategoryRow>("categories").where({ id, tenant_id: tenantId }).first();
    return row ? toCategory(row) : undefined;
  },

  async findBySlugForTenant(tenantId: string, slug: string): Promise<Category | undefined> {
    const row = await db<CategoryRow>("categories").where({ slug, tenant_id: tenantId }).first();
    return row ? toCategory(row) : undefined;
  },

  async create(tenantId: string, input: { name: string; slug: string; position?: number }): Promise<Category> {
    const [row] = await db<CategoryRow>("categories")
      .insert({ tenant_id: tenantId, name: input.name, slug: input.slug, position: input.position ?? 0 })
      .returning("*");
    return toCategory(row);
  },

  async updateForTenant(
    tenantId: string,
    id: string,
    input: Partial<{ name: string; slug: string; position: number }>
  ): Promise<Category | undefined> {
    const [row] = await db<CategoryRow>("categories")
      .where({ id, tenant_id: tenantId })
      .update({ ...input, updated_at: db.fn.now() })
      .returning("*");
    return row ? toCategory(row) : undefined;
  },

  async deleteForTenant(tenantId: string, id: string): Promise<number> {
    return db("categories").where({ id, tenant_id: tenantId }).delete();
  },
};

export const productsRepository = {
  async listForTenant(tenantId: string): Promise<Product[]> {
    const rows = await db<ProductRow>("products")
      .where({ tenant_id: tenantId })
      .orderBy("created_at", "desc");
    return rows.map(toProduct);
  },

  async listPublishedForTenant(tenantId: string): Promise<ProductSummary[]> {
    const rows = await db<ProductRow>("products")
      .where({ tenant_id: tenantId, status: "published" })
      .orderBy("created_at", "desc");

    const productIds = rows.map((row) => row.id);
    const primaryImages = productIds.length
      ? await db<ProductImageRow>("product_images")
          .where({ tenant_id: tenantId })
          .whereIn("product_id", productIds)
          .orderBy("position", "asc")
      : [];

    const firstImageByProduct = new Map<string, string>();
    for (const image of primaryImages) {
      if (!firstImageByProduct.has(image.product_id)) {
        firstImageByProduct.set(image.product_id, image.url);
      }
    }

    return rows.map((row) => ({
      ...toProduct(row),
      primaryImageUrl: firstImageByProduct.get(row.id) ?? null,
    }));
  },

  async findByIdForTenant(tenantId: string, id: string): Promise<Product | undefined> {
    const row = await db<ProductRow>("products").where({ id, tenant_id: tenantId }).first();
    return row ? toProduct(row) : undefined;
  },

  async findDetailBySlugForTenant(
    tenantId: string,
    slug: string,
    options?: { publishedOnly?: boolean }
  ): Promise<ProductDetail | undefined> {
    const query = db<ProductRow>("products").where({ slug, tenant_id: tenantId });
    if (options?.publishedOnly) {
      query.andWhere({ status: "published" });
    }
    const row = await query.first();
    if (!row) return undefined;
    return hydrateProductDetail(tenantId, row);
  },

  async findDetailByIdForTenant(tenantId: string, id: string): Promise<ProductDetail | undefined> {
    const row = await db<ProductRow>("products").where({ id, tenant_id: tenantId }).first();
    if (!row) return undefined;
    return hydrateProductDetail(tenantId, row);
  },

  async create(
    tenantId: string,
    input: {
      categoryId: string | null;
      name: string;
      slug: string;
      description: string | null;
      basePrice: number;
      prepTimeMinutes: number | null;
      orderingMode: OrderingMode;
      status: ProductStatus;
    }
  ): Promise<Product> {
    const [row] = await db<ProductRow>("products")
      .insert({
        tenant_id: tenantId,
        category_id: input.categoryId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        base_price: input.basePrice,
        prep_time_minutes: input.prepTimeMinutes,
        ordering_mode: input.orderingMode,
        status: input.status,
      })
      .returning("*");
    return toProduct(row);
  },

  async updateForTenant(
    tenantId: string,
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
    }>
  ): Promise<Product | undefined> {
    const patch: Record<string, unknown> = { updated_at: db.fn.now() };
    if (input.categoryId !== undefined) patch.category_id = input.categoryId;
    if (input.name !== undefined) patch.name = input.name;
    if (input.slug !== undefined) patch.slug = input.slug;
    if (input.description !== undefined) patch.description = input.description;
    if (input.basePrice !== undefined) patch.base_price = input.basePrice;
    if (input.prepTimeMinutes !== undefined) patch.prep_time_minutes = input.prepTimeMinutes;
    if (input.orderingMode !== undefined) patch.ordering_mode = input.orderingMode;
    if (input.status !== undefined) patch.status = input.status;

    const [row] = await db<ProductRow>("products").where({ id, tenant_id: tenantId }).update(patch).returning("*");
    return row ? toProduct(row) : undefined;
  },

  async deleteForTenant(tenantId: string, id: string): Promise<number> {
    return db("products").where({ id, tenant_id: tenantId }).delete();
  },
};

export const productImagesRepository = {
  async listForProduct(tenantId: string, productId: string): Promise<ProductImage[]> {
    const rows = await db<ProductImageRow>("product_images")
      .where({ tenant_id: tenantId, product_id: productId })
      .orderBy("position", "asc");
    return rows.map(toProductImage);
  },

  async replaceForProduct(tenantId: string, productId: string, urls: string[]): Promise<void> {
    await db.transaction(async (trx) => {
      await trx("product_images").where({ tenant_id: tenantId, product_id: productId }).delete();
      if (urls.length > 0) {
        await trx("product_images").insert(
          urls.map((url, index) => ({
            tenant_id: tenantId,
            product_id: productId,
            url,
            position: index,
          }))
        );
      }
    });
  },
};

export const productOptionGroupsRepository = {
  async listForProduct(tenantId: string, productId: string): Promise<ProductOptionGroup[]> {
    const rows = await db<ProductOptionGroupRow>("product_option_groups")
      .where({ tenant_id: tenantId, product_id: productId })
      .orderBy("position", "asc");
    return rows.map((row) => toOptionGroup(row, []));
  },

  async findByIdForTenant(tenantId: string, id: string): Promise<ProductOptionGroup | undefined> {
    const row = await db<ProductOptionGroupRow>("product_option_groups").where({ id, tenant_id: tenantId }).first();
    return row ? toOptionGroup(row, []) : undefined;
  },

  async create(
    tenantId: string,
    input: { productId: string; name: string; selectionType: SelectionType; required: boolean; position?: number }
  ): Promise<ProductOptionGroup> {
    const [row] = await db<ProductOptionGroupRow>("product_option_groups")
      .insert({
        tenant_id: tenantId,
        product_id: input.productId,
        name: input.name,
        selection_type: input.selectionType,
        required: input.required,
        position: input.position ?? 0,
      })
      .returning("*");
    return toOptionGroup(row, []);
  },

  async updateForTenant(
    tenantId: string,
    id: string,
    input: Partial<{ name: string; selectionType: SelectionType; required: boolean; position: number }>
  ): Promise<ProductOptionGroup | undefined> {
    const patch: Record<string, unknown> = { updated_at: db.fn.now() };
    if (input.name !== undefined) patch.name = input.name;
    if (input.selectionType !== undefined) patch.selection_type = input.selectionType;
    if (input.required !== undefined) patch.required = input.required;
    if (input.position !== undefined) patch.position = input.position;

    const [row] = await db<ProductOptionGroupRow>("product_option_groups")
      .where({ id, tenant_id: tenantId })
      .update(patch)
      .returning("*");
    return row ? toOptionGroup(row, []) : undefined;
  },

  async deleteForTenant(tenantId: string, id: string): Promise<number> {
    return db("product_option_groups").where({ id, tenant_id: tenantId }).delete();
  },
};

export const productOptionValuesRepository = {
  async listForGroup(tenantId: string, optionGroupId: string): Promise<ProductOptionValue[]> {
    const rows = await db<ProductOptionValueRow>("product_option_values")
      .where({ tenant_id: tenantId, option_group_id: optionGroupId })
      .orderBy("position", "asc");
    return rows.map(toOptionValue);
  },

  async findByIdForTenant(tenantId: string, id: string): Promise<ProductOptionValue | undefined> {
    const row = await db<ProductOptionValueRow>("product_option_values").where({ id, tenant_id: tenantId }).first();
    return row ? toOptionValue(row) : undefined;
  },

  async create(
    tenantId: string,
    input: { optionGroupId: string; label: string; priceDelta: number; available: boolean; position?: number }
  ): Promise<ProductOptionValue> {
    const [row] = await db<ProductOptionValueRow>("product_option_values")
      .insert({
        tenant_id: tenantId,
        option_group_id: input.optionGroupId,
        label: input.label,
        price_delta: input.priceDelta,
        available: input.available,
        position: input.position ?? 0,
      })
      .returning("*");
    return toOptionValue(row);
  },

  async updateForTenant(
    tenantId: string,
    id: string,
    input: Partial<{ label: string; priceDelta: number; available: boolean; position: number }>
  ): Promise<ProductOptionValue | undefined> {
    const patch: Record<string, unknown> = { updated_at: db.fn.now() };
    if (input.label !== undefined) patch.label = input.label;
    if (input.priceDelta !== undefined) patch.price_delta = input.priceDelta;
    if (input.available !== undefined) patch.available = input.available;
    if (input.position !== undefined) patch.position = input.position;

    const [row] = await db<ProductOptionValueRow>("product_option_values")
      .where({ id, tenant_id: tenantId })
      .update(patch)
      .returning("*");
    return row ? toOptionValue(row) : undefined;
  },

  async deleteForTenant(tenantId: string, id: string): Promise<number> {
    return db("product_option_values").where({ id, tenant_id: tenantId }).delete();
  },
};

async function hydrateProductDetail(tenantId: string, row: ProductRow): Promise<ProductDetail> {
  const [images, groups] = await Promise.all([
    productImagesRepository.listForProduct(tenantId, row.id),
    productOptionGroupsRepository.listForProduct(tenantId, row.id),
  ]);

  const valuesByGroup = await Promise.all(
    groups.map((group) => productOptionValuesRepository.listForGroup(tenantId, group.id))
  );

  const optionGroups = groups.map((group, index) => ({ ...group, values: valuesByGroup[index] }));

  return { ...toProduct(row), images, optionGroups };
}
