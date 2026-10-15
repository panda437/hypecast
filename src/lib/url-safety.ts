import { resolve4, resolve6 } from "node:dns/promises";
import { isIP } from "node:net";
import * as cheerio from "cheerio";
import { HttpError } from "./server-auth";

const MAX_BYTES = 3_000_000;
const MAX_REDIRECTS = 3;

function pageInputError(message: string, action = "Check that the link is public, complete, and opens without a login, then try again.") {
  return new HttpError(message, 400, action, "PAGE_READ_FAILED");
}

function isBlockedIpv4(address: string) {
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isBlockedIpv6(address: string) {
  const normalized = address.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("::ffff:") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("ff")
  );
}

export async function assertPublicUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw pageInputError("Enter a complete public URL, including https://");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw pageInputError("Only HTTP and HTTPS URLs are allowed.");
  if (url.username || url.password) throw pageInputError("URLs with embedded credentials are not allowed.");
  if (url.port && !["80", "443"].includes(url.port)) throw pageInputError("Only standard web ports are allowed.");
  const hostname = url.hostname.toLowerCase();
  const addressHost = hostname.replace(/^\[/, "").replace(/\]$/, "");
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw pageInputError("Local and private hostnames are not allowed.");
  }

  const literalType = isIP(addressHost);
  if (literalType === 4 && isBlockedIpv4(addressHost)) throw pageInputError("Private network addresses are not allowed.");
  if (literalType === 6 && isBlockedIpv6(addressHost)) throw pageInputError("Private network addresses are not allowed.");

  if (!literalType) {
    const [v4, v6] = await Promise.all([
      resolve4(hostname).catch(() => []),
      resolve6(hostname).catch(() => []),
    ]);
    if (v4.length + v6.length === 0) throw pageInputError("That hostname could not be resolved.");
    if (v4.some(isBlockedIpv4) || v6.some(isBlockedIpv6)) {
      throw pageInputError("That hostname resolves to a private network.");
    }
  }
  return url;
}

async function readLimitedBody(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_BYTES) throw pageInputError("The page is too large to analyze safely.", "Use a shorter public landing page or app-store link instead.");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let html = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw pageInputError("The page is too large to analyze safely.", "Use a shorter public landing page or app-store link instead.");
    }
    html += decoder.decode(value, { stream: true });
  }
  return html + decoder.decode();
}

export async function extractPublicPage(input: string) {
  let url = await assertPublicUrl(input);
  let response: Response | undefined;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    response = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": "CueFaceBot/1.0 (+https://cueface.com)" },
      signal: AbortSignal.timeout(8_000),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get("location");
    if (!location) throw pageInputError("The site returned an invalid redirect.");
    url = await assertPublicUrl(new URL(location, url).toString());
    if (redirect === MAX_REDIRECTS) throw pageInputError("The site redirected too many times.");
  }
  if (!response?.ok) throw pageInputError("CueFace could not read that page.", "Open the link in a private window to confirm it is public, then retry or use another product page.");
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) throw pageInputError("The URL must point to a public webpage.", "Use the product landing page or app-store listing instead of a file or API link.");

  const html = await readLimitedBody(response);
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, template").remove();
  const title = ($("meta[property='og:title']").attr("content") || $("title").text()).trim();
  const description = (
    $("meta[property='og:description']").attr("content") ||
    $("meta[name='description']").attr("content") ||
    ""
  ).trim();
  const headings = $("h1, h2")
    .map((_, element) => $(element).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean)
    .slice(0, 16);
  const body = $("body").text().replace(/\s+/g, " ").trim().slice(0, 12_000);
  if (!title && body.length < 80) throw pageInputError("There was not enough public page content to analyze.", "Use a product page with visible text, or try the app-store listing.");
  return { url: url.toString(), title, description, headings, body };
}
