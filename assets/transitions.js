/* Tags the incoming cross-document view transition as "kh-forward" or
   "kh-back" by comparing the previous and next page against the reading
   order of the main nav, so site.css can slide the page in the matching
   direction. Must run early (not deferred) so it's listening before the
   pagereveal event fires. No-ops silently where the Navigation API or
   view transitions aren't supported. */
(function () {
  if (typeof navigation === "undefined") return;

  var order = ["/", "/werk/", "/over/", "/contact/"];

  function normalize(url) {
    try {
      var path = new URL(url).pathname;
      path = path.replace(/index\.html$/i, "");
      if (path !== "/" && path.endsWith("/")) path = path.slice(0, -1) || "/";
      return path;
    } catch (e) {
      return null;
    }
  }

  window.addEventListener("pagereveal", function (event) {
    if (!event.viewTransition) return;
    var from = navigation.activation && navigation.activation.from;
    var entry = navigation.activation && navigation.activation.entry;
    if (!from || !entry) return;

    var fromIndex = order.indexOf(normalize(from.url));
    var toIndex = order.indexOf(normalize(entry.url));
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    event.viewTransition.types.add(toIndex > fromIndex ? "kh-forward" : "kh-back");
  });
})();
