import type { Metadata, Viewport } from "next";
import { Jost, Newsreader } from "next/font/google";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { CartProvider } from "@/components/providers/cart-provider";
import { NavToneProvider } from "@/components/providers/nav-tone";
import { ScrollbarVar } from "@/components/providers/scrollbar-var";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartToast } from "@/components/cart/cart-toast";
import { CartBar } from "@/components/cart/cart-bar";
import { SvgDefs } from "@/components/ui/svg-defs";
import { SITE } from "@/lib/site";
import "./globals.css";

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
    locale: SITE.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f2f1ed",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${jost.variable} ${newsreader.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only rounded-[2px] bg-cta px-4 py-2.5 text-w0 focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[999]"
        >
          Skip to content
        </a>
        <SvgDefs />
        <ScrollbarVar />
        <CartProvider>
          <SmoothScroll>
            <NavToneProvider>
              <div className="fixed inset-x-0 top-0 z-50">
                <AnnouncementBar />
                <Header />
              </div>
              {children}
              <Footer />
            </NavToneProvider>
            <CartDrawer />
            <CartToast />
            <CartBar />
          </SmoothScroll>
        </CartProvider>
      </body>
    </html>
  );
}
