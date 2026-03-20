import dns from "node:dns/promises";
import net from "node:net";

function extractMeta(html, property) {
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["'][^>]*>`,
    "i",
  );
  const match = html.match(regex);
  return match?.[1] || match?.[2] || "";
}

function extractTitle(html) {
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleTag?.[1]?.trim() || "";
}

function detectPlatform(url) {
  const value = url.toLowerCase();
  if (value.includes("linkedin.com")) return "linkedin";
  if (value.includes("facebook.com") || value.includes("fb.watch")) return "facebook";
  if (value.includes("instagram.com")) return "instagram";
  if (value.includes("x.com") || value.includes("twitter.com")) return "x";
  return "web";
}

function isPrivateIpv4(ip) {
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("127.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;
  const parts = ip.split(".").map((v) => Number(v));
  return parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31;
}

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) return isPrivateIpv4(ip);
  if (net.isIPv6(ip)) {
    const value = ip.toLowerCase();
    return (
      value === "::1" ||
      value.startsWith("fc") ||
      value.startsWith("fd") ||
      value.startsWith("fe80")
    );
  }
  return true;
}

async function isHostAllowed(hostname) {
  const lower = hostname.toLowerCase();
  if (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal")
  ) {
    return false;
  }

  if (net.isIP(hostname)) {
    return !isPrivateIp(hostname);
  }

  try {
    const addresses = await dns.lookup(hostname, { all: true });
    return addresses.every((entry) => !isPrivateIp(entry.address));
  } catch {
    return false;
  }
}

// Simple in-memory rate limiter for pages/api
const rateLimitMap = new Map();
function checkRateLimit(ip, limit = 20, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > windowMs) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

export default async function handler(req, res) {
  // Rate limit: 20 requests per minute per IP
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.headers["x-real-ip"] || "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Too many requests. Try again later." });
  }

  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL" });
    }

    if (!parsed.protocol || !["http:", "https:"].includes(parsed.protocol)) {
      return res.status(400).json({ error: "Only HTTP/HTTPS URLs are allowed" });
    }

    const allowedHost = await isHostAllowed(parsed.hostname);
    if (!allowedHost) {
      return res.status(400).json({ error: "URL host is not allowed" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(400).json({ error: "Could not fetch URL metadata" });
    }

    const html = await response.text();

    const title = extractMeta(html, "og:title") || extractMeta(html, "twitter:title") || extractTitle(html);
    const description =
      extractMeta(html, "og:description") ||
      extractMeta(html, "twitter:description") ||
      extractMeta(html, "description");
    const image = extractMeta(html, "og:image") || extractMeta(html, "twitter:image");
    const siteName = extractMeta(html, "og:site_name") || parsed.hostname.replace("www.", "");

    return res.status(200).json({
      url: parsed.toString(),
      title,
      description,
      image,
      siteName,
      platform: detectPlatform(parsed.toString()),
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch link preview" });
  }
}