import { LegalDoc } from "@/components/layout/legal-doc";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Shipping",
  description: "How THE RARESKIN ships across India.",
  path: "/shipping",
});

export default function ShippingPage() {
  return (
    <LegalDoc
      title="Shipping"
      sections={[
        {
          h: "Where we ship",
          body: <p>Across India. International shipping is not available yet. [Placeholder — regions, serviceable pincodes, restricted areas.]</p>,
        },
        {
          h: "Dispatch & delivery",
          body: (
            <p>
              Orders are dispatched within 24–48 hours of confirmation.
              Estimated delivery is [X–Y] working days depending on location.
              Tracking is shared by email and SMS once the parcel leaves us.
            </p>
          ),
        },
        {
          h: "Charges",
          body: <p>Shipping is free on all orders during launch. [Placeholder — thresholds, express options, COD handling fee if any.]</p>,
        },
        {
          h: "Cash on delivery",
          body: <p>COD is available on eligible pincodes. Please keep the exact amount ready. [Placeholder — COD limits, verification.]</p>,
        },
        {
          h: "Delays",
          body: <p>Public holidays, weather and courier disruptions can extend delivery windows. We&rsquo;ll keep you updated if an order is affected.</p>,
        },
      ]}
    />
  );
}
