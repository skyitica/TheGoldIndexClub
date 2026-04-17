/**
 * POST JSON to Formspree (same form as checkout/extension). Requires js/config.js first.
 * Formspree must have the form verified; check spam and dashboard for failures.
 */
async function tgicPostFormspree(payload) {
  var url =
    typeof TGIC_CONFIG !== "undefined" &&
    TGIC_CONFIG.FORMSPREE_CHECKOUT_URL &&
    String(TGIC_CONFIG.FORMSPREE_CHECKOUT_URL).trim();
  if (!url) {
    throw new Error("Formspree URL is not configured (FORMSPREE_CHECKOUT_URL in js/config.js).");
  }
  var res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    var detail = "";
    try {
      detail = await res.text();
    } catch (e) {}
    throw new Error(
      "Formspree returned " + res.status + (detail ? ". " + detail.slice(0, 220) : "")
    );
  }
}
