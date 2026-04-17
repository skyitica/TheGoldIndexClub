/**
 * Clears admin HttpOnly cookie.
 */
module.exports = async function handler(req, res) {
  var isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  var cookie =
    "tgic_admin=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" + (isProd ? "; Secure" : "");
  res.setHeader("Set-Cookie", cookie);
  res.writeHead(302, { Location: "/admin-login" });
  res.end();
};
