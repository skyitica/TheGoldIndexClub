// =====================================================
// The Gold Index Club — shared frontend configuration
// =====================================================

const TGIC_CONFIG = {
  // Supabase — project: yonnoepfovbeeiaqvyqw
  SUPABASE_URL: "https://yonnoepfovbeeiaqvyqw.supabase.co",
  // Publishable (client-safe) key from Supabase dashboard.
  // If auth fails, copy the legacy "anon" JWT from Project Settings → API and paste here instead.
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

  // Same string as Supabase Edge Function secret TGIC_EMAIL_SERVER_SECRET (Project Settings → Edge Functions → Secrets).
  // Used by admin only to trigger notify-member (payment confirmed, extension denied). Leave empty to skip those emails.
  TGIC_EMAIL_SERVER_SECRET: "",
};
