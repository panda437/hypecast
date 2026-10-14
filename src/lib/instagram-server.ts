import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { HttpError } from "./server-auth";

const DEFAULT_GRAPH_VERSION = "v25.0";

export function instagramPublishingEnabled() {
  return process.env.INSTAGRAM_PUBLISHING_ENABLED === "true";
}

export function instagramConfigured() {
  return Boolean(
    process.env.INSTAGRAM_APP_ID
      && process.env.INSTAGRAM_APP_SECRET
      && process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY
      && process.env.NEXT_PUBLIC_CONVEX_URL,
  );
}

export function getInstagramConfig() {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!appId || !appSecret) throw new HttpError("Instagram publishing is not configured yet.", 503);
  const version = process.env.INSTAGRAM_GRAPH_VERSION || DEFAULT_GRAPH_VERSION;
  if (!/^v\d+\.\d+$/.test(version)) throw new HttpError("The Instagram Graph API version is invalid.", 500);
  return { appId, appSecret, version };
}

function encryptionKey() {
  const encoded = process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY;
  if (!encoded) throw new HttpError("Instagram token storage is not configured.", 503);
  const key = Buffer.from(encoded, "base64");
  if (key.byteLength !== 32) throw new HttpError("Instagram token encryption is misconfigured.", 500);
  return key;
}

export function encryptInstagramToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptInstagramToken(payload: string) {
  const [version, encodedIv, encodedTag, encodedCiphertext] = payload.split(".");
  if (version !== "v1" || !encodedIv || !encodedTag || !encodedCiphertext) {
    throw new HttpError("The stored Instagram connection cannot be read. Please reconnect it.", 409);
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(encodedIv, "base64url"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function authenticatedConvex() {
  const session = await auth();
  if (!session.userId) throw new HttpError("Sign in to connect Instagram.", 401);
  const token = await session.getToken({ template: "convex" });
  if (!token || !process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new HttpError("Cloud authentication is not configured.", 503);
  }
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  client.setAuth(token);
  return { client, userId: session.userId };
}

async function instagramFetch<T>(url: URL, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
  const payload = await response.json().catch(() => ({})) as {
    error?: { message?: string; error_user_msg?: string; code?: number };
  } & T;
  if (!response.ok || payload.error) {
    const message = payload.error?.error_user_msg || payload.error?.message || `Instagram returned HTTP ${response.status}.`;
    throw new HttpError(message, response.status >= 400 && response.status < 500 ? 400 : 502);
  }
  return payload;
}

export async function exchangeInstagramCode(code: string, redirectUri: string) {
  const { appId, appSecret } = getInstagramConfig();
  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  return instagramFetch<{ access_token: string; user_id: string }>(
    new URL("https://api.instagram.com/oauth/access_token"),
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body },
  );
}

export async function exchangeForLongLivedToken(shortLivedToken: string) {
  const { appSecret } = getInstagramConfig();
  const url = new URL("https://graph.instagram.com/access_token");
  url.search = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: appSecret,
    access_token: shortLivedToken,
  }).toString();
  return instagramFetch<{ access_token: string; token_type?: string; expires_in?: number }>(url);
}

export async function refreshLongLivedToken(accessToken: string) {
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.search = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: accessToken,
  }).toString();
  return instagramFetch<{ access_token: string; token_type?: string; expires_in?: number }>(url);
}

export async function getInstagramProfile(accessToken: string) {
  const { version } = getInstagramConfig();
  const url = new URL(`https://graph.instagram.com/${version}/me`);
  url.search = new URLSearchParams({
    fields: "id,user_id,username,account_type",
    access_token: accessToken,
  }).toString();
  return instagramFetch<{ id: string; user_id?: string; username: string; account_type?: string }>(url);
}

export async function createInstagramReelContainer(input: {
  instagramUserId: string;
  accessToken: string;
  videoUrl: string;
  caption: string;
  shareToFeed: boolean;
}) {
  const { version } = getInstagramConfig();
  const url = new URL(`https://graph.instagram.com/${version}/${input.instagramUserId}/media`);
  url.search = new URLSearchParams({
    media_type: "REELS",
    video_url: input.videoUrl,
    caption: input.caption,
    share_to_feed: String(input.shareToFeed),
    access_token: input.accessToken,
  }).toString();
  return instagramFetch<{ id: string }>(url, { method: "POST" });
}

export async function getInstagramContainerStatus(containerId: string, accessToken: string) {
  const { version } = getInstagramConfig();
  const url = new URL(`https://graph.instagram.com/${version}/${containerId}`);
  url.search = new URLSearchParams({ fields: "status_code,status", access_token: accessToken }).toString();
  return instagramFetch<{ id: string; status_code: "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED"; status?: string }>(url);
}

export async function publishInstagramContainer(instagramUserId: string, containerId: string, accessToken: string) {
  const { version } = getInstagramConfig();
  const url = new URL(`https://graph.instagram.com/${version}/${instagramUserId}/media_publish`);
  url.search = new URLSearchParams({ creation_id: containerId, access_token: accessToken }).toString();
  return instagramFetch<{ id: string }>(url, { method: "POST" });
}

export async function usableInstagramConnection(client: ConvexHttpClient) {
  const connection = await client.query(api.instagram.getSecretMine, {});
  if (!connection) throw new HttpError("Connect an Instagram professional account first.", 409);
  if (!connection.publishingEnabled) throw new HttpError("Publishing is turned off for this Instagram connection.", 409);
  let accessToken = decryptInstagramToken(connection.encryptedAccessToken);
  let tokenExpiresAt = connection.tokenExpiresAt;
  if (tokenExpiresAt && tokenExpiresAt - Date.now() < 7 * 24 * 60 * 60 * 1_000) {
    const refreshed = await refreshLongLivedToken(accessToken);
    accessToken = refreshed.access_token;
    tokenExpiresAt = refreshed.expires_in ? Date.now() + refreshed.expires_in * 1_000 : tokenExpiresAt;
    await client.mutation(api.instagram.updateEncryptedToken, {
      encryptedAccessToken: encryptInstagramToken(accessToken),
      tokenExpiresAt,
    });
  }
  return { ...connection, accessToken, tokenExpiresAt };
}

export async function advanceInstagramPublication(client: ConvexHttpClient, publicationId: string) {
  const publication = await client.query(api.instagram.getPublication, { publicationId });
  if (!publication) throw new HttpError("Instagram publication not found.", 404);
  if (publication.status === "published" || publication.status === "failed" || !publication.containerId) return publication;
  const connection = await usableInstagramConnection(client);
  const result = await getInstagramContainerStatus(publication.containerId, connection.accessToken);
  if (result.status_code === "ERROR" || result.status_code === "EXPIRED") {
    const message = result.status || `Instagram processing ${result.status_code.toLowerCase()}.`;
    await client.mutation(api.instagram.updatePublication, {
      publicationId,
      status: "failed",
      containerId: publication.containerId,
      error: message.slice(0, 500),
    });
    return { ...publication, status: "failed" as const, error: message };
  }
  if (result.status_code === "FINISHED") {
    const published = await publishInstagramContainer(
      connection.instagramUserId,
      publication.containerId,
      connection.accessToken,
    );
    await client.mutation(api.instagram.updatePublication, {
      publicationId,
      status: "published",
      containerId: publication.containerId,
      instagramMediaId: published.id,
    });
    return { ...publication, status: "published" as const, instagramMediaId: published.id };
  }
  if (result.status_code === "PUBLISHED") {
    await client.mutation(api.instagram.updatePublication, {
      publicationId,
      status: "published",
      containerId: publication.containerId,
      instagramMediaId: publication.instagramMediaId,
    });
    return { ...publication, status: "published" as const };
  }
  return publication;
}
