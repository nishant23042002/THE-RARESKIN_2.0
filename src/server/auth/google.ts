import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { getGoogleEnv } from "@/server/env";

/**
 * Hand-rolled Google OAuth 2.0 — authorization-code flow with PKCE (S256),
 * `state` and `nonce`. No dependency: the whole exchange is two HTTPS calls to
 * Google plus a base64url decode.
 *
 * **Why no JWKS signature check on the `id_token`.** In the code flow the token
 * is fetched by us directly from `https://oauth2.googleapis.com/token` over TLS
 * — the transport authenticates the issuer. Google's own docs say verifying the
 * signature is unnecessary in that case; it's required only when a token reaches
 * you second-hand (e.g. straight from the browser). We still validate `iss`,
 * `aud`, `exp` and `nonce`. See:
 * https://developers.google.com/identity/openid-connect/openid-connect#obtainuserinfo
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const VALID_ISS = new Set([
  "accounts.google.com",
  "https://accounts.google.com",
]);

export const GOOGLE_REDIRECT_PATH = "/api/auth/google/callback";

/**
 * The `redirect_uri` Google sees — derived from the **incoming request** (so
 * `http://localhost:3000/...` in dev and the real origin in prod, without
 * juggling `NEXT_PUBLIC_SITE_URL`). Register every origin you serve from in the
 * Google console's "Authorised redirect URIs". Prefers the proxy-forwarded
 * host; falls back to `Host`.
 */
export function googleRedirectUri(request: Request): string {
  const h = request.headers;
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
  const host = h.get("x-forwarded-host") || h.get("host");
  const origin = host ? `${proto}://${host}` : new URL(request.url).origin;
  return `${origin}${GOOGLE_REDIRECT_PATH}`;
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export interface OAuthStart {
  url: string;
  state: string;
  codeVerifier: string;
  nonce: string;
}

/** Build the Google consent URL + the secrets to stash in short-TTL cookies. */
export function beginOAuth(
  mode: "link" | "signin",
  redirectUri: string,
): OAuthStart {
  const { clientId } = getGoogleEnv();
  const state = b64url(randomBytes(24));
  const nonce = b64url(randomBytes(24));
  const codeVerifier = b64url(randomBytes(48));
  const codeChallenge = b64url(
    createHash("sha256").update(codeVerifier).digest(),
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  // carried through only for our own bookkeeping in logs; the real mode comes
  // from the signed cookie, not from Google
  void mode;

  return { url: `${AUTH_ENDPOINT}?${params.toString()}`, state, codeVerifier, nonce };
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
  hostedDomain: string | null;
}

interface IdTokenClaims {
  iss?: string;
  aud?: string;
  sub?: string;
  exp?: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
  hd?: string;
}

function decodeJwtPayload(jwt: string): IdTokenClaims {
  const part = jwt.split(".")[1];
  if (!part) throw new Error("malformed id_token");
  const json = Buffer.from(
    part.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString("utf8");
  return JSON.parse(json) as IdTokenClaims;
}

/**
 * Exchange the authorization code for tokens and return the verified identity.
 * Throws on any mismatch — the caller turns that into a redirect with `?error`.
 */
export async function completeOAuth(input: {
  code: string;
  codeVerifier: string;
  nonce: string;
  /** must be byte-identical to the one used in `beginOAuth` */
  redirectUri: string;
}): Promise<GoogleIdentity> {
  const { clientId, clientSecret } = getGoogleEnv();

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: input.redirectUri,
      code_verifier: input.codeVerifier,
    }),
  });

  if (!res.ok) {
    throw new Error(`google token exchange failed (${res.status})`);
  }

  const body = (await res.json()) as { id_token?: string };
  if (!body.id_token) throw new Error("no id_token in token response");

  const claims = decodeJwtPayload(body.id_token);

  if (!claims.iss || !VALID_ISS.has(claims.iss)) {
    throw new Error(`unexpected id_token iss: ${claims.iss}`);
  }
  if (claims.aud !== clientId) {
    throw new Error("id_token aud mismatch");
  }
  if (!claims.exp || claims.exp * 1000 <= Date.now()) {
    throw new Error("id_token expired");
  }
  if (claims.nonce !== input.nonce) {
    throw new Error("id_token nonce mismatch");
  }
  if (!claims.sub || !claims.email) {
    throw new Error("id_token missing sub/email");
  }

  return {
    sub: claims.sub,
    email: claims.email.toLowerCase(),
    emailVerified:
      claims.email_verified === true || claims.email_verified === "true",
    name: claims.name ?? null,
    picture: claims.picture ?? null,
    hostedDomain: claims.hd ? claims.hd.toLowerCase() : null,
  };
}
