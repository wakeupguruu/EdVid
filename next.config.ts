import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers to prevent common vulnerabilities
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevent MIME type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Enable XSS protection
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Prevent clickjacking
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          // Control referrer information
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Enable DNS prefetching for performance
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          // Permissions Policy (formerly Feature Policy)
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Performance optimization
  compress: true,
  productionBrowserSourceMaps: false,

  // Environment-based configuration
  env: {
    NEXT_PUBLIC_APP_NAME: "EdVid",
  },

  // TypeScript strict mode
  typescript: {
    tsconfigPath: "./tsconfig.json",
  },

  // ESLint integration
  eslint: {
    dirs: ["app", "components", "lib", "hooks", "utils"],
  },

  // Redirect HTTP to HTTPS in production
  redirects: async () => {
    return process.env.NODE_ENV === "production"
      ? [
          {
            source: "/api/:path*",
            has: [
              {
                type: "header",
                key: "x-forwarded-proto",
                value: "http",
              },
            ],
            destination: "https://:host/api/:path*",
            permanent: true,
          },
        ]
      : [];
  },

  // Rewrite rules for API
  rewrites: async () => {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
