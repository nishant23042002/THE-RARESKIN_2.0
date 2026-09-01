import { LegalDoc } from "@/components/layout/legal-doc";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Shipping Policy",
  description:
    "How THE RARESKIN ships Extrait de Parfum across India: free shipping, dispatch in 24–48 hours, delivery estimates, tracking and cash on delivery.",
  path: "/shipping",
});

export default function ShippingPage() {
  return (
    <LegalDoc
      title="Shipping Policy"
      path="/shipping"
      updated="August 2026"
      intro={
        <p>
          THE RARESKIN is sold and shipped by Velocity Ventures Group from Roha,
          District Raigad, Maharashtra. This page explains where we deliver, how
          long it takes, and what shipping costs.
        </p>
      }
      sections={[
        {
          h: "Where we ship",
          body: (
            <p>
              We ship across India only. International shipping is not available
              yet. Perfume is classified as a flammable liquid, so a small number
              of remote or restricted pincodes may not be serviceable by our
              courier partners — you&rsquo;ll be told at checkout if yours is one
              of them.
            </p>
          ),
        },
        {
          h: "Shipping charges",
          body: (
            <p>
              Shipping is <strong>free on every order across India</strong>{" "}
              during launch. Prices shown on the site are all-inclusive; there is
              no separate handling or fuel surcharge.
            </p>
          ),
        },
        {
          h: "Dispatch time",
          body: (
            <p>
              Prepaid orders are dispatched within{" "}
              <strong>24–48 working hours</strong> of payment confirmation.
              Cash-on-delivery orders are dispatched within 24–48 working hours
              of order confirmation. Orders placed on a Sunday or public holiday
              are processed the next working day.
            </p>
          ),
        },
        {
          h: "Delivery estimates",
          body: (
            <>
              <p>
                Once dispatched, typical delivery times are:
              </p>
              <ul>
                <li>Metro cities: 2–4 working days</li>
                <li>Other cities and towns: 4–7 working days</li>
                <li>Remote and rural pincodes: 6–10 working days</li>
              </ul>
              <p>
                These are courier estimates, not guarantees. Festivals, weather,
                and courier network disruptions can extend them.
              </p>
            </>
          ),
        },
        {
          h: "Tracking",
          body: (
            <p>
              Every order ships with a tracking number, sent to you by email and
              SMS as soon as the parcel leaves us. If you haven&rsquo;t received
              tracking within three working days of ordering, contact us with
              your order number.
            </p>
          ),
        },
        {
          h: "Cash on delivery",
          body: (
            <p>
              COD is available on serviceable pincodes and is confirmed at
              checkout. Please keep the exact amount ready — couriers may not
              carry change. Repeatedly refused COD parcels may lead to COD being
              disabled for that address on future orders.
            </p>
          ),
        },
        {
          h: "Address accuracy and failed delivery",
          body: (
            <p>
              Please enter a complete, correct address and a reachable phone
              number. Couriers usually attempt delivery two to three times. If a
              parcel is returned to us because the address was wrong,
              unreachable, or repeatedly unavailable, we will refund the product
              value; for prepaid orders a re-shipping fee may apply if you want
              it sent again.
            </p>
          ),
        },
        {
          h: "Damaged or missing parcels",
          body: (
            <p>
              If your parcel arrives visibly damaged, photograph it before
              opening and contact us within 48 hours. For parcels marked
              delivered but not received, tell us within 48 hours so we can raise
              a claim with the courier. See our{" "}
              <a href="/returns">Returns &amp; Exchanges</a> policy for what
              happens next.
            </p>
          ),
        },
      ]}
    />
  );
}
