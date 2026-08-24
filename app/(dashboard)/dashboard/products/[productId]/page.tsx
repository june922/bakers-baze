import { notFound } from "next/navigation";
import DeleteEntityButton from "@/src/components/dashboard/DeleteEntityButton";
import OptionGroupsManager from "@/src/components/dashboard/OptionGroupsManager";
import ProductForm from "@/src/components/dashboard/ProductForm";
import { NotFoundError } from "@/src/lib/errors";
import { toTenantContext } from "@/src/lib/tenant-context";
import { requireBaker } from "@/src/modules/auth/auth.service";
import { productsService } from "@/src/modules/products/products.service";

interface PageParams {
  params: Promise<{ productId: string }>;
}

export default async function EditProductPage({ params }: PageParams) {
  const { productId } = await params;
  const ctx = toTenantContext(await requireBaker());

  let product;
  try {
    product = await productsService.getProduct(ctx, productId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const categories = await productsService.listCategories(ctx);

  return (
    <div className="flex max-w-xl flex-col gap-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit product</h1>
        <DeleteEntityButton
          action={`/api/dashboard/products/${product.id}`}
          confirmMessage={`Delete product "${product.name}"? This cannot be undone.`}
          redirectTo="/dashboard/products"
          label="Delete product"
        />
      </div>

      <ProductForm mode="edit" product={product} categories={categories} />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Option groups</h2>
        <p className="text-sm text-zinc-500">
          Let customers customize this product — e.g. Size, Flavour, Filling — each with its own price adjustment.
        </p>
        <OptionGroupsManager productId={product.id} initialGroups={product.optionGroups} />
      </div>
    </div>
  );
}
