/* Home page script */

/* Nav menu */
function initNavMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    if (!menuToggle || !navMenu) return;

    // Stagger index for the menu animation
    navMenu.querySelectorAll('.nav-menu-link').forEach((link, index) => {
        link.style.setProperty('--link-i', index);
    });

    const openMenu = () => {
        navMenu.classList.add('active');
        navMenu.setAttribute('aria-hidden', 'false');
        menuToggle.setAttribute('aria-expanded', 'true');
    };

    const closeMenu = () => {
        navMenu.classList.remove('active');
        navMenu.setAttribute('aria-hidden', 'true');
        menuToggle.setAttribute('aria-expanded', 'false');
    };

    menuToggle.addEventListener('click', (event) => {
        event.stopPropagation();
        navMenu.classList.contains('active') ? closeMenu() : openMenu();
    });

    navMenu.querySelectorAll('.nav-menu-link').forEach((link) => {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', (event) => {
        if (!navMenu.contains(event.target) && !menuToggle.contains(event.target)) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && navMenu.classList.contains('active')) {
            closeMenu();
        }
    });
}

/* Smooth scroll */
function initSmoothScroll() {
    document.querySelectorAll('a[data-scroll]').forEach((link) => {
        link.addEventListener('click', (event) => {
            const targetId = link.getAttribute('href').slice(1);
            const target = document.getElementById(targetId);
            if (!target) return;

            event.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

/* Scroll reveal */
function initScrollReveal() {
    const targets = document.querySelectorAll(
        '.profile-card, #collab.glass-card, #support.glass-card'
    );

    if (!targets.length) return;

    // Skip animation for reduced-motion users
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        targets.forEach((el) => el.classList.add('js-reveal', 'is-visible'));
        return;
    }

    targets.forEach((el, index) => {
        el.classList.add('js-reveal');
        el.style.setProperty('--reveal-delay', `${(index % 3) * 0.1}s`);
    });

    if (!('IntersectionObserver' in window)) {
        targets.forEach((el) => el.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    targets.forEach((el) => observer.observe(el));
}

/* Card spotlight */
function initCardSpotlight() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const cards = document.querySelectorAll('.profile-banner, .glass-card');

    cards.forEach((card) => {
        card.addEventListener('mousemove', (event) => {
            const rect = card.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 100;
            const y = ((event.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mx', `${x}%`);
            card.style.setProperty('--my', `${y}%`);
        });
    });
}

/* Pause orbs when the tab is hidden */
function initOrbPerformanceGuard() {
    const pauseOrbs = () => {
        document.body.classList.toggle('orbs-paused', document.hidden);
    };

    document.addEventListener('visibilitychange', pauseOrbs);
    pauseOrbs();
}

/* Footer year */
function initFooterYear() {
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
    initNavMenu();
    initSmoothScroll();
    initScrollReveal();
    initCardSpotlight();
    initOrbPerformanceGuard();
    initFooterYear();
});