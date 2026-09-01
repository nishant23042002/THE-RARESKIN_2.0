import { LegalDoc } from "@/components/layout/legal-doc";
import { pageMeta } from "@/lib/seo";
import { CONTACT } from "@/lib/site";

export const metadata = pageMeta({
  title: "Terms of Service",
  description:
    "The terms for buying THE RARESKIN Extrait de Parfum: orders, pricing, payment, product use and safety, intellectual property, liability and governing law.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalDoc
      title="Terms of Service"
      path="/terms"
      updated="August 2026"
      intro={
        <p>
          These terms govern your use of this website and any purchase of THE
          RARESKIN products. The store is operated by Velocity Ventures Group
          (&ldquo;THE RARESKIN&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;),{" "}
          {CONTACT.address}. By browsing the site or placing an order, you accept
          these terms.
        </p>
      }
      sections={[
        {
          h: "Who can order",
          body: (
            <p>
              You must be at least 18 years old, or have the consent of a parent
              or guardian, and be legally able to enter a contract under Indian
              law. Orders are for personal use, not for resale, unless we have
              agreed otherwise in writing.
            </p>
          ),
        },
        {
          h: "Products and descriptions",
          body: (
            <p>
              We describe each fragrance as accurately as we can. Notes,
              character and longevity are indicative — perfume is made with
              natural and synthetic materials whose behaviour varies with skin,
              climate and batch, and colours may appear slightly different on
              your screen. Nothing on the site is a guarantee of a specific
              performance or result.
            </p>
          ),
        },
        {
          h: "Pricing",
          body: (
            <p>
              All prices are in Indian Rupees and include applicable taxes.
              Launch pricing and the Discovery Set credit are limited-time offers
              and may be changed or withdrawn at any time; changes do not affect
              orders already confirmed. If a product is listed at an obviously
              incorrect price, we may cancel the affected order and refund you in
              full, whether or not it has been dispatched.
            </p>
          ),
        },
        {
          h: "Orders and acceptance",
          body: (
            <p>
              Your order is an offer to buy. A binding contract forms only when
              we dispatch the order and send you a confirmation email. Until
              then, we may decline or limit an order — for example if the item is
              out of stock, the delivery address is not serviceable, payment is
              not authorised, or we reasonably suspect fraud or misuse. If we
              cancel a paid order, you get a full refund.
            </p>
          ),
        },
        {
          h: "Payment",
          body: (
            <p>
              Payment is taken through Razorpay by card, UPI, or cash on delivery
              where available. You confirm that any payment method you use is
              yours and has sufficient funds or limit. We do not store your card
              or UPI credentials.
            </p>
          ),
        },
        {
          h: "Shipping, returns and refunds",
          body: (
            <p>
              Delivery, returns, cancellations and refunds are governed by our{" "}
              <a href="/shipping">Shipping Policy</a> and{" "}
              <a href="/returns">Returns &amp; Exchanges</a> policy, which form
              part of these terms.
            </p>
          ),
        },
        {
          h: "Using the fragrance safely",
          body: (
            <ul>
              <li>For external use only. Do not ingest.</li>
              <li>
                Spray onto skin or clothing from a distance; do a small patch
                test first if you have sensitive skin, and stop use if irritation
                occurs.
              </li>
              <li>
                Keep away from the eyes, open flame and direct heat. Alcohol-based
                perfume is flammable.
              </li>
              <li>Keep out of reach of children.</li>
              <li>
                Store capped, away from sunlight and heat, and use within a
                reasonable time of opening.
              </li>
            </ul>
          ),
        },
        {
          h: "Intellectual property",
          body: (
            <p>
              The name THE RARESKIN, the crossbar-less mark, and all text,
              imagery, layout and design on this site belong to Velocity Ventures
              Group. You may not copy, reproduce, or use them for any commercial
              purpose without our written permission.
            </p>
          ),
        },
        {
          h: "Reviews and submitted content",
          body: (
            <p>
              If you submit a review or other content, it must be your own honest
              experience and must not be unlawful, misleading or infringing. You
              grant us a non-exclusive, royalty-free licence to display, edit for
              length, and use that content in connection with the brand. We may
              decline or remove any submission.
            </p>
          ),
        },
        {
          h: "Liability",
          body: (
            <p>
              We stand behind our products, but to the fullest extent permitted
              by law our total liability for any order is limited to the amount
              you paid for it. We are not liable for indirect or consequential
              loss, or for reactions arising from use contrary to the guidance
              above or from an allergy you were aware of. Nothing in these terms
              limits rights you have under the Consumer Protection Act, 2019 that
              cannot be excluded.
            </p>
          ),
        },
        {
          h: "Events outside our control",
          body: (
            <p>
              We are not responsible for delays or failures caused by events
              beyond our reasonable control, including courier disruption,
              natural events, strikes, or government action. We will let you know
              and, where an order cannot be fulfilled, refund you.
            </p>
          ),
        },
        {
          h: "Governing law and disputes",
          body: (
            <p>
              These terms are governed by the laws of India. Subject to any
              consumer-law right you have to bring proceedings elsewhere, the
              courts at Raigad, Maharashtra have jurisdiction. Please contact us
              first — most issues are resolved quickly by email.
            </p>
          ),
        },
        {
          h: "Grievances",
          body: (
            <p>
              For complaints under the Consumer Protection (E-Commerce) Rules,
              2020, contact us at{" "}
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> or{" "}
              {CONTACT.phone}. We acknowledge grievances within 48 hours and aim
              to resolve them within a reasonable time.
            </p>
          ),
        },
        {
          h: "Changes to these terms",
          body: (
            <p>
              We may update these terms from time to time. The version in force
              is the one published here on the date of your order.
            </p>
          ),
        },
      ]}
    />
  );
}
