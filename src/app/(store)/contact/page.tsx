import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Icon, type IconName } from "@/components/ui/icon";
import { PageIntro } from "@/components/layout/page-intro";
import { ContactForm } from "@/components/contact/contact-form";
import { pageMeta } from "@/lib/seo";
import { CONTACT } from "@/lib/site";

export const metadata = pageMeta({
  title: "Contact",
  description:
    "Reach THE RARESKIN support about an order, a fragrance, or anything else. Email, phone and registered address.",
  path: "/contact",
});

const CHANNELS: {
  label: string;
  icon: IconName;
  value: string;
  href: string;
  external?: boolean;
  note: string;
}[] = [
  {
    label: "Email",
    icon: "mail",
    value: CONTACT.email,
    href: `mailto:${CONTACT.email}`,
    note: "Fastest for order questions",
  },
  {
    label: "Phone",
    icon: "phone",
    value: CONTACT.phone,
    href: `tel:${CONTACT.phoneHref}`,
    note: "Mon–Sat, working hours (IST)",
  },
  {
    label: "Visit / write",
    icon: "pin",
    value: CONTACT.address,
    href: CONTACT.mapsUrl,
    external: true,
    note: `${CONTACT.locality}, ${CONTACT.region}`,
  },
];

export default function ContactPage() {
  return (
    <main id="main">
      <PageIntro
        eyebrow="Support"
        crumb={{ name: "Contact", path: "/contact" }}
        title="Get in touch."
        lede="Questions about an order, a fragrance, or anything else. If it's about an existing order, include your order number so we can look it up."
      />

      <Container className="pb-[clamp(56px,10vw,120px)]">
        {/* contact channels — an editorial band, not boxed cards */}
        <div className="grid border-t border-line md:grid-cols-3">
          {CHANNELS.map((c, i) => (
            <div
              key={c.label}
              className={
                "flex flex-col gap-2 py-[clamp(20px,3vw,30px)] md:py-8 md:pr-8" +
                (i < CHANNELS.length - 1
                  ? " border-b border-line md:border-r md:border-b-0"
                  : "") +
                (i > 0 ? " md:pl-8" : "")
              }
            >
              <span className="inline-flex items-center gap-2 text-[9px] tracking-[0.22em] text-ink-3 uppercase">
                <Icon name={c.icon} className="size-3.5 text-ink-2" />
                {c.label}
              </span>
              <a
                href={c.href}
                {...(c.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="inline-flex items-start gap-1 text-[14px] leading-[1.55] break-words transition-colors hover:text-ink-2"
              >
                {c.value}
                {c.external ? (
                  <Icon
                    name="arrowUpRight"
                    className="mt-0.5 size-3 shrink-0 text-ink-3"
                  />
                ) : null}
              </a>
              <span className="text-[10.5px] tracking-[0.03em] text-ink-3">
                {c.note}
              </span>
            </div>
          ))}
        </div>

        {/* the message form */}
        <div className="mt-[clamp(44px,8vw,88px)] grid gap-[clamp(28px,5vw,64px)] lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
          <div>
            <h2 className="text-[clamp(1.4rem,2.6vw,1.9rem)] leading-[1.15]">
              Write to us
            </h2>
            <p className="mt-3 max-w-[32ch] text-[13px] leading-[1.7] text-ink-2">
              A short note is enough. We read every message and usually reply
              within a working day. Quick answers may already be on the{" "}
              <Link
                href="/faq"
                className="underline decoration-line-2 underline-offset-2 hover:text-ink"
              >
                FAQ
              </Link>
              .
            </p>
          </div>

          <ContactForm />
        </div>
      </Container>
    </main>
  );
}
