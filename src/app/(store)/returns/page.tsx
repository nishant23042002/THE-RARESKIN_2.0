import { LegalDoc } from "@/components/layout/legal-doc";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Returns & Exchanges",
  description:
    "THE RARESKIN return and refund policy: unopened bottles within 7 days, free replacement for damaged or wrong items, and how the Discovery Set credit works.",
  path: "/returns",
});

export default function ReturnsPage() {
  return (
    <LegalDoc
      title="Returns & Exchanges"
      path="/returns"
      updated="August 2026"
      intro={
        <p>
          Fragrance is a personal-care product, so our return rules are stricter
          than for ordinary goods — mainly around hygiene and safety. If
          something is wrong with your order, we&rsquo;ll always make it right.
        </p>
      }
      sections={[
        {
          h: "Unopened bottles",
          body: (
            <p>
              An unopened bottle, with its cellophane and box seal intact, can be
              returned within <strong>7 days of delivery</strong> for a refund.
              The bottle and all packaging must be in original, resaleable
              condition. Return shipping for a change of mind is at your cost;
              we&rsquo;ll share a prepaid label and deduct a flat handling fee
              from the refund.
            </p>
          ),
        },
        {
          h: "Opened bottles",
          body: (
            <p>
              For hygiene and safety, opened Extrait de Parfum{" "}
              <strong>cannot be returned or exchanged</strong> unless it arrived
              damaged, faulty, or was the wrong item. A fragrance smelling
              different from what you expected is not a fault — scent is
              subjective, and this is why we offer the Discovery Set.
            </p>
          ),
        },
        {
          h: "Damaged, leaking, faulty or wrong item",
          body: (
            <p>
              Report it within <strong>48 hours of delivery</strong> by email
              with photos of the product and the packaging. We&rsquo;ll arrange a
              free replacement or a full refund, including any shipping you paid.
              No need to send anything back unless we ask.
            </p>
          ),
        },
        {
          h: "The Discovery Set",
          body: (
            <p>
              The Discovery Set is non-refundable once any vial is opened, since
              all three have been sampled. If it is returned unopened within 7
              days, the launch credit toward a first 50 ml bottle is forfeited.
            </p>
          ),
        },
        {
          h: "How to start a return",
          body: (
            <p>
              Email <a href="/contact">our support team</a> with your order
              number and the reason. We&rsquo;ll reply within one working day
              with the next steps. Please don&rsquo;t ship anything back before
              we&rsquo;ve confirmed the return.
            </p>
          ),
        },
        {
          h: "Refunds",
          body: (
            <>
              <p>
                Once we receive and inspect an eligible return, or approve a
                claim, refunds are issued within <strong>5–7 working days</strong>
                :
              </p>
              <ul>
                <li>Prepaid orders: back to the original payment method.</li>
                <li>
                  Cash-on-delivery orders: by UPI or bank transfer to details you
                  provide.
                </li>
              </ul>
              <p>
                Your bank may take a few additional days to post the credit.
              </p>
            </>
          ),
        },
        {
          h: "Exchanges",
          body: (
            <p>
              We don&rsquo;t do direct swaps. To move to a different scent,
              return the unopened bottle under the policy above and place a new
              order.
            </p>
          ),
        },
        {
          h: "Order cancellation",
          body: (
            <p>
              If your order hasn&rsquo;t been dispatched yet, contact us and
              we&rsquo;ll cancel it and refund you in full. Once it has left us it
              can&rsquo;t be recalled, but you can refuse delivery or use the
              return process.
            </p>
          ),
        },
        {
          h: "Non-returnable",
          body: (
            <p>
              Opened bottles (except where faulty), items without their original
              packaging or seal, and anything bought in a clearance sale — unless
              faulty — cannot be returned.
            </p>
          ),
        },
      ]}
    />
  );
}
