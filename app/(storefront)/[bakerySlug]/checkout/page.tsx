import CheckoutForm from "@/src/components/storefront/CheckoutForm";

export default async function CheckoutPage({ params }: { params: Promise<{ bakerySlug: string }> }) {
  const { bakerySlug } = await params;
  return <CheckoutForm bakerySlug={bakerySlug} />;
}
