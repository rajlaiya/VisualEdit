// Initialize Locomotive Scroll and set up interactions
(function () {
  const scrollContainer = document.querySelector("[data-scroll-container]");
  let countersStarted = false;
  let locoInstance = null;

  function animateCounters() {
    if (countersStarted) return;
    countersStarted = true;
    const duration = 1600; // ms
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    document.querySelectorAll(".stat__number").forEach((el) => {
      const target = parseInt(el.getAttribute("data-target") || "0", 10);
      const suffix = el.getAttribute("data-suffix") || "";
      const startTime = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - startTime) / duration);
        const eased = easeOutCubic(p);
        const value = Math.round(target * eased);
        el.textContent = value.toLocaleString() + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  // Guard when CDN fails or element missing
  if (!scrollContainer || typeof window.LocomotiveScroll === "undefined") {
    console.warn(
      "LocomotiveScroll not available or container missing. Falling back to native behavior."
    );
    // Native anchor smooth scroll as a minimal fallback
    document.querySelectorAll("[data-scroll-to]").forEach((a) => {
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href");
        if (href && href.startsWith("#")) {
          const el = document.querySelector(href);
          if (el) {
            e.preventDefault();
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      });
    });

    // Fallback: use IntersectionObserver to trigger counters
    const statsGrid = document.querySelector(".stats__grid");
    if (statsGrid && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animateCounters();
              io.disconnect();
            }
          });
        },
        { root: null, rootMargin: "0px", threshold: 0.3 }
      );
      io.observe(statsGrid);
    }
    // Back to top visibility on native scroll
    const toTop = document.getElementById("to-top");
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      if (toTop) toTop.classList.toggle("is-visible", y > 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Smooth theme interpolation based on scroll progress (native)
    function lerp(a, b, t) {
      return a + (b - a) * t;
    }
    function lerpColorRGB(c1, c2, t) {
      return `rgb(${Math.round(lerp(c1[0], c2[0], t))}, ${Math.round(
        lerp(c1[1], c2[1], t)
      )}, ${Math.round(lerp(c1[2], c2[2], t))})`;
    }
    const L_BG = [248, 250, 252],
      D_BG = [11, 18, 32];
    const L_FG = [15, 23, 42],
      D_FG = [229, 231, 235];
    const L_CARD = [255, 255, 255],
      D_CARD = [15, 23, 42];
    const L_MUTED = [71, 85, 105],
      D_MUTED = [203, 213, 225];

    function getProgressNative() {
      const scrollTop =
        window.scrollY || document.documentElement.scrollTop || 0;
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
      );
      const viewport =
        window.innerHeight || document.documentElement.clientHeight;
      const max = Math.max(1, docHeight - viewport);
      return Math.min(1, Math.max(0, scrollTop / max));
    }
    function applyThemeByProgress(p) {
      // ease slightly for smoother look
      const t = 1 - Math.pow(1 - p, 2);
      const bg = lerpColorRGB(L_BG, D_BG, t);
      const fg = lerpColorRGB(L_FG, D_FG, t);
      const card = lerpColorRGB(L_CARD, D_CARD, t);
      const muted = lerpColorRGB(L_MUTED, D_MUTED, t);
      // header bg uses transparency; interpolate on underlying rgb and keep alpha similar to light/dark
      const headerLight = { rgb: L_BG, a: 0.7 };
      const headerDark = { rgb: [2, 6, 23], a: 0.7 };
      const hb = [
        Math.round(lerp(headerLight.rgb[0], headerDark.rgb[0], t)),
        Math.round(lerp(headerLight.rgb[1], headerDark.rgb[1], t)),
        Math.round(lerp(headerLight.rgb[2], headerDark.rgb[2], t)),
      ];
      const headerBg = `rgba(${hb[0]}, ${hb[1]}, ${hb[2]}, ${lerp(
        headerLight.a,
        headerDark.a,
        t
      ).toFixed(2)})`;
      const headerBorder = `rgba(${Math.round(lerp(2, 255, t))}, ${Math.round(
        lerp(6, 255, t)
      )}, ${Math.round(lerp(23, 255, t))}, ${lerp(0.06, 0.06, t).toFixed(2)})`;

      const s = document.body.style;
      s.setProperty("--bg", bg);
      s.setProperty("--fg", fg);
      s.setProperty("--card", card);
      s.setProperty("--muted", muted);
      s.setProperty("--header-bg", headerBg);
      s.setProperty("--header-border", headerBorder);
    }
    function updateThemeNative() {
      applyThemeByProgress(getProgressNative());
    }
    window.addEventListener("scroll", updateThemeNative, { passive: true });
    window.addEventListener("resize", updateThemeNative);
    updateThemeNative();
  } else {
    const scroll = new window.LocomotiveScroll({
      el: scrollContainer,
      smooth: true,
      lerp: 0.09, // easing (0->1)
      multiplier: 1,
      smartphone: { smooth: true },
      tablet: { smooth: true },
    });
    locoInstance = scroll;

    // Handle anchor clicks with locomotive scroll
    document.querySelectorAll("[data-scroll-to]").forEach((a) => {
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href");
        if (href && href.startsWith("#")) {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) {
            scroll.scrollTo(target, {
              offset: -60,
              duration: 800,
              easing: [0.25, 0.0, 0.35, 1.0],
            });
          }
        }
      });
    });

    // Trigger counters when stats grid enters viewport via Locomotive Scroll
    // Using data-scroll-call="stats" on the grid element
    scroll.on("call", (func, direction, obj) => {
      if (func === "stats" && direction === "enter") {
        animateCounters();
      }
    });

    // Update scroll on resize/content changes
    const ro = new ResizeObserver(() => scroll.update());
    ro.observe(scrollContainer);
    window.addEventListener("load", () => scroll.update());
    window.addEventListener("resize", () => scroll.update());

    // Back to top visibility via Locomotive Scroll
    const toTop = document.getElementById("to-top");
    // Smooth theme interpolation using Locomotive scroll progress
    function lerp(a, b, t) {
      return a + (b - a) * t;
    }
    function lerpColorRGB(c1, c2, t) {
      return `rgb(${Math.round(lerp(c1[0], c2[0], t))}, ${Math.round(
        lerp(c1[1], c2[1], t)
      )}, ${Math.round(lerp(c1[2], c2[2], t))})`;
    }
    const L_BG = [248, 250, 252],
      D_BG = [11, 18, 32];
    const L_FG = [15, 23, 42],
      D_FG = [229, 231, 235];
    const L_CARD = [255, 255, 255],
      D_CARD = [15, 23, 42];
    const L_MUTED = [71, 85, 105],
      D_MUTED = [203, 213, 225];
    function applyThemeByProgress(p) {
      const t = 1 - Math.pow(1 - p, 2);
      const bg = lerpColorRGB(L_BG, D_BG, t);
      const fg = lerpColorRGB(L_FG, D_FG, t);
      const card = lerpColorRGB(L_CARD, D_CARD, t);
      const muted = lerpColorRGB(L_MUTED, D_MUTED, t);
      const headerLight = { rgb: L_BG, a: 0.7 };
      const headerDark = { rgb: [2, 6, 23], a: 0.7 };
      const hb = [
        Math.round(lerp(headerLight.rgb[0], headerDark.rgb[0], t)),
        Math.round(lerp(headerLight.rgb[1], headerDark.rgb[1], t)),
        Math.round(lerp(headerLight.rgb[2], headerDark.rgb[2], t)),
      ];
      const headerBg = `rgba(${hb[0]}, ${hb[1]}, ${hb[2]}, ${lerp(
        headerLight.a,
        headerDark.a,
        t
      ).toFixed(2)})`;
      const headerBorder = `rgba(${Math.round(lerp(2, 255, t))}, ${Math.round(
        lerp(6, 255, t)
      )}, ${Math.round(lerp(23, 255, t))}, ${lerp(0.06, 0.06, t).toFixed(2)})`;
      const s = document.body.style;
      s.setProperty("--bg", bg);
      s.setProperty("--fg", fg);
      s.setProperty("--card", card);
      s.setProperty("--muted", muted);
      s.setProperty("--header-bg", headerBg);
      s.setProperty("--header-border", headerBorder);
    }
    function getProgressLoco(args) {
      const y =
        args.scroll && typeof args.scroll.y === "number" ? args.scroll.y : 0;
      const limit =
        args.limit && typeof args.limit.y === "number"
          ? args.limit.y
          : scroll.el.scrollHeight - scroll.el.clientHeight;
      const max = Math.max(1, limit);
      return Math.min(1, Math.max(0, y / max));
    }
    scroll.on("scroll", (args) => {
      const y =
        args.scroll && typeof args.scroll.y === "number" ? args.scroll.y : 0;
      if (toTop) toTop.classList.toggle("is-visible", y > 400);
      applyThemeByProgress(getProgressLoco(args));
    });
    // initial
    if (toTop) toTop.classList.remove("is-visible");
    // set starting theme
    applyThemeByProgress(0);

    // Optional: reveal classes already managed via data-scroll-class="is-inview"
  }

  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  // Samples: hover to autoplay, click to open modal
  function bindSamples() {
    document.querySelectorAll(".sample").forEach((card) => {
      const video = card.querySelector(".sample__video");
      if (!video) return;
      // Hover autoplay
      card.addEventListener("mouseenter", () => {
        if (video.readyState < 2) video.load();
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {
            /* ignore autoplay block */
          });
        }
      });
      card.addEventListener("mouseleave", () => {
        video.pause();
        video.currentTime = 0;
      });
      // Click to open modal
      card.addEventListener("click", () =>
        openVideoModal(card.getAttribute("data-video") || "")
      );
    });
  }

  function openVideoModal(src) {
    const modal = document.getElementById("video-modal");
    const mv = document.getElementById("modal-video");
    if (!modal || !mv) return;
    if (locoInstance) locoInstance.stop();
    document.body.style.overflow = "hidden";
    mv.src = src;
    modal.classList.add("is-open");
    setTimeout(() => {
      try {
        mv.play();
      } catch (_) {}
    }, 50);
  }

  function closeVideoModal() {
    const modal = document.getElementById("video-modal");
    const mv = document.getElementById("modal-video");
    if (!modal || !mv) return;
    mv.pause();
    mv.removeAttribute("src");
    mv.load();
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    if (locoInstance) locoInstance.start();
  }

  function bindModalClose() {
    document.querySelectorAll("[data-close-modal]").forEach((el) => {
      el.addEventListener("click", closeVideoModal);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeVideoModal();
    });
  }

  bindSamples();
  bindModalClose();

  // Mobile navigation toggle
  (function bindMobileNav() {
    const btn = document.querySelector(".nav-toggle");
    const nav = document.getElementById("primary-nav");
    const backdrop = document.querySelector(".nav-backdrop");
    if (!btn || !nav) return;
    function openNav() {
      document.body.classList.add("nav-open");
      nav.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
    }
    function closeNav() {
      document.body.classList.remove("nav-open");
      nav.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    }
    btn.addEventListener("click", () => {
      const isOpen = nav.classList.contains("is-open");
      isOpen ? closeNav() : openNav();
    });
    if (backdrop) backdrop.addEventListener("click", closeNav);
    // Close when clicking a link
    nav
      .querySelectorAll("a")
      .forEach((a) => a.addEventListener("click", closeNav));
    // Close on Escape key when menu is open
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNav();
    });
  })();
})();
