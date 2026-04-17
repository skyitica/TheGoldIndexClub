/**
 * Sets HttpOnly cookie after verifying ADMIN_GATE_PASSWORD (server env only).
 */
const crypto = require("crypto");

function createAdminCookieValue(secret) {
  var exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  var expStr = String(exp);
  var msg = "v1." + expStr;
  var sigHex = crypto.createHmac("sha256", secret).update(msg, "utf8").digest("hex");
  return "v1." + expStr + "." + sigHex;
}

function hashPw(s) {
  return crypto.createHash("sha256").update("tgic_admin_pw:" + String(s), "utf8").digest();
}

function safeEqualPw(input, expected) {
  try {
    var a = hashPw(input);
    var b = hashPw(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

function readJsonBody(req) {
  return new Promise(function (resolve, reject) {
    if (req.body && typeof req.body === "object" && req.body !== null && !Buffer.isBuffer(req.body)) {
      resolve(req.body);
      return;
    }
    var chunks = [];
    req.on("data", function (c) {
      chunks.push(c);
    });
    req.on("end", function () {
      try {
        var raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }
  var sessionSecret = process.env.ADMIN_SESSION_SECRET;
  var expectedPw = process.env.ADMIN_GATE_PASSWORD;
  if (!sessionSecret || expectedPw == null || expectedPw === "") {
    res.status(503).json({
      ok: false,
      error: "Server missing ADMIN_SESSION_SECRET or ADMIN_GATE_PASSWORD in environment variables.",
    });
    return;
  }

  var body = await readJsonBody(req);
  var password = body && body.password != null ? String(body.password) : "";

  if (!safeEqualPw(password, expectedPw)) {
    res.status(401).json({ ok: false, error: "Invalid password." });
    return;
  }

  var token = createAdminCookieValue(sessionSecret);
  var isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  var cookie =
    "tgic_admin=" +
    encodeURIComponent(token) +
    "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" +
    7 * 24 * 60 * 60 +
    (isProd ? "; Secure" : "");
  res.setHeader("Set-Cookie", cookie);
  res.status(200).json({ ok: true });
};
