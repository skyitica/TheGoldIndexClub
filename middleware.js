/**
 * Vercel Edge Middleware: blocks /admin until HttpOnly cookie tgic_admin is set by POST /api/admin-login.
 * Env (set in Vercel → Settings → Environment Variables, not in git):
 *   ADMIN_SESSION_SECRET — long random string used to sign the cookie
 *   ADMIN_GATE_PASSWORD — checked only on the server in api/admin-login.js
 */
export const config = {
  matcher: ["/admin", "/admin.html"],
};

function bufToHex(buf) {
  return Array.from(buf)
    .map(function (b) {
      return b.toString(16).padStart(2, "0");
    })
    .join("");
}

async function hmacSha256Hex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return bufToHex(new Uint8Array(sig));
}

function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  var out = 0;
  for (var i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

async function verifyAdminCookie(cookieHeader, secret) {
  if (!cookieHeader || !secret) return false;
  var m = /(?:^|;\s*)tgic_admin=([^;]+)/.exec(cookieHeader);
  if (!m) return false;
  var raw = decodeURIComponent(m[1].trim());
  var parts = raw.split(".");
  if (parts.length !== 3) return false;
  var ver = parts[0];
  var expStr = parts[1];
  var sigHex = parts[2];
  if (ver !== "v1") return false;
  var exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  var msg = "v1." + expStr;
  var expectedHex = await hmacSha256Hex(secret, msg);
  return timingSafeEqualHex(expectedHex, sigHex);
}

export default async function middleware(request) {
  var secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    return new Response(
      "Admin is not configured: set ADMIN_SESSION_SECRET and ADMIN_GATE_PASSWORD in Vercel environment variables.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }
  var ok = await verifyAdminCookie(request.headers.get("cookie") || "", secret);
  if (ok) {
    return fetch(request);
  }
  var url = new URL(request.url);
  var dest = new URL("/admin-login", url.origin);
  dest.searchParams.set("next", url.pathname === "/admin.html" ? "/admin" : url.pathname || "/admin");
  return Response.redirect(dest.toString(), 302);
}
