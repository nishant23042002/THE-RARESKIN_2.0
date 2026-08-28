import { LegalDoc } from "@/components/layout/legal-doc";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Privacy Policy",
  description: "How THE RARESKIN handles your data.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Privacy Policy"
      sections={[
        {
          h: "What we collect",
          body: <p>Name, contact details, delivery address and order history when you buy or sign up. Payment is handled by our payment partner; we do not store card details. [Placeholder — analytics, cookies.]</p>,
        },
        {
          h: "How we use it",
          body: <p>To fulfil and support orders, to send the newsletter you asked for, and to improve the store. We do not sell your data.</p>,
        },
        {
          h: "Sharing",
          body: <p>Shared only with the parties needed to run the store — courier, payment processor, email provider — and where the law requires it. [Placeholder — named sub-processors.]</p>,
        },
        {
          h: "Your choices",
          body: <p>You can unsubscribe from the newsletter at any time, and request a copy or deletion of your data by email. [Placeholder — retention periods, grievance officer per Indian law.]</p>,
        },
        {
          h: "Contact",
          body: <p>Questions about your data: hello@therareskin.com [placeholder].</p>,
        },
      ]}
    />
  );
}
