// Initialize Locomotive Scroll and set up interactions
(function () {
  const scrollContainer = document.querySelector("[data-scroll-container]");
  let countersStarted = false;
  let locoInstance = null;
  const progressEl = document.getElementById("scroll-progress");
  function setProgress(p) {
    if (!progressEl) return;
    const clamped = Math.min(1, Math.max(0, p || 0));
    progressEl.style.width = `${(clamped * 100).toFixed(2)}%`;
  }

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
      "LocomotiveScroll not available or container missing. Falling back to native behavior.",
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
        { root: null, rootMargin: "0px", threshold: 0.3 },
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

    // Progress bar update (native)
    function updateProgress() {
      const st = window.scrollY || document.documentElement.scrollTop || 0;
      const docH = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight,
      );
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const max = Math.max(1, docH - vh);
      const p = Math.min(1, Math.max(0, st / max));
      setProgress(p);
    }
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();

    // Theme interpolation removed: keep site in consistent dark theme (CSS handles defaults)
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
    function updateProgressFromLoco(args) {
      const y =
        args.scroll && typeof args.scroll.y === "number" ? args.scroll.y : 0;
      if (toTop) toTop.classList.toggle("is-visible", y > 400);
      const limit =
        args.limit && typeof args.limit.y === "number"
          ? args.limit.y
          : scroll.el.scrollHeight - scroll.el.clientHeight;
      const max = Math.max(1, limit);
      const p = Math.min(1, Math.max(0, y / max));
      setProgress(p);
    }
    scroll.on("scroll", updateProgressFromLoco);
    // initial
    if (toTop) toTop.classList.remove("is-visible");
    // Initialize progress at current position (0 on first paint)
    try {
      setProgress(0);
      // After locomotive computes limits, set again
      setTimeout(() => {
        updateProgressFromLoco({
          scroll: { y: 0 },
          limit: { y: scroll.el.scrollHeight - scroll.el.clientHeight },
        });
      }, 50);
    } catch (_) {}
    // Theme interpolation removed: dark theme is static via CSS variables

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
        openVideoModal(card.getAttribute("data-video") || ""),
      );
    });
  }

  // Posters: click to open image modal
  function bindPosters() {
    const posters = document.querySelectorAll(".poster");
    if (!posters.length) return;
    posters.forEach((p) => {
      const imgEl = p.querySelector(".poster__img");
      const src = p.getAttribute("data-image") || (imgEl ? imgEl.src : "");
      p.addEventListener("click", () => openImageModal(src));
    });
  }

  // Combo Images: click to open image modal
  function bindComboImages() {
    const comboImages = document.querySelectorAll(".combo__image--clickable");
    if (!comboImages.length) return;
    comboImages.forEach((img) => {
      const src = img.getAttribute("data-image");
      img.addEventListener("click", () => openImageModal(src));
    });
  }

  function openImageModal(src) {
    const modal = document.getElementById("image-modal");
    const mi = document.getElementById("modal-image");
    if (!modal || !mi) return;
    if (locoInstance) locoInstance.stop();
    document.body.style.overflow = "hidden";
    mi.src = src;
    modal.classList.add("is-open");
  }

  function closeImageModal() {
    const modal = document.getElementById("image-modal");
    const mi = document.getElementById("modal-image");
    if (!modal || !mi) return;
    modal.classList.remove("is-open");
    mi.removeAttribute("src");
    document.body.style.overflow = "";
    if (locoInstance) locoInstance.start();
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
      if (e.key === "Escape") {
        closeVideoModal();
        closeImageModal();
      }
    });
    // Image modal close bindings
    document
      .querySelectorAll("[data-close-image-modal]")
      .forEach((el) => el.addEventListener("click", closeImageModal));
    const imageBackdrop = document.querySelector(".image-modal__backdrop");
    if (imageBackdrop) imageBackdrop.addEventListener("click", closeImageModal);
  }

  bindSamples();
  bindPosters();
  bindComboImages();
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
