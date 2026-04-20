// TODO [human]: verify field list matches signup.html
//   Current fields accepted here (derived from signup.html's two submit handlers
//   — the "standard" signupForm and the post-payment paidForm):
//     - email              (required)
//     - password           (required)
//     - full_name          (string, stored in auth user_metadata.full_name)
//     - phone_number       (string, stored in auth user_metadata.phone_number)
//     - acknowledged_risk  (boolean, stored in auth user_metadata.acknowledged_risk)
//     - emailRedirectTo    (string URL, passed to Supabase as options.emailRedirectTo;
//                           must match a Redirect URL allowlisted in Supabase Auth)
//   signup.html does NOT send a payment reference to this endpoint — the
//   existing `link-payment-to-user` Edge Function still handles that after the
//   session is attached client-side. If you add new fields to signup.html,
//   mirror them in the payload here and in the `signUp` options below.

/**
 * Same-origin signup proxy.
 *
 * Routes Supabase email/password signup through a Vercel serverless function
 * so the browser never POSTs credentials to a third-party auth domain.
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
  var fullName = body && body.full_name != null ? String(body.full_name).trim() : "";
  var phoneNumber = body && body.phone_number != null ? String(body.phone_number).trim() : "";
  var acknowledgedRisk = !!(body && body.acknowledged_risk);
  var emailRedirectTo = body && body.emailRedirectTo != null ? String(body.emailRedirectTo) : "";

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  var metadata = {};
  if (fullName) metadata.full_name = fullName;
  if (phoneNumber) metadata.phone_number = phoneNumber;
  if (acknowledgedRisk) metadata.acknowledged_risk = true;

  var options = { data: metadata };
  if (emailRedirectTo) options.emailRedirectTo = emailRedirectTo;

  try {
    var sb = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    var result = await sb.auth.signUp({
      email: email,
      password: password,
      options: options,
    });
    if (result.error) {
      res.status(400).json({ error: result.error.message || "Signup failed." });
      return;
    }
    res.status(200).json({
      session: result.data ? result.data.session : null,
      user: result.data ? result.data.user : null,
    });
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || "Signup failed." });
  }
};
