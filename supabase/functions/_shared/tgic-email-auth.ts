/** Legacy: header or Authorization bearer (not for browser — gateway expects JWT in Authorization). */
export function verifyTgicEmailServerSecret(req: Request, serverSecret: string): boolean {
  if (!serverSecret) return false;
  const fromHeader = (req.headers.get("x-tgic-email-secret") || "").trim();
  if (fromHeader === serverSecret) return true;
  const auth = (req.headers.get("Authorization") || "").trim();
  return auth === `Bearer ${serverSecret}`;
}

/** Prefer `tgic_email_server_secret` in JSON body (avoids CORS preflight issues with custom headers). */
export function verifyTgicEmailServerRequest(
  req: Request,
  body: Record<string, unknown> | null,
  serverSecret: string,
): boolean {
  if (!serverSecret) return false;
  if (
    body &&
    typeof body.tgic_email_server_secret === "string" &&
    (body.tgic_email_server_secret as string) === serverSecret
  ) {
    return true;
  }
  return verifyTgicEmailServerSecret(req, serverSecret);
}
