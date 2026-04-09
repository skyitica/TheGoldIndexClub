// =====================================================
// The Gold Index Club — shared frontend configuration
// =====================================================

const TGIC_CONFIG = {
  // Supabase — project: yonnoepfovbeeiaqvyqw
  SUPABASE_URL: "https://yonnoepfovbeeiaqvyqw.supabase.co",
  // Supabase anon/public key (Project Settings → API). Used as apikey + Bearer for Edge Functions.
  // If function calls return 401 "Invalid Token", use the legacy anon JWT (eyJ…) instead of sb_publishable.
  SUPABASE_ANON_KEY: "sb_publishable_7U257mFcB_WWNWjfsx2zAg_0Yqoy6UW",

  // Formspree endpoint for manual EFT confirmation notifications (example: https://formspree.io/f/xxxxabcd)
  FORMSPREE_CHECKOUT_URL: "https://formspree.io/f/xreovjdg",

  // Page URLs (adjust if your site lives in a subdirectory)
  SIGNUP_URL: "signup.html",
  LOGIN_URL: "login.html",
  CHECKOUT_URL: "checkout.html",
  ACCOUNT_URL: "account.html",
  HOME_URL: "/",

  // When true: after email/password signup (session returned), go to account instead of checkout.
  // Use only for your own testing — set back to false for production.
  SKIP_CHECKOUT_AFTER_SIGNUP: false,

  // Same as Edge secret TGIC_EMAIL_SERVER_SECRET. Sent in the notify-member JSON body (not Authorization).
  // Used by admin for notify-member emails. Leave empty to skip.
  TGIC_EMAIL_SERVER_SECRET: "GoldIndex2026Secret!",
};
