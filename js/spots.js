/* Live "N spots left" from public.site_settings (see supabase/migrations/003_site_settings_spots.sql). */
(function () {
  var FALLBACK = 46;

  function apply(n) {
    var text = n + " spots left";
    document.querySelectorAll("[data-tgic-spots]").forEach(function (el) {
      el.textContent = text;
    });
  }

  function run() {
    if (typeof supabase === "undefined" || typeof TGIC_CONFIG === "undefined" || !TGIC_CONFIG.SUPABASE_URL) {
      apply(FALLBACK);
      return;
    }
    var sb = supabase.createClient(TGIC_CONFIG.SUPABASE_URL, TGIC_CONFIG.SUPABASE_ANON_KEY);
    sb.from("site_settings")
      .select("spots_remaining")
      .eq("id", 1)
      .maybeSingle()
      .then(function (res) {
        var n =
          res.data && typeof res.data.spots_remaining === "number"
            ? res.data.spots_remaining
            : FALLBACK;
        apply(n);
      })
      .catch(function () {
        apply(FALLBACK);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
