/**
 * Resend API (https://resend.com). Set secrets: RESEND_API_KEY, EMAIL_FROM (e.g. "TGIC <payments@yourdomain.com>").
 */
export async function sendResendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string; id?: string }> {
  const key = Deno.env.get("RESEND_API_KEY");
  const from =
    Deno.env.get("EMAIL_FROM") || "The Gold Index Club <onboarding@resend.dev>";

  if (!key) {
    return { ok: false, skipped: true, error: "RESEND_API_KEY not configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text ?? undefined,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: (data as { message?: string }).message || res.statusText,
    };
  }

  return { ok: true, id: (data as { id?: string }).id };
}

export function johannesburgTodayYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
