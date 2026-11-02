/* Career page script */
(function () {
  'use strict';

  const header = document.querySelector('.site-header');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Header state on scroll */
  let lastScrollState = false;
  function updateHeaderState() {
    const scrolled = window.scrollY > 8;
    if (scrolled !== lastScrollState) {
      header.classList.toggle('is-scrolled', scrolled);
      lastScrollState = scrolled;
    }
  }
  updateHeaderState();
  window.addEventListener('scroll', updateHeaderState, { passive: true });

  /* Scroll reveal (IntersectionObserver)
     Items already on screen stay visible straight away; only items below the fold fade in. */
  const revealEls = Array.from(document.querySelectorAll('[data-reveal]'));

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const pendingEls = revealEls.filter((el) => el.getBoundingClientRect().top >= viewportH * 0.95);
    pendingEls.forEach((el) => el.classList.add('is-pending'));

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        let order = 0;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          // Small stagger for items revealed together; cleared afterwards so hover effects stay instant
          el.style.transitionDelay = Math.min(order++, 4) * 70 + 'ms';
          el.classList.add('is-visible');
          el.classList.remove('is-pending');
          observer.unobserve(el);
          window.setTimeout(() => { el.style.transitionDelay = ''; }, 1000);
        });
      },
      { threshold: 0, rootMargin: '0px 0px -30px 0px' }
    );
    pendingEls.forEach((el) => revealObserver.observe(el));
  }

  /* Hero portrait tilt (mouse devices only) */
  const heroFrame = document.querySelector('.hero-frame');
  const supportsHoverFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (heroFrame && supportsHoverFine && !prefersReducedMotion) {
    const maxTilt = 6; // degrees
    let ticking = false;
    let targetX = 0, targetY = 0;

    heroFrame.addEventListener('mousemove', (e) => {
      const rect = heroFrame.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = py * -maxTilt;
      targetY = px * maxTilt;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          heroFrame.style.transform = `rotateX(${targetX}deg) rotateY(${targetY}deg)`;
          ticking = false;
        });
        ticking = true;
      }
    });

    heroFrame.addEventListener('mouseleave', () => {
      heroFrame.style.transform = '';
    });
  }

  /* Back button */
  // Use browser history when available, else follow the link
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', function (e) {
      if (window.history.length > 1) {
        e.preventDefault();
        window.history.back();
      }
    });
  }

  /* Smooth anchor scrolling */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId.length < 2) return;
      const targetEl = document.querySelector(targetId);
      if (!targetEl) return;
      e.preventDefault();
      targetEl.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });
})();