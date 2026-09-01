import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Native Node.js require for the DB / media SDKs — they use Node built-ins and
  // must not be bundled into the Server Components graph.
  serverExternalPackages: [
    "mongoose",
    "cloudinary",
    "twilio",
    // pulls in fontkit + a PDF writer that use Node built-ins (zlib/stream/fs)
    "@react-pdf/renderer",
  ],
  // the invoice PDF reads the brand fonts straight off disk — bundle them
  outputFileTracingIncludes: {
    "/api/account/orders/[orderNumber]/invoice": ["./public/fonts/**"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
