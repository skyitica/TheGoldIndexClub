// =====================================================
// The Gold Index Club — shared frontend configuration
// =====================================================

const TGIC_CONFIG = {
  // Supabase — project: yonnoepfovbeeiaqvyqw
  SUPABASE_URL: "https://yonnoepfovbeeiaqvyqw.supabase.co",
  // Public / publishable key (safe in the browser). OK for auth + database from the client.
  SUPABASE_ANON_KEY: "sb_publishable_7U257mFcB_WWNWjfsx2zAg_0Yqoy6UW",
  // Legacy anon JWT (Project Settings → API → anon public key, starts with eyJ). REQUIRED for Edge Functions
  // (e.g. notify-member): the gateway rejects sb_publishable… with "Invalid JWT". Paste the eyJ… string here.
  SUPABASE_ANON_JWT: "",

  // Formspree endpoint for manual EFT confirmation notifications (example: https://formspree.io/f/xxxxabcd)
  FORMSPREE_CHECKOUT_URL: "https://formspree.io/f/xreovjdg",

  // Page URLs (adjust if your site lives in a subdirectory)
  SIGNUP_URL: "signup.html",
  LOGIN_URL: "login.html",
  CHECKOUT_URL: "checkout.html",
  ACCOUNT_URL: "account.html",
  HOME_URL: "/",
  ADMIN_URL: "admin.html",

  // Admin access: sign in with one of these email addresses to open admin.html.
  // Use lowercase emails. Example: ["name@example.com"]
  ADMIN_ALLOWED_EMAILS: [],

  // When true: after email/password signup (session returned), go to account instead of checkout.
  // Use only for your own testing — set back to false for production.
  SKIP_CHECKOUT_AFTER_SIGNUP: false,

  // Same as Edge secret TGIC_EMAIL_SERVER_SECRET. Sent in the notify-member JSON body (not Authorization).
  // Used by admin for notify-member emails. Leave empty to skip.
  TGIC_EMAIL_SERVER_SECRET: "GoldIndex2026Secret!",
};
