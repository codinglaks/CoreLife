/* Collaboration form script */
(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /* Date selectors */
  const daySelect = document.getElementById('selectDay');
  const monthSelect = document.getElementById('selectMonth');
  const yearSelect = document.getElementById('selectYear');
  const currentYear = new Date().getFullYear();

  function populateYears() {
    for (let y = currentYear; y <= currentYear + 5; y++) {
      const opt = document.createElement('option');
      opt.value = String(y);
      opt.textContent = String(y);
      yearSelect.appendChild(opt);
    }
  }

  function daysInMonth(month, year) {
    // Month is 1-12; day 0 is the previous month's last day
    return new Date(year || currentYear, month || 12, 0).getDate();
  }

  function refreshDayOptions() {
    const month = parseInt(monthSelect.value, 10) || null;
    const year = parseInt(yearSelect.value, 10) || null;
    const maxDay = daysInMonth(month, year);
    const previousValue = daySelect.value;

    // Rebuild days, keeping the selection if still valid
    daySelect.innerHTML = '<option value="" disabled>Day</option>';
    for (let d = 1; d <= maxDay; d++) {
      const opt = document.createElement('option');
      opt.value = String(d);
      opt.textContent = String(d);
      daySelect.appendChild(opt);
    }

    if (previousValue && parseInt(previousValue, 10) <= maxDay) {
      daySelect.value = previousValue;
    } else {
      daySelect.selectedIndex = 0;
    }
  }

  populateYears();
  refreshDayOptions();
  monthSelect.addEventListener('change', refreshDayOptions);
  yearSelect.addEventListener('change', refreshDayOptions);

  /* Validation and submit */
  const form = document.getElementById('collabForm');
  const successCard = document.getElementById('successCard');
  const submitBtn = document.getElementById('submitBtn');
  const resetBtn = document.getElementById('resetFormBtn');

  const fullNameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const websiteInput = document.getElementById('website');
  const businessNumberInput = document.getElementById('businessNumber');
  const whatsappNumberInput = document.getElementById('whatsappNumber');
  const collabTopicInput = document.getElementById('collabTopic');
  const describeCollabInput = document.getElementById('describeCollab');
  const notesInput = document.getElementById('notes');

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_PATTERN = /^\+?[0-9\s-]{7,17}$/;

  function isValidUrl(value) {
    let candidate = value.trim();
    if (!candidate) return false;
    if (!/^https?:\/\//i.test(candidate)) candidate = 'https://' + candidate;
    try {
      const url = new URL(candidate);
      return url.hostname.includes('.');
    } catch (e) {
      return false;
    }
  }

  function normalizeUrlOnBlur(input) {
    input.addEventListener('blur', () => {
      const value = input.value.trim();
      if (value && !/^https?:\/\//i.test(value) && isValidUrl(value)) {
        input.value = 'https://' + value;
      }
    });
  }

  // Required fields: text input, radio group or date group
  const fieldConfigs = [
    { type: 'text', el: fullNameInput, errorId: 'fullName-error', message: 'Please enter your full name.' },
    { type: 'radio', name: 'channel', errorId: 'channel-error', message: 'Please select a channel.' },
    { type: 'radio', name: 'platform', errorId: 'platform-error', message: 'Please select a platform.' },
    { type: 'radio', name: 'videoFormat', errorId: 'videoFormat-error', message: 'Please select a video format.' },
    { type: 'radio', name: 'collabType', errorId: 'collabType-error', message: 'Please select a collaboration type.' },
    { type: 'radio', name: 'collabScope', errorId: 'collabScope-error', message: 'Please select a collaboration scope.' },
    { type: 'date', errorId: 'date-error', message: 'Please select a day, month and year.' },
    { type: 'text', el: collabTopicInput, errorId: 'collabTopic-error', message: 'Please enter a collaboration topic.' },
    { type: 'text', el: describeCollabInput, errorId: 'describeCollab-error', message: 'Please describe the collaboration.' },
    { type: 'text', el: notesInput, errorId: 'notes-error', message: 'Please add a note here.' },
    { type: 'text', el: businessNumberInput, errorId: 'businessNumber-error', message: 'Please enter a valid business number.', validate: (v) => PHONE_PATTERN.test(v.trim()) },
    { type: 'text', el: whatsappNumberInput, errorId: 'whatsappNumber-error', message: 'Please enter a valid WhatsApp number.', validate: (v) => PHONE_PATTERN.test(v.trim()) },
    { type: 'text', el: emailInput, errorId: 'email-error', message: 'Please enter a valid email address.', validate: (v) => EMAIL_PATTERN.test(v.trim()) },
    { type: 'text', el: websiteInput, errorId: 'website-error', message: 'Please enter a valid website URL.', validate: isValidUrl }
  ];

  function getFieldWrapper(config) {
    if (config.type === 'text') {
      return config.el.closest('.field');
    }
    if (config.type === 'date') {
      return form.querySelector('[data-group="date"]').closest('.field');
    }
    return form.querySelector(`[data-group="${config.name}"]`).closest('.field');
  }

  function showError(config) {
    const wrapper = getFieldWrapper(config);
    const errorEl = document.getElementById(config.errorId);
    errorEl.textContent = config.message;
    errorEl.classList.add('is-active');
    // Restart the shake animation
    wrapper.classList.remove('has-error');
    void wrapper.offsetWidth;
    wrapper.classList.add('has-error');
  }

  function clearError(config) {
    const wrapper = getFieldWrapper(config);
    const errorEl = document.getElementById(config.errorId);
    wrapper.classList.remove('has-error');
    errorEl.classList.remove('is-active');
    errorEl.textContent = '';
  }

  function isFieldValid(config) {
    if (config.type === 'text') {
      const value = config.el.value.trim();
      if (value.length === 0) return false;
      return config.validate ? config.validate(value) : true;
    }
    if (config.type === 'date') {
      return !!(daySelect.value && monthSelect.value && yearSelect.value);
    }
    return !!form.querySelector(`input[name="${config.name}"]:checked`);
  }

  function validateField(config, { silent = false } = {}) {
    const valid = isFieldValid(config);
    if (valid) {
      clearError(config);
    } else if (!silent) {
      showError(config);
    }
    return valid;
  }

  function focusField(config) {
    if (config.type === 'text') {
      config.el.focus();
    } else if (config.type === 'date') {
      (daySelect.value ? (monthSelect.value ? yearSelect : monthSelect) : daySelect).focus();
    } else {
      const firstOption = form.querySelector(`input[name="${config.name}"]`);
      if (firstOption) firstOption.focus();
    }
  }

  function validateAll() {
    let allValid = true;
    let firstInvalidConfig = null;

    fieldConfigs.forEach((config) => {
      const valid = validateField(config);
      if (!valid) {
        allValid = false;
        if (!firstInvalidConfig) firstInvalidConfig = config;
      }
    });

    const socialValid = validateSocialLinks();
    if (!socialValid && !firstInvalidConfig) {
      firstInvalidConfig = { type: 'social' };
    }
    if (!socialValid) allValid = false;

    if (firstInvalidConfig) {
      if (firstInvalidConfig.type === 'social') {
        document.querySelector('.social-grid').scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
      } else {
        const wrapper = getFieldWrapper(firstInvalidConfig);
        wrapper.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
        focusField(firstInvalidConfig);
      }
    }

    return allValid;
  }

  // Clear an error as soon as the field is valid
  fieldConfigs.forEach((config) => {
    if (config.type === 'text') {
      config.el.addEventListener('input', () => {
        if (isFieldValid(config)) clearError(config);
      });
    }
  });

  form.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const config = fieldConfigs.find((c) => c.type === 'radio' && c.name === radio.name);
      if (config) clearError(config);
    });
  });

  [daySelect, monthSelect, yearSelect].forEach((select) => {
    select.addEventListener('change', () => {
      const config = fieldConfigs.find((c) => c.type === 'date');
      if (config && isFieldValid(config)) clearError(config);
    });
  });

  /* Social links (optional) */
  const socialFields = [
    { el: document.getElementById('socialYoutube'), label: 'YouTube' },
    { el: document.getElementById('socialFacebook'), label: 'Facebook' },
    { el: document.getElementById('socialInstagram'), label: 'Instagram' },
    { el: document.getElementById('socialLinkedin'), label: 'LinkedIn' },
    { el: document.getElementById('socialX'), label: 'X (Twitter)' }
  ];
  const socialErrorEl = document.getElementById('social-error');

  socialFields.forEach((field) => normalizeUrlOnBlur(field.el));

  function validateSocialLinks() {
    const invalidLabels = [];
    socialFields.forEach((field) => {
      const value = field.el.value.trim();
      const valid = value === '' || isValidUrl(value);
      field.el.classList.toggle('has-error', !valid);
      if (!valid) invalidLabels.push(field.label);
    });

    if (invalidLabels.length > 0) {
      socialErrorEl.textContent = `Please enter a valid link for ${invalidLabels.join(', ')}, or leave it blank.`;
      socialErrorEl.classList.add('is-active');
      return false;
    }
    socialErrorEl.classList.remove('is-active');
    socialErrorEl.textContent = '';
    return true;
  }

  socialFields.forEach((field) => {
    field.el.addEventListener('input', () => {
      if (field.el.value.trim() === '' || isValidUrl(field.el.value.trim())) {
        field.el.classList.remove('has-error');
        if (socialFields.every((f) => f.el.value.trim() === '' || isValidUrl(f.el.value.trim()))) {
          socialErrorEl.classList.remove('is-active');
          socialErrorEl.textContent = '';
        }
      }
    });
  });

  /* Submit */
  function buildSuccessMessage() {
    const name = fullNameInput.value.trim();
    const firstName = name.split(' ')[0];
    const channel = form.querySelector('input[name="channel"]:checked');
    const platform = form.querySelector('input[name="platform"]:checked');

    const parts = [];
    if (channel) parts.push(channel.value);
    if (platform) parts.push('on ' + platform.value);
    const context = parts.length ? ` about ${parts.join(' ')}` : '';

    return `Thanks, ${firstName}! Your collaboration request${context} has been received — I'll get back to you soon.`;
  }

  // Collect fields by input name for the backend
  function collectFormData() {
    const payload = {};
    new FormData(form).forEach((value, key) => {
      payload[key] = value;
    });
    return payload;
  }

  const SUBMIT_ERROR_MESSAGE =
    "Something went wrong sending your request. Please check your connection and try again.";

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!validateAll()) return;

    submitBtn.disabled = true;
    submitBtn.classList.add('is-loading');

    fetch('/api/submit-collab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collectFormData())
    })
      .then((response) => response.json().then((body) => ({ ok: response.ok, body })))
      .then(({ ok, body }) => {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;

        if (!ok || !body.success) {
          window.alert((body && body.message) || SUBMIT_ERROR_MESSAGE);
          return;
        }

        document.getElementById('successMessage').textContent = buildSuccessMessage();

        form.hidden = true;
        successCard.hidden = false;
        successCard.classList.add('is-visible'); // reveal may be skipped
        successCard.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      })
      .catch(() => {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
        window.alert(SUBMIT_ERROR_MESSAGE);
      });
  });

  resetBtn.addEventListener('click', function () {
    form.reset();
    fieldConfigs.forEach(clearError);
    socialFields.forEach((f) => f.el.classList.remove('has-error'));
    socialErrorEl.classList.remove('is-active');
    socialErrorEl.textContent = '';
    refreshDayOptions();
    successCard.hidden = true;
    form.hidden = false;
    fullNameInput.focus();
    form.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  });
})();