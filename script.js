(function () {
    "use strict";

    var overlay = document.getElementById("tearOverlay");
    var tearBtn = document.getElementById("tearButton");
    var body = document.body;

    if (!overlay || !tearBtn) return;

    function tearOpen() {
        if (overlay.classList.contains("is-torn")) return;
        overlay.classList.add("is-torn");

        var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var delay = reduceMotion ? 300 : 950;

        window.setTimeout(function () {
            overlay.classList.add("is-hidden");
            body.classList.remove("tear-locked");
            var hero = document.getElementById("top");
            if (hero) {
                hero.setAttribute("tabindex", "-1");
                hero.focus({ preventScroll: true });
            }
        }, delay);
    }

    tearBtn.addEventListener("click", tearOpen);
    tearBtn.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            tearOpen();
        }
    });

    // Lock scroll until torn
    body.classList.add("tear-locked");

    // Mobile nav toggle (progressive enhancement)
    var toggle = document.querySelector(".nav-toggle");
    var links = document.querySelector(".nav-links");
    if (toggle && links) {
        toggle.addEventListener("click", function () {
            links.classList.toggle("is-open");
        });
    }
})();

// Tear-overlay navigation WITHOUT reloading the iframes.
// Both old-portfolio pages (Profile + Education) are preloaded into each
// half and stacked; switching is just a visibility toggle, so there is no
// white/blue flash and no reload gap.
(function () {
    "use strict";
    var frames = Array.prototype.slice.call(document.querySelectorAll(".tear-frame"));
    if (frames.length < 2) return;

    // "Old/education.html" -> "education", "Old/index.html" -> "index"
    function pageKeyOf(url) {
        var base = (url || "").split("/").pop();
        return base.replace(/\.html$/i, "") || "index";
    }

    var activeKey = null;   // page currently shown
    var clearTimer = null;

    // Switch pages with a "cover" crossfade: the incoming page fades in ON TOP
    // of the outgoing one (which stays fully opaque underneath), so the paper/
    // white background never shows through — no flash, just a native-like fade.
    function showPage(key) {
        if (key === activeKey) return;
        var outgoing = activeKey;     // the page currently visible (outgoing)
        activeKey = key;             // update now so rapid switches work
        frames.forEach(function (f) {
            var page = f.getAttribute("data-page");
            if (page === key) {
                f.style.zIndex = "3";   // incoming sits above the outgoing page
                f.classList.add("is-active");
            } else if (page === outgoing) {
                f.style.zIndex = "1";   // outgoing stays opaque, underneath
                // (kept .is-active so it remains visible during the fade)
            }
        });
        if (clearTimer) clearTimeout(clearTimer);
        clearTimer = setTimeout(function () {
            frames.forEach(function (f) {
                if (f.getAttribute("data-page") !== activeKey) {
                    f.classList.remove("is-active");
                    f.style.zIndex = "";
                }
            });
        }, 200); // a touch longer than the 0.18s opacity transition
    }

    // Profile is the initial page.
    showPage("index");

    // A half reported a link click -> switch BOTH halves to that page.
    window.addEventListener("message", function (e) {
        if (!e.data || e.data.type !== "tear-nav") return;
        if (!frames.some(function (f) { return f.contentWindow === e.source; })) return;
        showPage(pageKeyOf(e.data.url));
    });

    // Mirror scroll position between the two active halves. Works under
    // http; silently no-ops under file:// where cross-frame access is blocked.
    var syncing = false;
    function mirrorScroll(from, to) {
        if (syncing) return;
        syncing = true;
        try {
            to.contentWindow.scrollTo(from.contentWindow.scrollX, from.contentWindow.scrollY);
        } catch (e) {}
        requestAnimationFrame(function () { syncing = false; });
    }

    function activeFrames() {
        return frames.filter(function (f) { return f.classList.contains("is-active"); });
    }

    frames.forEach(function (frame) {
        frame.addEventListener("load", function () {
            try {
                frame.contentWindow.addEventListener("scroll", function () {
                    var others = activeFrames().filter(function (f) { return f !== frame; });
                    others.forEach(function (o) { mirrorScroll(frame, o); });
                });
            } catch (e) {}
        });
    });
})();
