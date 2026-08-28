import { LegalDoc } from "@/components/layout/legal-doc";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Terms of Service",
  description: "The terms for using THE RARESKIN store.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalDoc
      title="Terms of Service"
      sections={[
        {
          h: "The store",
          body: <p>This site sells Extrait de Parfum by THE RARESKIN. Using it means you accept these terms. [Placeholder — legal entity name, registered address, GST details.]</p>,
        },
        {
          h: "Orders",
          body: <p>An order is an offer to buy. We confirm by email once it&rsquo;s accepted and dispatched. We may decline or cancel an order — for example if an item is mispriced or out of stock — and will refund any payment in full.</p>,
        },
        {
          h: "Pricing",
          body: <p>Prices are in Indian Rupees and inclusive of applicable taxes. Launch pricing and the Discovery Set credit are limited-time offers and may change or end without notice.</p>,
        },
        {
          h: "Use of the product",
          body: <p>For external use only. Discontinue if irritation occurs. Keep away from eyes, flames and children. THE RARESKIN is not liable for misuse.</p>,
        },
        {
          h: "Content",
          body: <p>All text, imagery and the mark are the property of THE RARESKIN and may not be reused without permission.</p>,
        },
        {
          h: "Governing law",
          body: <p>These terms are governed by the laws of India. [Placeholder — jurisdiction, dispute resolution.]</p>,
        },
      ]}
    />
  );
}
