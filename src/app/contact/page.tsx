import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/layout/page-intro";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Contact",
  description: "Reach THE RARESKIN about a fragrance, an order, or the brand.",
  path: "/contact",
});

const ROWS = [
  {
    dt: "Email",
    dd: (
      <>
        <a
          href="mailto:hello@therareskin.com"
          className="underline decoration-line-2 underline-offset-2 hover:text-ink"
        >
          hello@therareskin.com
        </a>{" "}
        <span className="text-ink-3">[placeholder]</span>
      </>
    ),
  },
  { dt: "Response time", dd: "Within [X] working days." },
  {
    dt: "Orders & delivery",
    dd: "Ships across India · cash on delivery available · dispatch in 24–48 hours.",
  },
  {
    dt: "The Letter",
    dd: (
      <Link
        href="/#letter"
        className="underline decoration-line-2 underline-offset-2 hover:text-ink"
      >
        One note when something new arrives.
      </Link>
    ),
  },
];

export default function ContactPage() {
  return (
    <main id="main">
      <PageIntro
        eyebrow="Contact"
        title="Say hello."
        lede="Questions about a fragrance, an order, or the brand — we read everything."
      />
      <Container className="max-w-[760px] pb-[clamp(56px,10vw,110px)]">
        <dl className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
          {ROWS.map((r) => (
            <div key={r.dt}>
              <dt className="eyebrow mb-1.5">{r.dt}</dt>
              <dd className="text-[14px] leading-[1.6] text-ink-2">{r.dd}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-9 text-[11px] tracking-[0.03em] text-ink-3">
          A contact form arrives with launch. For now, email is the fastest way
          to reach us.
        </p>
      </Container>
    </main>
  );
}
