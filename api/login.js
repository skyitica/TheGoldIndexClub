// TODO [human]: Add SUPABASE_URL env var in Vercel
//   Project → Settings → Environment Variables → SUPABASE_URL
//   Value: https://yonnoepfovbeeiaqvyqw.supabase.co
// TODO [human]: Add SUPABASE_ANON_KEY env var in Vercel
//   Project → Settings → Environment Variables → SUPABASE_ANON_KEY
//   Value: the current anon key from js/config.js (SUPABASE_ANON_KEY)
// TODO [human]: Apply to all environments (Production, Preview, Development),
//   then redeploy so the serverless function picks up the values.

/**
 * Same-origin login proxy.
 *
 * Routes Supabase password sign-in through a Vercel serverless function so the
 * browser never POSTs credentials to a third-party auth domain. This removes
 * the cross-origin credential submission that was triggering Chrome's
 * "Possible phishing detected on user login" warning.
 */
const { createClient } = require("@supabase/supabase-js");

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
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  var supabaseUrl = process.env.SUPABASE_URL;
  var supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(503).json({
      error: "Server missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.",
    });
    return;
  }

  var body = await readJsonBody(req);
  var email = body && body.email != null ? String(body.email).trim() : "";
  var password = body && body.password != null ? String(body.password) : "";

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  try {
    var sb = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    var result = await sb.auth.signInWithPassword({ email: email, password: password });
    if (result.error) {
      res.status(401).json({ error: result.error.message || "Invalid credentials." });
      return;
    }
    res.status(200).json({
      session: result.data ? result.data.session : null,
      user: result.data ? result.data.user : null,
    });
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || "Login failed." });
  }
};
