/**
 * Shared analytics + error-monitoring loader.
 * Include once near the bottom of every HTML page: <script src="js/analytics.js" defer></script>
 *
 * Plausible: privacy-respecting, POPIA-friendly, no cookies.
 * Sentry: frontend error monitoring (free tier).
 *
 * TODO [human]: sign up at plausible.io and replace PLAUSIBLE_DOMAIN below with the exact domain you add.
 * TODO [human]: create a Sentry project and paste the DSN into SENTRY_DSN below.
 */
(function () {
  var PLAUSIBLE_DOMAIN = "thegoldindexclub.co.za";
  var SENTRY_DSN = "";

  function loadScript(src, opts) {
    opts = opts || {};
    var s = document.createElement("script");
    s.src = src;
    if (opts.defer) s.defer = true;
    if (opts.async) s.async = true;
    if (opts.dataDomain) s.setAttribute("data-domain", opts.dataDomain);
    document.head.appendChild(s);
    return s;
  }

  // --- Plausible ----------------------------------------------------------
  if (PLAUSIBLE_DOMAIN && !/localhost|127\.0\.0\.1/.test(location.hostname)) {
    loadScript("https://plausible.io/js/script.js", {
      defer: true,
      dataDomain: PLAUSIBLE_DOMAIN,
    });
  }

  // --- Sentry -------------------------------------------------------------
  if (SENTRY_DSN) {
    var s = loadScript("https://browser.sentry-cdn.com/7.118.0/bundle.tracing.min.js", {
      defer: true,
      async: true,
    });
    s.addEventListener("load", function () {
      try {
        if (window.Sentry) {
          window.Sentry.init({
            dsn: SENTRY_DSN,
            tracesSampleRate: 0.1,
            environment: /thegoldindexclub\.co\.za$/.test(location.hostname) ? "production" : "preview",
          });
        }
      } catch (e) {
        /* swallow — analytics must never break the page */
      }
    });
  }
})();
