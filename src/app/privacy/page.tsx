import { LegalDoc } from "@/components/layout/legal-doc";
import { pageMeta } from "@/lib/seo";
import { CONTACT } from "@/lib/site";

export const metadata = pageMeta({
  title: "Privacy Policy",
  description:
    "How THE RARESKIN collects, uses and protects your personal data, your rights under India's Digital Personal Data Protection Act, and how to reach our grievance officer.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Privacy Policy"
      path="/privacy"
      updated="August 2026"
      intro={
        <>
          <p>
            This policy explains what personal data THE RARESKIN collects when
            you visit the site or place an order, why we collect it, and the
            control you have over it. It is written to align with India&rsquo;s
            Digital Personal Data Protection Act, 2023 and the Information
            Technology Act, 2000.
          </p>
          <p>
            The data fiduciary is Velocity Ventures Group (&ldquo;THE
            RARESKIN&rdquo;, &ldquo;we&rdquo;), {CONTACT.address}.
          </p>
        </>
      }
      sections={[
        {
          h: "Data we collect",
          body: (
            <ul>
              <li>
                <strong>Identity and contact:</strong> name, email address, phone
                number, and billing and delivery addresses.
              </li>
              <li>
                <strong>Order and transaction data:</strong> the products you
                buy, order value, payment method and status. Card and UPI
                credentials are entered on our payment partner&rsquo;s secure
                page — we never see or store them.
              </li>
              <li>
                <strong>Communications:</strong> messages you send us and our
                replies, and your newsletter subscription status.
              </li>
              <li>
                <strong>Technical and usage data:</strong> IP address, device and
                browser type, and pages viewed, collected through cookies and
                analytics to keep the store working and improve it.
              </li>
            </ul>
          ),
        },
        {
          h: "Why we use it",
          body: (
            <ul>
              <li>To process, pack, ship and support your orders.</li>
              <li>
                To send the newsletter, only if you have asked for it, and to
                answer your messages.
              </li>
              <li>
                To detect and prevent fraud, abuse and payment disputes.
              </li>
              <li>
                To meet legal, tax and accounting obligations (for example,
                retaining invoices).
              </li>
              <li>
                To understand how the store is used and make it better. We do not
                use your data for automated decisions that significantly affect
                you.
              </li>
            </ul>
          ),
        },
        {
          h: "Payment processing",
          body: (
            <p>
              Payments are handled by Razorpay Software Private Limited. When you
              pay, you are on Razorpay&rsquo;s PCI-DSS compliant environment; we
              receive only a confirmation of success or failure and a
              non-sensitive reference. Razorpay&rsquo;s own privacy policy governs
              that step.
            </p>
          ),
        },
        {
          h: "Who we share data with",
          body: (
            <>
              <p>
                We share the minimum data needed with service providers who act
                on our instructions:
              </p>
              <ul>
                <li>Courier and logistics partners, to deliver your order.</li>
                <li>Razorpay, to take and reconcile payment.</li>
                <li>
                  Email and communications providers, to send order updates and
                  the newsletter.
                </li>
                <li>Analytics providers, to measure site usage.</li>
              </ul>
              <p>
                We also disclose data where the law requires it. We do not sell
                your personal data, and we do not share it for third-party
                advertising.
              </p>
            </>
          ),
        },
        {
          h: "Cookies",
          body: (
            <p>
              We use essential cookies that make checkout and your bag work, and
              analytics cookies that help us understand traffic. You can block or
              delete cookies in your browser settings; essential functions may
              stop working if you do.
            </p>
          ),
        },
        {
          h: "How long we keep it",
          body: (
            <p>
              We keep account and order data for as long as your relationship
              with us is active, and afterwards only as long as needed to meet
              legal, tax and dispute-resolution requirements — invoices and
              transaction records are retained for up to eight years as required
              under Indian tax law. Newsletter data is kept until you
              unsubscribe.
            </p>
          ),
        },
        {
          h: "Your rights",
          body: (
            <>
              <p>Subject to law, you can ask us to:</p>
              <ul>
                <li>confirm what data of yours we hold and give you a copy;</li>
                <li>correct or update inaccurate data;</li>
                <li>
                  erase data that is no longer needed, where we are not required
                  to keep it;
                </li>
                <li>
                  withdraw consent for anything based on consent, such as the
                  newsletter.
                </li>
              </ul>
              <p>
                To exercise a right, email{" "}
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> from the
                address on your account. We respond within the timelines set by
                law.
              </p>
            </>
          ),
        },
        {
          h: "Children",
          body: (
            <p>
              The store is intended for people aged 18 and over. We do not
              knowingly collect data from children. If you believe a child has
              given us data, contact us and we will delete it.
            </p>
          ),
        },
        {
          h: "Security",
          body: (
            <p>
              We use reasonable technical and organisational safeguards — HTTPS
              across the site, access controls, and vetted processors. No method
              of transmission or storage is completely secure; if a breach
              affects your data, we will notify you and the Data Protection Board
              as required.
            </p>
          ),
        },
        {
          h: "Grievance officer",
          body: (
            <p>
              For privacy questions or complaints, contact our grievance officer
              at <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> or{" "}
              {CONTACT.phone}. If you are not satisfied with our response, you may
              approach the Data Protection Board of India.
            </p>
          ),
        },
        {
          h: "Changes to this policy",
          body: (
            <p>
              We may update this policy as our practices or the law change. The
              &ldquo;last updated&rdquo; date above always reflects the current
              version; significant changes will be flagged on the site.
            </p>
          ),
        },
      ]}
    />
  );
}
