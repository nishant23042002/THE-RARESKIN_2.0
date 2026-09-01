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
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartToast } from "@/components/cart/cart-toast";
import { CartBar } from "@/components/cart/cart-bar";
import { getCatalogNav, getBagSuggestions } from "@/server/data/catalog";

/**
 * Storefront shell. Everything the shopper-facing site shares — providers,
 * smooth scroll, the route-transition curtain, the fixed header + announcement
 * bar, the footer, and the cart / sign-in machinery. `/admin` deliberately sits
 * in its own route group and inherits none of this.
 */
export default async function StoreLayout({
  children,
}: LayoutProps<"/">) {
  const [nav, bagSuggestions] = await Promise.all([
    getCatalogNav(),
    getBagSuggestions(),
  ]);

  return (
    <AuthProvider>
      <CartProvider suggestions={bagSuggestions}>
        <SmoothScroll>
          <RouteTransitionProvider>
            <NavToneProvider>
              <div className="fixed inset-x-0 top-0 z-50">
                <AnnouncementBar />
                <Header nav={nav} />
              </div>
              {children}
              <Footer />
            </NavToneProvider>
            <CartDrawer />
            <CartToast />
            <CartBar />
            <SignInModalMount />
            <SignInAutoPrompt />
          </RouteTransitionProvider>
        </SmoothScroll>
      </CartProvider>
    </AuthProvider>
  );
}
