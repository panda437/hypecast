import { randomBytes } from "node:crypto";
import { connection, NextRequest, NextResponse } from "next/server";
import { authenticatedConvex, getInstagramConfig, instagramConfigured, instagramPublishingEnabled } from "@/lib/instagram-server";
import { routeError } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  await connection();
  try {
    if (!instagramPublishingEnabled()) return NextResponse.redirect(new URL("/?instagram=paused", request.url));
    if (!instagramConfigured()) return NextResponse.redirect(new URL("/?instagram=unconfigured", request.url));
    await authenticatedConvex();
    const { appId } = getInstagramConfig();
    const state = randomBytes(24).toString("base64url");
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || new URL("/api/instagram/callback", request.url).toString();
    const authorizationUrl = new URL("https://www.instagram.com/oauth/authorize");
    authorizationUrl.search = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "instagram_business_basic,instagram_business_content_publish",
      state,
      enable_fb_login: "0",
      force_authentication: "1",
    }).toString();
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set("cueface_instagram_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    });
    return response;
  } catch (error) {
    return routeError(error);
  }
}
