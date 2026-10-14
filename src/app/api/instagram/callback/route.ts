import { connection, NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import {
  authenticatedConvex,
  encryptInstagramToken,
  exchangeForLongLivedToken,
  exchangeInstagramCode,
  getInstagramProfile,
  instagramConfigured,
  instagramPublishingEnabled,
} from "@/lib/instagram-server";

function redirectWithStatus(request: NextRequest, status: string) {
  const response = NextResponse.redirect(new URL(`/?instagram=${encodeURIComponent(status)}`, request.url));
  response.cookies.delete("cueface_instagram_oauth_state");
  return response;
}

export async function GET(request: NextRequest) {
  await connection();
  try {
    if (!instagramPublishingEnabled()) return redirectWithStatus(request, "paused");
    if (!instagramConfigured()) return redirectWithStatus(request, "unconfigured");
    const expectedState = request.cookies.get("cueface_instagram_oauth_state")?.value;
    const state = request.nextUrl.searchParams.get("state");
    const code = request.nextUrl.searchParams.get("code")?.replace(/#_$/, "");
    const denied = request.nextUrl.searchParams.get("error_description");
    if (denied) return redirectWithStatus(request, "cancelled");
    if (!expectedState || !state || expectedState !== state || !code) return redirectWithStatus(request, "invalid-state");

    const { client } = await authenticatedConvex();
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || new URL("/api/instagram/callback", request.url).toString();
    const shortLived = await exchangeInstagramCode(code, redirectUri);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);
    const profile = await getInstagramProfile(longLived.access_token);
    const tokenExpiresAt = longLived.expires_in ? Date.now() + longLived.expires_in * 1_000 : undefined;
    await client.mutation(api.instagram.upsertMine, {
      instagramUserId: profile.user_id || profile.id || shortLived.user_id,
      username: profile.username,
      accountType: profile.account_type,
      encryptedAccessToken: encryptInstagramToken(longLived.access_token),
      tokenExpiresAt,
    });
    return redirectWithStatus(request, "connected");
  } catch (error) {
    console.error("CueFace Instagram callback failed", error instanceof Error ? error.message : "Unknown error");
    return redirectWithStatus(request, "failed");
  }
}
