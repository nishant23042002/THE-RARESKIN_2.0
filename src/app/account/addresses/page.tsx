import Link from "next/link";

import { Container } from "@/components/ui/container";
import { AddressBook } from "@/components/account/address-book";
import { pageMeta } from "@/lib/seo";
import { requireUser } from "@/server/auth";
import { listAddresses } from "@/server/data/addresses";

export const metadata = pageMeta({
  title: "Your addresses",
  description: "Manage your THE RARESKIN delivery addresses.",
  path: "/account/addresses",
  noindex: true,
});

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const { user } = await requireUser("/account/addresses");
  const addresses = await listAddresses(user.id);

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
          / Addresses
        </p>
        <h1 className="text-[clamp(1.7rem,4vw,2.4rem)] leading-[1.1] tracking-[-0.01em]">
          Delivery addresses
        </h1>
        <p className="mt-2 text-[13px] text-ink-2">
          Saved addresses appear at checkout. One is always the default.
        </p>

        <div className="mt-9">
          <AddressBook initial={addresses} />
        </div>
      </Container>
    </main>
  );
}
