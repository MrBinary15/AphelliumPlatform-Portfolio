import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent clickjacking — allow framing only from same origin
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Block MIME-type sniffing attacks
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Enable browser XSS filter
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Control referrer information leakage
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Enforce HTTPS for 2 years, include subdomains
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Restrict browser features (camera, mic, geolocation, etc.)
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()" },
  // Prevent DNS prefetching leaks
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://player.vimeo.com https://www.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://images.unsplash.com https://*.linkedin.com https://*.licdn.com https://*.twitter.com https://*.twimg.com https://*.githubusercontent.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.instagram.com https://www.tiktok.com https://platform.twitter.com",
      "media-src 'self' blob: https://*.supabase.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
      { protocol: "https", hostname: "*.linkedin.com" },
      { protocol: "https", hostname: "*.licdn.com" },
      { protocol: "https", hostname: "*.twitter.com" },
      { protocol: "https", hostname: "*.twimg.com" },
      { protocol: "https", hostname: "*.githubusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },
  // Prevent source map exposure in production
  productionBrowserSourceMaps: false,
  // Disable x-powered-by header to hide tech stack
  poweredByHeader: false,
};

export default nextConfig;
