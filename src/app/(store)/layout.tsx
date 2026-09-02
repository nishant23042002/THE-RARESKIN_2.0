import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { RouteTransitionProvider } from "@/components/providers/route-transition";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SignInModalMount } from "@/components/auth/sign-in-modal-mount";
import { SignInAutoPrompt } from "@/components/auth/sign-in-auto-prompt";
import { CartProvider } from "@/components/providers/cart-provider";
import { NavToneProvider } from "@/components/providers/nav-tone";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HoldingPage } from "@/components/layout/holding-page";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartToast } from "@/components/cart/cart-toast";
import { CartBar } from "@/components/cart/cart-bar";
import { CampaignNote } from "@/components/layout/campaign-note";
import { getCatalogNav, getBagSuggestions } from "@/server/data/catalog";
import { getSiteSettings } from "@/server/data/settings";
import { getCurrentUser } from "@/server/auth";

/**
 * Storefront shell. Everything the shopper-facing site shares — providers,
 * smooth scroll, the route-transition curtain, the fixed header + announcement
 * bar, the footer, and the cart / sign-in machinery. `/admin` deliberately sits
 * in its own route group and inherits none of this.
 */
export default async function StoreLayout({
  children,
}: LayoutProps<"/">) {
  const [nav, bagSuggestions, settings] = await Promise.all([
    getCatalogNav(),
    getBagSuggestions(),
    getSiteSettings(),
  ]);

  // Pre-launch (`!storeLive`) or a planned outage (`maintenanceMode`): the whole
  // storefront becomes a holding page — except for signed-in staff, who keep
  // working the site while it's dark. `/admin` is a separate route group and is
  // never affected. (The storefront is already dynamically rendered, so the
  // `getCurrentUser()` cookie read costs nothing here.)
  if (settings.flags.maintenanceMode || !settings.flags.storeLive) {
    const user = await getCurrentUser();
    if (!user?.isStaff) {
      return <HoldingPage settings={settings} />;
    }
  }

  return (
    <AuthProvider>
      <CartProvider suggestions={bagSuggestions}>
        <SmoothScroll>
          <RouteTransitionProvider>
            <NavToneProvider>
              <div className="fixed inset-x-0 top-0 z-50">
                <AnnouncementBar
                  messages={settings.announcements
                    .filter((a) => a.active)
                    .map((a) => ({ text: a.text, href: a.href }))}
                  rotateSeconds={settings.announcementRotateSeconds}
                />
                <Header nav={nav} />
              </div>
              {children}
              <Footer />
            </NavToneProvider>
            <CartDrawer />
            <CartToast />
            <CartBar />
            <CampaignNote
              campaign={settings.campaign}
              products={bagSuggestions
                .filter((s) => s.fragrance)
                .slice(0, 3)
                .map((s) => ({
                  name: s.name,
                  image: s.image,
                  fragrance: s.fragrance,
                }))}
            />
            <SignInModalMount />
            <SignInAutoPrompt />
          </RouteTransitionProvider>
        </SmoothScroll>
      </CartProvider>
    </AuthProvider>
  );
}
