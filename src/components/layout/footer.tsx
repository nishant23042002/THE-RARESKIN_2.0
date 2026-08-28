import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { PaymentMarks, IndiaFlag } from "@/components/ui/payment-marks";
import { getCatalogNav } from "@/server/data/catalog";

type Column = { title: string; links: { label: string; href: string }[] };

const STATIC_COLUMNS: Column[] = [
  {
    title: "Discover",
    links: [
      { label: "Why Extrait", href: "/#why" },
      { label: "The Idea", href: "/#idea" },
      { label: "Find your match", href: "/#quiz" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Shipping", href: "/shipping" },
      { label: "Returns", href: "/returns" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Our story", href: "/the-idea" },
      { label: "Terms of service", href: "/terms" },
      { label: "Privacy policy", href: "/privacy" },
    ],
  },
];

export async function Footer() {
  const year = new Date().getFullYear();
  const nav = await getCatalogNav();

  const COLUMNS: Column[] = [
    {
      title: "Shop",
      links: [
        ...nav.map((f) => ({
          label: f.name,
          href: `/fragrances/${f.slug}`,
        })),
        { label: "Discovery Set", href: "/discovery-set" },
      ],
    },
    ...STATIC_COLUMNS,
  ];

  return (
    <footer className="overflow-hidden border-t border-line bg-bg">
      <Container className="border-b border-line pt-[clamp(48px,8vw,104px)] pb-[clamp(28px,5vw,56px)]">
        <Logo
          className="w-full text-ink"
          style={{ width: "100%", maxWidth: "1180px" }}
        />
      </Container>

      <Container className="grid gap-11 py-[clamp(44px,7vw,80px)] md:grid-cols-[1fr_1.6fr] md:items-start md:gap-[70px]">
        <div>
          <p className="text-[9px] tracking-[0.5em] text-ink-3 uppercase">
            The house
          </p>
          <p className="serif-italic mt-3.5 max-w-[24ch] text-[clamp(1.2rem,2.4vw,1.6rem)] leading-[1.4] text-ink-2">
            Extrait de Parfum, made to become part of how people remember you.
          </p>
          <Link
            href="/#letter"
            className="nav-underline mt-6 inline-flex items-center gap-2 text-[11px] tracking-[0.14em] text-ink uppercase"
          >
            The Letter <span aria-hidden>&rarr;</span>
          </Link>
        </div>

        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-4"
        >
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="mb-4 text-[9px] font-normal tracking-[0.18em] text-ink-3 uppercase">
                {col.title}
              </h2>
              <ul>
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="block py-[5px] text-[12.5px] text-ink-2 transition-colors hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </Container>

      <Container className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-line py-6 pb-10">
        <PaymentMarks />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] tracking-[0.03em] text-ink-3">
          <span>&copy; {year} THE RARESKIN</span>
          <span>Scents that stay with you</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] tracking-[0.06em] text-ink-3 uppercase">
          <IndiaFlag />
          India &middot; &#8377; INR
        </div>
      </Container>
    </footer>
  );
}
