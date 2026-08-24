import CategoryManager from "@/src/components/dashboard/CategoryManager";
import { toTenantContext } from "@/src/lib/tenant-context";
import { requireBaker } from "@/src/modules/auth/auth.service";
import { productsService } from "@/src/modules/products/products.service";

export default async function CategoriesPage() {
  const ctx = toTenantContext(await requireBaker());
  const categories = await productsService.listCategories(ctx);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Categories</h1>
      <CategoryManager initialCategories={categories} />
    </div>
  );
}
