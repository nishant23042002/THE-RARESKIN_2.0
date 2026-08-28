import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Mark } from "@/components/ui/mark";
import { PageIntro } from "@/components/layout/page-intro";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Our Story",
  description:
    "A note from founder Vijay More, and the philosophy behind THE RARESKIN — luxury found in quality, authenticity, and the smallest details.",
  path: "/the-idea",
});

const FOUNDER_LETTER = [
  "THE RARESKIN was never created to be just another perfume brand. It was born from a journey of ambition, setbacks, resilience, and an unwavering belief that true success is built through persistence.",
  "Before this brand, I experienced failures, uncertainty, and moments when giving up seemed easier than starting again. But every challenge taught me something valuable. They shaped not only my journey as an entrepreneur but also the vision behind THE RARESKIN.",
  "I wanted to create more than a fragrance. I wanted to create an experience.",
  "A fragrance has the power to become a memory, a signature, and a quiet expression of confidence. Long after you leave the room, your scent should continue telling your story.",
  "Every bottle we create reflects our commitment to exceptional craftsmanship, carefully selected ingredients, elegant design, and an unforgettable unboxing experience. Every detail is thoughtfully considered — because we believe luxury is found in quality, authenticity, and the smallest details.",
  "At THE RARESKIN, we don’t chase trends. We create timeless fragrances that become a part of your identity and stay with you through life’s most meaningful moments.",
  "This is only the beginning of our journey, and we’re grateful to have you with us from the very start.",
  "Whether this is your first THE RARESKIN fragrance or one of many to come, thank you for placing your trust in us. We hope every scent becomes a part of your story, just as building this brand has become a part of mine.",
];

const PROMISE = [
  "Premium quality",
  "Carefully crafted fragrances",
  "Elegant packaging",
  "Honest ingredients",
  "Exceptional customer experience",
];

function FounderCard() {
  return (
    <figure className="overflow-hidden rounded-[4px] border border-line">
      <div
        className="relative flex aspect-[4/5] items-center justify-center"
        style={{
          background:
            "linear-gradient(160deg, var(--color-w0), var(--color-w1) 55%, var(--color-w2))",
        }}
      >
        <Mark className="w-16 text-ink/15" />
        <span className="absolute bottom-3 left-3 text-[9px] tracking-[0.14em] text-ink-3 uppercase">
          [Founder portrait]
        </span>
      </div>
      <figcaption className="flex items-baseline justify-between gap-3 border-t border-line px-4 py-3">
        <span className="text-[13px] tracking-[0.08em]">Vijay More</span>
        <span className="text-[9px] tracking-[0.16em] text-ink-3 uppercase">
          Founder
        </span>
      </figcaption>
    </figure>
  );
}

export default function OurStoryPage() {
  return (
    <main id="main">
      <PageIntro
        eyebrow="THE RARESKIN"
        crumb={{ name: "Our Story", path: "/the-idea" }}
        title="Our Story"
        lede="A brand born from ambition, setbacks, and the belief that a scent should keep telling your story long after you’ve left the room."
      />

      {/* A note from the founder */}
      <section className="border-t border-line">
        <Container className="grid gap-[clamp(28px,6vw,56px)] py-[clamp(52px,9vw,110px)] lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-[clamp(44px,7vw,92px)]">
          <div className="lg:sticky lg:top-[calc(var(--announce-h)+var(--header-h)+40px)] lg:self-start">
            <FounderCard />
          </div>

          <div>
            <p className="eyebrow mb-4">A note from the founder</p>
            <div className="max-w-[62ch] space-y-4 text-[15px] leading-[1.85] text-ink-2">
              <p className="text-ink">Hello,</p>
              <p>
                I’m <span className="text-ink">Vijay More</span>, Founder of THE
                RARESKIN.
              </p>
              {FOUNDER_LETTER.map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
            </div>

            <div className="mt-9 border-t border-line pt-6">
              <p className="serif-italic text-[1.05rem] text-ink-2">
                With gratitude,
              </p>
              <p className="mt-2 text-[1.2rem] tracking-[0.06em]">Vijay More</p>
              <p className="mt-1 text-[10px] tracking-[0.16em] text-ink-3 uppercase">
                Founder &middot; THE RARESKIN
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Our philosophy */}
      <section className="border-t border-line bg-surface">
        <Container className="max-w-[720px] py-[clamp(52px,9vw,110px)] text-center">
          <p className="eyebrow mb-5">Our philosophy</p>
          <p className="serif-italic text-[clamp(1.7rem,4vw,2.6rem)] leading-[1.25]">
            Scents that stay with you.
          </p>
          <p className="mx-auto mt-6 max-w-[54ch] text-[15px] leading-[1.8] text-ink-2">
            We believe every fragrance should evoke emotion, preserve memories,
            and leave a lasting impression. We don’t create perfumes to follow
            trends — we create fragrances that become a part of who you are.
          </p>
        </Container>
      </section>

      {/* Our promise */}
      <section className="border-t border-line">
        <Container className="max-w-[920px] py-[clamp(52px,9vw,110px)]">
          <p className="eyebrow mb-[clamp(24px,4vw,44px)]">Our promise</p>
          <ul className="grid gap-x-10 sm:grid-cols-2">
            {PROMISE.map((p, i) => (
              <li
                key={p}
                className="flex items-baseline gap-4 border-b border-line py-4"
              >
                <span className="serif text-[1.1rem] leading-none text-ink-3/70">
                  {`0${i + 1}`}
                </span>
                <span className="text-[1.05rem]">{p}</span>
              </li>
            ))}
          </ul>
          <p className="mt-[clamp(26px,5vw,48px)] max-w-[48ch] text-[15px] leading-[1.7] text-ink-2">
            Every decision we make is guided by one promise —{" "}
            <span className="serif-italic text-ink">
              to deliver a luxury fragrance experience that exceeds
              expectations.
            </span>
          </p>

          <Link
            href="/#shop"
            className="nav-underline mt-[clamp(28px,5vw,48px)] inline-flex items-center gap-2 text-[11px] tracking-[0.14em] text-ink uppercase"
          >
            See the three extraits <span aria-hidden>&rarr;</span>
          </Link>
        </Container>
      </section>
    </main>
  );
}
