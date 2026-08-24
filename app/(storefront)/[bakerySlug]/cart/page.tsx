import CartPageContent from "@/src/components/storefront/CartPageContent";

export default async function CartPage({ params }: { params: Promise<{ bakerySlug: string }> }) {
  const { bakerySlug } = await params;
  return <CartPageContent bakerySlug={bakerySlug} />;
}
