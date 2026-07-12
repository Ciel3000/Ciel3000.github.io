(function () {
    "use strict";

    const overlay = document.getElementById("tearOverlay");
    const tearBtn = document.getElementById("tearButton");
    const body = document.body;

    if (!overlay || !tearBtn) return;

    function tearOpen() {
        if (overlay.classList.contains("is-torn")) return;
        overlay.classList.add("is-torn");

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const delay = reduceMotion ? 300 : 950;

        window.setTimeout(function () {
            overlay.classList.add("is-hidden");
            body.classList.remove("tear-locked");
            const hero = document.getElementById("top");
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

    // The tear line itself is also a click/keyboard target.
    const tearLine = document.getElementById("tearLine");
    if (tearLine) {
        tearLine.addEventListener("click", tearOpen);
        tearLine.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                tearOpen();
            }
        });
    }

    // Lock scroll until torn
    body.classList.add("tear-locked");

    // Mobile nav toggle (progressive enhancement)
    const toggle = document.querySelector(".nav-toggle");
    const links = document.querySelector(".nav-links");
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
    const frames = Array.prototype.slice.call(document.querySelectorAll(".tear-frame"));
    if (frames.length < 2) return;

    // "Old/education.html" -> "education", "Old/index.html" -> "index"
    function pageKeyOf(url) {
        const base = (url || "").split("/").pop();
        return base.replace(/\.html$/i, "") || "index";
    }

    let activeKey = null;   // page currently shown
    let clearTimer = null;

    // Switch pages with a "cover" crossfade: the incoming page fades in ON TOP
    // of the outgoing one (which stays fully opaque underneath), so the paper/
    // white background never shows through — no flash, just a native-like fade.
    function showPage(key) {
        if (key === activeKey) return;
        const outgoing = activeKey;     // the page currently visible (outgoing)
        activeKey = key;             // update now so rapid switches work
        frames.forEach(function (f) {
            const page = f.dataset.page;
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
                if (f.dataset.page !== activeKey) {
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
        if (!e.data?.type || e.data.type !== "tear-nav") return;
        if (e.origin !== window.location.origin) return; // Verify origin
        if (!frames.some(function (f) { return f.contentWindow === e.source; })) return;
        showPage(pageKeyOf(e.data.url));
    });

    // Mirror scroll position between the two active halves. Works under
    // http; silently no-ops under file:// where cross-frame access is blocked.
    let syncing = false;
    function mirrorScroll(from, to) {
        if (syncing) return;
        syncing = true;
        to.contentWindow.scrollTo(from.contentWindow.scrollX, from.contentWindow.scrollY);
        requestAnimationFrame(function () { syncing = false; });
    }

    function activeFrames() {
        return frames.filter(function (f) { return f.classList.contains("is-active"); });
    }

    function onFrameScroll(frame) {
        const others = activeFrames().filter(function (f) { return f !== frame; });
        others.forEach(function (o) { mirrorScroll(frame, o); });
    }

    frames.forEach(function (frame) {
        frame.addEventListener("load", function () {
            frame.contentWindow.addEventListener("scroll", onFrameScroll);
        });
    });
})();

// Collapsible skill groups: add a "See more" toggle only when chips overflow
// the box. Without JS the groups stay fully open (progressive enhancement).
(function () {
    "use strict";
    const groups = document.querySelectorAll(".skill-group");
    const COLLAPSED_MAX = 168; // must match the CSS max-height

    groups.forEach(function (group) {
        const row = group.querySelector(".chip-row");
        if (!row) return;

        // Measure the natural (unconstrained) height of the chip row.
        const prevMax = row.style.maxHeight;
        row.style.maxHeight = "none";
        const natural = row.scrollHeight;
        row.style.maxHeight = prevMax;

        // No overflow -> leave the group fully open, no toggle needed.
        if (natural <= COLLAPSED_MAX + 8) return;

        group.classList.add("is-collapsible");

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "chip-toggle";
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "See more";
        group.appendChild(toggle);

        toggle.addEventListener("click", function () {
            const expanded = group.classList.toggle("is-expanded");
            toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
            toggle.textContent = expanded ? "See less" : "See more";
        });
    });
})();

// Interactive tear gap: cursor proximity widens the seam
(function () {
    "use strict";
    const overlay = document.getElementById("tearOverlay");
    if (!overlay) return;

    // Respect reduced motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const MIN_GAP = 8;
    const MAX_GAP = 60;
    const MAX_DISTANCE_RATIO = 0.4; // 40% of viewport width for full effect

    function onMouseMove(e) {
        if (overlay.classList.contains("is-torn")) return;

        const centerX = window.innerWidth / 2;
        const distance = Math.abs(e.clientX - centerX);
        const maxDist = window.innerWidth * MAX_DISTANCE_RATIO;

        const proximity = Math.max(0, 1 - distance / maxDist);
        const gap = MIN_GAP + (MAX_GAP - MIN_GAP) * proximity;

        overlay.style.setProperty("--tear-gap", Math.round(gap) + "px");
    }

    function onMouseEnter() {
        if (overlay.classList.contains("is-torn")) return;
        // Small default gap when cursor enters the overlay
        overlay.style.setProperty("--tear-gap", MIN_GAP + "px");
    }

    function onMouseLeave() {
        if (overlay.classList.contains("is-torn")) return;
        overlay.style.setProperty("--tear-gap", "0px");
    }

    overlay.addEventListener("mousemove", onMouseMove);
    overlay.addEventListener("mouseenter", onMouseEnter);
    overlay.addEventListener("mouseleave", onMouseLeave);

    // Touch support
    overlay.addEventListener("touchmove", function (e) {
        if (overlay.classList.contains("is-torn")) return;
        const touch = e.touches[0];
        onMouseMove({ clientX: touch.clientX });
    }, { passive: true });

    overlay.addEventListener("touchstart", function (e) {
        if (overlay.classList.contains("is-torn")) return;
        const touch = e.touches[0];
        onMouseEnter();
        onMouseMove({ clientX: touch.clientX });
    }, { passive: true });

    overlay.addEventListener("touchend", onMouseLeave);
})();

// Periodic amber color shuffle: pick a random amber pair every minute.
(function () {
    "use strict";

    const AMBER_PAIRS = [
        { main: "#f2a93b", dim: "#b98428" },
        { main: "#3b8bff", dim: "#2868b9" },
        { main: "#ff3b5c", dim: "#b92848" },
        { main: "#3bff8b", dim: "#28b968" },
        { main: "#ff3bb5", dim: "#b92888" },
        { main: "#3bfff5", dim: "#28b9c9" }
    ];

    function shuffleAmber() {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        const pair = AMBER_PAIRS[array[0] % AMBER_PAIRS.length];
        const root = document.documentElement;
        root.style.setProperty("--amber", pair.main);
        root.style.setProperty("--amber-dim", pair.dim);
    }

    // Change immediately on load, then every 60 seconds.
    shuffleAmber();
    setInterval(shuffleAmber, 30000);
})();
