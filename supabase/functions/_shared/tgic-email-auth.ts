/** Validates TGIC_EMAIL_SERVER_SECRET.
 * Use header `X-TGIC-Email-Secret` — Supabase's gateway parses `Authorization` as a JWT,
 * so `Authorization: Bearer <plain secret>` fails before the function runs. */
export function verifyTgicEmailServerSecret(req: Request, serverSecret: string): boolean {
  if (!serverSecret) return false;
  const fromHeader = (req.headers.get("x-tgic-email-secret") || "").trim();
  if (fromHeader === serverSecret) return true;
  const auth = (req.headers.get("Authorization") || "").trim();
  return auth === `Bearer ${serverSecret}`;
}
