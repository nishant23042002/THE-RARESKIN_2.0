import Link from "next/link";

import { Container } from "@/components/ui/container";
import { AccountReviews } from "@/components/account/account-reviews";
import { pageMeta } from "@/lib/seo";
import { requireUser } from "@/server/auth";
import { getMyReviews, getReviewableItems } from "@/server/data/reviews";

export const metadata = pageMeta({
  title: "Your reviews",
  description: "Review the fragrances you've received from THE RARESKIN.",
  path: "/account/reviews",
  noindex: true,
});

export const dynamic = "force-dynamic";

export default async function AccountReviewsPage() {
  const { user } = await requireUser("/account/reviews");
  const [reviewable, mine] = await Promise.all([
    getReviewableItems(user.id),
    getMyReviews(user.id),
  ]);

  return (
    <main
      id="main"
      className="ui-surface min-h-svh pt-[calc(var(--announce-h)+var(--header-h)+clamp(2rem,6vw,4rem))] pb-24"
    >
      <Container className="max-w-[760px]">
        <p className="eyebrow mb-3">
          <Link href="/account" className="hover:text-ink">
            Account
          </Link>{" "}
          / Reviews
        </p>
        <h1 className="text-[clamp(1.7rem,4vw,2.4rem)] leading-[1.1] tracking-[-0.01em]">
          Reviews
        </h1>
        <p className="mt-2 text-[13px] text-ink-2">
          Share how a fragrance wears once you&rsquo;ve lived in it. Only
          delivered orders can be reviewed, and our team checks each one before
          it goes live.
        </p>

        <div className="mt-9">
          <AccountReviews reviewable={reviewable} mine={mine} />
        </div>
      </Container>
    </main>
  );
}
