import ProductForm from "@/src/components/dashboard/ProductForm";
import { toTenantContext } from "@/src/lib/tenant-context";
import { requireBaker } from "@/src/modules/auth/auth.service";
import { productsService } from "@/src/modules/products/products.service";

export default async function NewProductPage() {
  const ctx = toTenantContext(await requireBaker());
  const categories = await productsService.listCategories(ctx);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">New product</h1>
      <ProductForm mode="create" categories={categories} />
    </div>
  );
}
