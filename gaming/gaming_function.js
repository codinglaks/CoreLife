/* The Gaminggram script */

/* Mobile menu */
function initMobileNav() {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');

    if (!menuToggle || !navLinks) return;

    // Stagger index for the menu animation
    navLinks.querySelectorAll('a').forEach((link, index) => {
        link.style.setProperty('--nav-i', index);
    });

    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // Close the menu after a link click
    document.querySelectorAll('.nav-links a').forEach((link) => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });
}

/* UPI copy */
function initUpiCopy() {
    const copyBtn = document.querySelector('.copy-btn');
    if (!copyBtn) return;

    copyBtn.addEventListener('click', copyUpiId);
}

function copyUpiId() {
    const upiId = document.getElementById('upiId').innerText;
    const btnText = document.getElementById('copyBtnText');
    const copyBtn = document.querySelector('.copy-btn');

    navigator.clipboard.writeText(upiId).then(() => {
        btnText.innerText = 'Copied!';

        if (copyBtn) {
            copyBtn.classList.add('copied');
        }

        setTimeout(() => {
            btnText.innerText = 'Copy';
            if (copyBtn) {
                copyBtn.classList.remove('copied');
            }
        }, 2000);
    });
}

/* Scroll reveal */
function initScrollReveal() {
    const targets = document.querySelectorAll(
        '#socials.glass-card, #contact.glass-card, ' +
        '#collab.glass-card, #gamingsite.glass-card, #donate.glass-card'
    );

    if (!targets.length) return;

    // Skip animation for reduced-motion users
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        targets.forEach((el) => el.classList.add('js-reveal', 'is-visible'));
        return;
    }

    targets.forEach((el, index) => {
        el.classList.add('js-reveal');
        el.style.setProperty('--reveal-delay', `${(index % 2) * 0.12}s`);
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

    const cards = document.querySelectorAll('.glass-card, .banner-card');

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

/* Logo switcher */
function initLogoSwitcher() {
    const switcher = document.getElementById('logoSwitcher');
    const trigger = document.getElementById('logoSwitcherTrigger');
    const fan = document.getElementById('logoSwitcherFan');

    if (!switcher || !trigger || !fan) return;

    const openFan = () => {
        fan.classList.add('active');
        fan.setAttribute('aria-hidden', 'false');
        trigger.setAttribute('aria-expanded', 'true');
    };

    const closeFan = () => {
        fan.classList.remove('active');
        fan.setAttribute('aria-hidden', 'true');
        trigger.setAttribute('aria-expanded', 'false');
    };

    trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        fan.classList.contains('active') ? closeFan() : openFan();
    });

    document.addEventListener('click', (event) => {
        if (!switcher.contains(event.target)) closeFan();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && fan.classList.contains('active')) closeFan();
    });
}

/* Back button */
function initBackButton() {
    const backBtn = document.getElementById('backBtn');
    if (!backBtn) return;

    backBtn.addEventListener('click', (event) => {
        if (window.history.length > 1) {
            event.preventDefault();
            window.history.back();
        }
    });
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initUpiCopy();
    initScrollReveal();
    initCardSpotlight();
    initLogoSwitcher();
    initBackButton();
});