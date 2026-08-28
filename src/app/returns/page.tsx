import Link from "next/link";
import { LegalDoc } from "@/components/layout/legal-doc";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Returns & Exchanges",
  description: "THE RARESKIN return and exchange policy.",
  path: "/returns",
});

export default function ReturnsPage() {
  return (
    <LegalDoc
      title="Returns & Exchanges"
      sections={[
        {
          h: "Window",
          body: <p>Unopened bottles in their original packaging can be returned within [X] days of delivery. [Placeholder.]</p>,
        },
        {
          h: "Opened fragrance",
          body: <p>For hygiene and safety reasons, opened Extrait de Parfum cannot be returned unless it arrived damaged or faulty.</p>,
        },
        {
          h: "Damaged or wrong item",
          body: (
            <p>
              If a bottle arrives broken, leaking or incorrect, contact us within
              [X] days with photos via{" "}
              <Link href="/contact">the contact page</Link> and we&rsquo;ll
              replace it or refund it in full.
            </p>
          ),
        },
        {
          h: "Discovery Set",
          body: <p>The Discovery Set is non-refundable once any vial is opened. The launch credit is forfeited if the set is returned.</p>,
        },
        {
          h: "Refunds",
          body: <p>Approved refunds are issued to the original payment method within [X] working days. COD orders are refunded by bank transfer. [Placeholder.]</p>,
        },
      ]}
    />
  );
}
