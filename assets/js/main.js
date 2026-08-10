(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const supportsHover = window.matchMedia("(hover: hover)").matches;
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const hasLenis = typeof window.Lenis !== "undefined";

  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);

    /* Trigger positions computed before web fonts / the hero video
       finish sizing can end up stale (esp. for elements near the
       bottom of the page, whose "start" can land past the eventual
       max scroll). Refresh once everything has actually settled. */
    window.addEventListener("load", () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
  }

  /* Lenis: buttery inertia scrolling for the whole page, synced to
     GSAP's ticker so ScrollTrigger stays in lockstep with it. Skipped
     entirely when the visitor prefers reduced motion — native scroll
     takes over and every reveal below still works, just without the
     smoothing/scrub. */
  let lenis = null;
  if (hasLenis && !prefersReducedMotion) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
    });

    if (hasGsap) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }
  }

  /* Every in-page link (nav, hero CTAs, hero-peek, footer "back to
     top") routes through Lenis for a consistent smooth scroll, with a
     native scrollIntoView fallback if Lenis didn't load. */
  const scrollToTarget = (target) => {
    if (!target) return;
    if (lenis) {
      lenis.scrollTo(target, { offset: -70, duration: 1.3 });
    } else {
      target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    }
  };

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href").slice(1);
      const target = id ? document.getElementById(id) : document.body;
      if (!target) return;
      event.preventDefault();
      scrollToTarget(target);
    });
  });

  /* Hero video: shown by default (its poster covers the load moment).
     Falls back to the animated ring graphic only on a genuine load
     failure — e.g. no assets/video/hero-ring.* files present yet. */
  const heroVideo = document.getElementById("heroVideo");
  const heroFallback = document.getElementById("heroFallback");
  if (heroVideo && heroFallback) {
    const showFallback = () => {
      heroVideo.style.display = "none";
      heroFallback.style.display = "block";
    };
    heroVideo.addEventListener("error", showFallback, true);
    window.setTimeout(() => {
      if (heroVideo.readyState === 0) showFallback();
    }, 4000);
    heroVideo.play().catch(() => {
      /* Autoplay blocked by the browser — the poster frame still shows. */
    });
  }

  /* Sticky header background on scroll */
  const header = document.getElementById("siteHeader");
  const onScroll = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Mobile nav toggle */
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");
  navToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      header.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  /* Product collection tabs (Silver / Gold), with a quick GSAP fade
     each time the visitor switches metals */
  const tabs = document.querySelectorAll(".metal-tab");
  const panels = document.querySelectorAll(".product-grid[data-panel]");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const metal = tab.dataset.metal;

      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", String(active));
      });

      panels.forEach((panel) => {
        const showing = panel.dataset.panel === metal;
        panel.hidden = !showing;
        if (showing && hasGsap) {
          gsap.from(panel.querySelectorAll(".product-card"), {
            opacity: 0,
            y: 16,
            duration: 0.5,
            ease: "power2.out",
            stagger: 0.08,
          });
        }
      });
    });
  });

  /* "Inquire" buttons -> scroll to consultation form, pre-select product */
  const interestSelect = document.getElementById("interest");
  document.querySelectorAll(".btn-inquire").forEach((btn) => {
    btn.addEventListener("click", () => {
      const product = btn.dataset.product;
      if (interestSelect && product) {
        interestSelect.value = product;
      }
      scrollToTarget(document.getElementById("consultation"));
      const nameField = document.getElementById("fullName");
      if (nameField) window.setTimeout(() => nameField.focus(), 600);
    });
  });

  /* Consultation form: client-side only (no backend wired up yet) */
  const form = document.getElementById("consultForm");
  const status = document.getElementById("formStatus");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        status.textContent = "Please fill in the required fields.";
        status.classList.add("is-error");
        return;
      }

      status.classList.remove("is-error");
      status.textContent = "Thank you — your request has been noted. Our team will reach out shortly.";
      form.reset();
    });
  }

  /* Scroll reveal: every section — the spec ticker, products, story,
     consultation, contact, and the footer — animates in via GSAP
     ScrollTrigger as it's scrolled to, with grouped items (product
     cards, story paragraphs) staggered together. Falls back to a
     plain IntersectionObserver fade if the GSAP bundle didn't load. */
  if (hasGsap) {
    /* Sets the hidden "from" state up front, then only builds/plays the
       tween once ScrollTrigger confirms the group entered view. Doing
       it this way (rather than handing scrollTrigger + stagger straight
       to gsap.from) avoids a real bug where every staggered item after
       the first stayed frozen at its from-state indefinitely. */
    const revealGroup = (targets, opts = {}) => {
      const els = gsap.utils.toArray(targets);
      if (!els.length) return;

      if (prefersReducedMotion) {
        gsap.set(els, { opacity: 1, y: 0, scale: 1 });
        return;
      }

      gsap.set(els, { opacity: 0, y: opts.y ?? 30, scale: opts.scale ?? 0.985 });
      ScrollTrigger.create({
        trigger: opts.trigger || els[0],
        // "top bottom" (element's top meets viewport's bottom) is the
        // one trigger point that's always reachable regardless of how
        // close the element sits to the end of the page — percentage
        // offsets like "top 85%" can compute a start position past the
        // document's max scroll for anything near the very bottom.
        start: opts.start || "top bottom",
        once: true,
        onEnter: () => {
          gsap.to(els, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: opts.duration || 0.9,
            ease: "power3.out",
            stagger: opts.stagger || 0,
          });
        },
      });
    };

    gsap.utils
      .toArray(
        ".ticker-inner, .section-head, .metal-tabs, .story-lead, .consult-intro, .consult-form, .contact-block, .contact-coords, .footer-inner"
      )
      .forEach((el) => revealGroup(el, { trigger: el }));

    const silverGrid = document.querySelector('.product-grid[data-panel="silver"]');
    if (silverGrid) {
      revealGroup(silverGrid.querySelectorAll(".product-card"), {
        trigger: silverGrid,
        stagger: 0.12,
      });
    }

    document.querySelectorAll(".story-copy").forEach((copy) => {
      revealGroup(copy.querySelectorAll("p"), {
        trigger: copy,
        stagger: 0.12,
        y: 24,
        scale: 1,
        duration: 0.8,
      });
    });

    /* Hero: cinematic scroll exit, scrubbed to actual scroll position
       via Lenis + ScrollTrigger rather than a manual rAF loop */
    if (!prefersReducedMotion) {
      gsap.to(".hero-frame", {
        y: 36,
        scale: 0.93,
        opacity: 0.15,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
      });
    }
  } else {
    const revealTargets = document.querySelectorAll(
      ".ticker-inner, .section-head, .metal-tabs, .product-card, .story-lead, .story-copy > p, .consult-intro, .consult-form, .contact-block, .contact-coords, .footer-inner"
    );
    revealTargets.forEach((el) => el.classList.add("reveal"));

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 }
      );
      revealTargets.forEach((el) => observer.observe(el));
    } else {
      revealTargets.forEach((el) => el.classList.add("is-visible"));
    }

    /* Hero scroll-exit fallback without GSAP */
    const heroSection = document.querySelector(".hero");
    const heroFrame = document.querySelector(".hero-frame");
    if (heroSection && heroFrame && !prefersReducedMotion) {
      let ticking = false;
      const updateHeroParallax = () => {
        const heroHeight = heroSection.offsetHeight || 1;
        const progress = Math.min(Math.max(-heroSection.getBoundingClientRect().top / heroHeight, 0), 1);
        heroFrame.style.transform = `translateY(${progress * 36}px) scale(${1 - progress * 0.07})`;
        heroFrame.style.opacity = String(1 - progress * 0.85);
        ticking = false;
      };
      window.addEventListener(
        "scroll",
        () => {
          if (!ticking) {
            window.requestAnimationFrame(updateHeroParallax);
            ticking = true;
          }
        },
        { passive: true }
      );
      updateHeroParallax();
    }
  }

  /* Subtle 3D tilt on the hero product media and card visuals,
     following the cursor with GSAP's easing for a springier feel —
     skipped on touch devices and when the visitor prefers reduced
     motion */
  const enableTilt = (container, target, maxDeg) => {
    container.addEventListener("mousemove", (event) => {
      const rect = container.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      const tiltY = `${(px * maxDeg).toFixed(2)}deg`;
      const tiltX = `${(-py * maxDeg).toFixed(2)}deg`;
      if (hasGsap) {
        gsap.to(target, { "--tilt-x": tiltX, "--tilt-y": tiltY, duration: 0.6, ease: "power3.out", overwrite: true });
      } else {
        target.style.setProperty("--tilt-x", tiltX);
        target.style.setProperty("--tilt-y", tiltY);
      }
    });
    container.addEventListener("mouseleave", () => {
      if (hasGsap) {
        gsap.to(target, { "--tilt-x": "0deg", "--tilt-y": "0deg", duration: 0.6, ease: "power3.out", overwrite: true });
      } else {
        target.style.setProperty("--tilt-x", "0deg");
        target.style.setProperty("--tilt-y", "0deg");
      }
    });
  };

  if (!prefersReducedMotion && supportsHover) {
    const heroSectionEl = document.querySelector(".hero");
    const heroMediaInner = document.querySelector("#heroMediaTilt .hero-media-inner");
    if (heroSectionEl && heroMediaInner) enableTilt(heroSectionEl, heroMediaInner, 9);

    document.querySelectorAll(".product-card").forEach((card) => {
      const visual = card.querySelector(".card-visual");
      if (visual) enableTilt(card, visual, 10);
    });
  }

  /* Footer year */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
