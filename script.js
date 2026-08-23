// VisualEdit Studio - Interactive Logic & Form Handling
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

  // Animate Stats Counters
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

  // Smooth scroll handler for both Locomotive and Native
  function smoothScrollTo(targetSelector) {
    const target = document.querySelector(targetSelector);
    if (!target) return;

    if (locoInstance) {
      locoInstance.scrollTo(target, {
        offset: -40,
        duration: 800,
        easing: [0.25, 0.0, 0.35, 1.0],
      });
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Locomotive Scroll Initialization / Fallback
  if (!scrollContainer || typeof window.LocomotiveScroll === "undefined") {
    console.info("Using Native Scroll Engine.");
    
    // Native anchor links
    document.querySelectorAll("[data-scroll-to]").forEach((a) => {
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href");
        if (href && href.startsWith("#")) {
          e.preventDefault();
          smoothScrollTo(href);
        }
      });
    });

    // Native IntersectionObserver for stats counter
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
        { root: null, rootMargin: "0px", threshold: 0.25 }
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

    // Progress bar update
    function updateProgress() {
      const st = window.scrollY || document.documentElement.scrollTop || 0;
      const docH = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
      );
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const max = Math.max(1, docH - vh);
      const p = Math.min(1, Math.max(0, st / max));
      setProgress(p);
    }
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();
  } else {
    // Locomotive Scroll Engine
    const scroll = new window.LocomotiveScroll({
      el: scrollContainer,
      smooth: true,
      lerp: 0.09,
      multiplier: 1,
      smartphone: { smooth: true },
      tablet: { smooth: true },
    });
    locoInstance = scroll;

    // Handle anchor clicks
    document.querySelectorAll("[data-scroll-to]").forEach((a) => {
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href");
        if (href && href.startsWith("#")) {
          e.preventDefault();
          smoothScrollTo(href);
        }
      });
    });

    // Trigger counters via Locomotive Scroll call
    scroll.on("call", (func, direction) => {
      if (func === "stats" && direction === "enter") {
        animateCounters();
      }
    });

    const ro = new ResizeObserver(() => scroll.update());
    ro.observe(scrollContainer);
    window.addEventListener("load", () => scroll.update());
    window.addEventListener("resize", () => scroll.update());

    // Update scroll calculations once all images finish loading
    document.querySelectorAll("img").forEach((img) => {
      if (img.complete) {
        scroll.update();
      } else {
        img.addEventListener("load", () => scroll.update());
      }
    });

    const toTop = document.getElementById("to-top");
    function updateProgressFromLoco(args) {
      const y = args.scroll && typeof args.scroll.y === "number" ? args.scroll.y : 0;
      if (toTop) toTop.classList.toggle("is-visible", y > 400);
      const limit = args.limit && typeof args.limit.y === "number"
        ? args.limit.y
        : scroll.el.scrollHeight - scroll.el.clientHeight;
      const max = Math.max(1, limit);
      const p = Math.min(1, Math.max(0, y / max));
      setProgress(p);
    }
    scroll.on("scroll", updateProgressFromLoco);

    try {
      setProgress(0);
      setTimeout(() => {
        updateProgressFromLoco({
          scroll: { y: 0 },
          limit: { y: scroll.el.scrollHeight - scroll.el.clientHeight },
        });
      }, 50);
    } catch (_) {}
  }

  // Footer Year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Video Sample Autoplay & Modal
  function bindSamples() {
    document.querySelectorAll(".sample").forEach((card) => {
      const video = card.querySelector(".sample__video");
      if (!video) return;

      card.addEventListener("mouseenter", () => {
        if (video.readyState < 2) video.load();
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {});
        }
      });

      card.addEventListener("mouseleave", () => {
        video.pause();
        video.currentTime = 0;
      });

      card.addEventListener("click", () =>
        openVideoModal(card.getAttribute("data-video") || "")
      );
    });
  }

  // Posters Click to Zoom Modal
  function bindPosters() {
    document.querySelectorAll(".poster").forEach((p) => {
      const imgEl = p.querySelector(".poster__img");
      const src = p.getAttribute("data-image") || (imgEl ? imgEl.src : "");
      p.addEventListener("click", () => openImageModal(src));
    });
  }

  // Combo Images Click to Zoom Modal
  function bindComboImages() {
    document.querySelectorAll(".combo__image--clickable").forEach((img) => {
      const src = img.getAttribute("data-image");
      img.addEventListener("click", () => openImageModal(src));
    });
  }

  function openImageModal(src) {
    const modal = document.getElementById("image-modal");
    const mi = document.getElementById("modal-image");
    if (!modal || !mi || !src) return;
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
    if (!modal || !mv || !src) return;
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
    document.querySelectorAll("[data-close-image-modal]").forEach((el) => {
      el.addEventListener("click", closeImageModal);
    });
    const imageBackdrop = document.querySelector(".image-modal__backdrop");
    if (imageBackdrop) imageBackdrop.addEventListener("click", closeImageModal);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeVideoModal();
        closeImageModal();
        closeToast();
      }
    });
  }

  // Toast Notification
  const toastModal = document.getElementById("toast-modal");
  const toastCloseBtn = document.getElementById("toast-close-btn");

  function showToast(title, body) {
    if (!toastModal) return;
    const titleEl = document.getElementById("toast-title");
    const bodyEl = document.getElementById("toast-body");
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.textContent = body;
    toastModal.classList.add("is-visible");
  }

  function closeToast() {
    if (toastModal) toastModal.classList.remove("is-visible");
  }

  if (toastCloseBtn) {
    toastCloseBtn.addEventListener("click", closeToast);
  }

  // Combo Packages Category Switcher
  function bindComboSwitcher() {
    const switchButtons = document.querySelectorAll("[data-combo-switch]");
    const pages = document.querySelectorAll("[data-combo-page]");
    if (!switchButtons.length || !pages.length) return;

    switchButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-combo-switch");
        switchButtons.forEach((item) => item.classList.toggle("is-active", item === btn));
        pages.forEach((page) => {
          const isMatch = page.getAttribute("data-combo-page") === target;
          page.classList.toggle("is-active", isMatch);
        });
        if (locoInstance) setTimeout(() => locoInstance.update(), 120);
      });
    });
  }

  // Dynamic HTML Include Loader (for shop-section.html)
  async function loadHtmlIncludes() {
    const targets = Array.from(document.querySelectorAll("[data-include]"));
    if (!targets.length) return;

    await Promise.all(
      targets.map(async (target) => {
        const url = target.getAttribute("data-include");
        if (!url) return;
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Failed to load include: ${url}`);
          const html = await response.text();
          target.outerHTML = html;
        } catch (error) {
          console.warn("Could not load HTML include:", url, error);
        }
      })
    );
  }

  // Mobile Navigation
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
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeNav));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNav();
    });
  })();

  // ------------------------------------------------------------------------
  // Form Handling & WhatsApp Formatter
  // ------------------------------------------------------------------------
  function initProjectForm() {
    const form = document.getElementById("project-form");
    const nameInput = document.getElementById("form-name");
    const phoneInput = document.getElementById("form-phone");
    const emailInput = document.getElementById("form-email");
    const serviceSelect = document.getElementById("form-service");
    const budgetSelect = document.getElementById("form-budget");
    const urgencySelect = document.getElementById("form-urgency");
    const linkInput = document.getElementById("form-link");
    const messageInput = document.getElementById("form-message");
    const charCounter = document.getElementById("char-counter");
    const alertBox = document.getElementById("form-alert");
    const btnWhatsapp = document.getElementById("btn-whatsapp-submit");

    if (!form) return;

    // Character counter
    if (messageInput && charCounter) {
      messageInput.addEventListener("input", () => {
        const len = messageInput.value.length;
        charCounter.textContent = `${len}/500`;
        if (len > 500) {
          charCounter.style.color = "#f43f5e";
        } else {
          charCounter.style.color = "";
        }
      });
    }

    function showAlert(msg, isSuccess = true) {
      if (!alertBox) return;
      alertBox.textContent = msg;
      alertBox.className = `form-alert ${isSuccess ? "is-success" : "is-error"}`;
      alertBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function clearAlert() {
      if (!alertBox) return;
      alertBox.textContent = "";
      alertBox.className = "form-alert";
    }

    function validateForm() {
      clearAlert();
      const name = nameInput ? nameInput.value.trim() : "";
      const phone = phoneInput ? phoneInput.value.trim() : "";
      const service = serviceSelect ? serviceSelect.value : "";
      const message = messageInput ? messageInput.value.trim() : "";

      if (!name) {
        showAlert("⚠️ Please enter your name.", false);
        if (nameInput) nameInput.focus();
        return false;
      }
      if (!phone) {
        showAlert("⚠️ Please enter your WhatsApp or phone number.", false);
        if (phoneInput) phoneInput.focus();
        return false;
      }
      if (!service) {
        showAlert("⚠️ Please select the service you require.", false);
        if (serviceSelect) serviceSelect.focus();
        return false;
      }
      if (!message) {
        showAlert("⚠️ Please describe your project requirements.", false);
        if (messageInput) messageInput.focus();
        return false;
      }
      return true;
    }

    function getFormattedWhatsAppUrl() {
      const name = nameInput.value.trim();
      const phone = phoneInput.value.trim();
      const email = emailInput && emailInput.value.trim() ? emailInput.value.trim() : "Not provided";
      const service = serviceSelect.value;
      const budget = budgetSelect ? budgetSelect.value : "Standard";
      const urgency = urgencySelect ? urgencySelect.value : "Standard";
      const link = linkInput && linkInput.value.trim() ? linkInput.value.trim() : "Will share footage directly";
      const message = messageInput.value.trim();

      const text = `👋 *New Project Inquiry - VisualEdit*\n\n` +
        `👤 *Name:* ${name}\n` +
        `📱 *WhatsApp:* ${phone}\n` +
        `📧 *Email:* ${email}\n` +
        `🎬 *Service:* ${service}\n` +
        `💰 *Estimated Budget:* ${budget}\n` +
        `⚡ *Urgency:* ${urgency}\n` +
        `🔗 *Footage/Ref Link:* ${link}\n\n` +
        `📝 *Project Details:*\n${message}\n\n` +
        `_Sent via VisualEdit Studio Website_`;

      return `https://wa.me/6355705208?text=${encodeURIComponent(text)}`;
    }

    // Direct WhatsApp Submission
    if (btnWhatsapp) {
      btnWhatsapp.addEventListener("click", (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        const waUrl = getFormattedWhatsAppUrl();
        window.open(waUrl, "_blank", "noopener,noreferrer");

        showAlert("✅ Opening WhatsApp with your pre-filled inquiry details! We'll reply shortly.", true);
        showToast(
          "Inquiry Prepared!",
          "WhatsApp has been opened with your project details. Simply hit send to connect with us immediately!"
        );
      });
    }

    // Regular Form Submission
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validateForm()) return;

      showAlert("✅ Inquiry received! We'll reach out to your WhatsApp/Phone shortly.", true);
      showToast(
        "Thank you, " + (nameInput.value.trim() || "Creator") + "!",
        "Your project inquiry has been received. Our team will contact you on WhatsApp/Email within 1-2 hours."
      );

      form.reset();
      if (charCounter) charCounter.textContent = "0/500";
    });
  }

  // Copy message helper for social cards
  function initSocialCopyLinks() {
    document.querySelectorAll("[data-copy-message]").forEach((el) => {
      el.addEventListener("click", () => {
        const text = el.getAttribute("data-copy-message");
        if (text && navigator.clipboard) {
          navigator.clipboard.writeText(text).catch(() => {});
        }
      });
    });
  }

  // Initialize all components
  bindSamples();
  bindPosters();
  bindComboImages();
  bindModalClose();
  bindComboSwitcher();
  initProjectForm();
  initSocialCopyLinks();

  loadHtmlIncludes().then(() => {
    bindComboImages();
    bindComboSwitcher();
    if (locoInstance) locoInstance.update();
  });
})();
