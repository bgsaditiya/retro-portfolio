(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Prevent spurious micro-scroll offset (e.g. font swap / scroll anchoring) on reload at top
  if (!window.location.hash) {
    const resetTopJitter = () => {
      if (window.scrollY > 0 && window.scrollY < 100) {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    };
    resetTopJitter();
    window.addEventListener('load', resetTopJitter, { once: true });
  }

  // 1. Scroll progress fallback when CSS Scroll-Driven Animations are unsupported
  const progressBar = document.getElementById('scroll-progress');
  if (progressBar && !prefersReducedMotion && !CSS.supports('animation-timeline', 'scroll()')) {
    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      progressBar.style.transform = `scaleX(${ratio})`;
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  // 2. Header scroll border state
  const header = document.querySelector('.site-header');
  if (header) {
    const syncHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 16);
    window.addEventListener('scroll', syncHeader, { passive: true });
    syncHeader();
  }

  // 3. Mobile navigation drawer
  const menuBtn = document.getElementById('menu-toggle');
  const mobileDrawer = document.getElementById('mobile-nav');
  if (menuBtn && mobileDrawer) {
    const setDrawer = (open) => {
      menuBtn.setAttribute('aria-expanded', String(open));
      mobileDrawer.hidden = !open;
    };

    menuBtn.addEventListener('click', () => {
      const isOpen = menuBtn.getAttribute('aria-expanded') === 'true';
      setDrawer(!isOpen);
    });

    mobileDrawer.addEventListener('click', (e) => {
      if (e.target.closest('a')) setDrawer(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !mobileDrawer.hidden) {
        setDrawer(false);
        menuBtn.focus();
      }
    });
  }

  // 4. Progressive-enhancement scroll reveal
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length && !prefersReducedMotion && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-motion');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    revealEls.forEach((el, idx) => {
      const delay = el.getAttribute('data-delay') || `${(idx % 3) * 80}ms`;
      el.style.setProperty('--reveal-delay', delay);
      if (el.getBoundingClientRect().top < window.innerHeight * 0.95) {
        el.classList.add('is-visible');
      } else {
        observer.observe(el);
      }
    });
  }

  // 5. Interactive Hero Mascot (eye tracking + click boop)
  const mascotBtn = document.getElementById('mascot-btn');
  const pupils = document.querySelectorAll('.mascot-pupil');
  if (mascotBtn && pupils.length && !prefersReducedMotion) {
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let rafId = null;

    const tickPupils = () => {
      curX += (targetX - curX) * 0.18;
      curY += (targetY - curY) * 0.18;
      pupils.forEach((p) => {
        p.style.transform = `translate(${curX.toFixed(2)}px, ${curY.toFixed(2)}px)`;
      });
      if (Math.abs(targetX - curX) > 0.05 || Math.abs(targetY - curY) > 0.05) {
        rafId = requestAnimationFrame(tickPupils);
      } else {
        rafId = null;
      }
    };

    window.addEventListener(
      'pointermove',
      (e) => {
        const rect = mascotBtn.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height * 0.45;
        targetX = Math.max(-4, Math.min(4, (e.clientX - cx) / 55));
        targetY = Math.max(-3, Math.min(3, (e.clientY - cy) / 55));
        if (!rafId) rafId = requestAnimationFrame(tickPupils);
      },
      { passive: true }
    );
  }

  if (mascotBtn) {
    let bubbleTimer;
    mascotBtn.addEventListener('click', () => {
      mascotBtn.classList.add('is-booped', 'show-bubble');
      setTimeout(() => mascotBtn.classList.remove('is-booped'), 220);
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(() => mascotBtn.classList.remove('show-bubble'), 1600);
    });
  }

  // 6. Copy Email Micro-Interaction
  const copyBtn = document.getElementById('copy-email-btn');
  const copyFeedback = document.getElementById('copy-feedback');
  if (copyBtn && copyFeedback) {
    let copyTimer;
    copyBtn.addEventListener('click', async () => {
      const email = copyBtn.dataset.email || 'bagasaditiya11@gmail.com';
      try {
        await navigator.clipboard.writeText(email);
        copyFeedback.textContent = 'Copied to clipboard!';
      } catch {
        copyFeedback.textContent = 'Select & copy email above.';
      }
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        copyFeedback.textContent = '';
      }, 2600);
    });
  }

  // 7. Accessible Contact Form Validation & Submission
  const form = document.getElementById('contact-form');
  const emailInput = document.getElementById('contact-email');
  const msgInput = document.getElementById('contact-message');
  const submitBtn = document.getElementById('submit-btn');
  const formStatus = document.getElementById('form-status');

  if (form && emailInput && msgInput && submitBtn && formStatus) {
    const validateField = (field) => {
      const errorEl = document.getElementById(field.getAttribute('aria-describedby'));
      if (!errorEl) return field.checkValidity();

      let msg = '';
      if (field.validity.valueMissing) {
        msg = field === emailInput ? 'Please enter your email address.' : 'Please write a short message.';
      } else if (field.validity.typeMismatch) {
        msg = 'Please enter a valid email address (e.g. name@domain.com).';
      } else if (field.validity.tooShort) {
        msg = `Please write at least ${field.minLength} characters.`;
      }

      if (msg) {
        field.setAttribute('aria-invalid', 'true');
        errorEl.textContent = msg;
        errorEl.hidden = false;
        return false;
      }

      field.removeAttribute('aria-invalid');
      errorEl.textContent = '';
      errorEl.hidden = true;
      return true;
    };

    [emailInput, msgInput].forEach((field) => {
      let touched = false;
      field.addEventListener('blur', () => {
        if (field.value.trim() !== '' || touched) {
          touched = true;
          validateField(field);
        }
      });
      field.addEventListener('input', () => {
        touched = true;
        if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailOk = validateField(emailInput);
      const msgOk = validateField(msgInput);

      if (!emailOk || !msgOk) {
        (emailOk ? msgInput : emailInput).focus();
        return;
      }

      const originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
      submitBtn.textContent = 'Sending...';
      formStatus.hidden = true;

      setTimeout(() => {
        form.reset();
        [emailInput, msgInput].forEach((f) => f.removeAttribute('aria-invalid'));
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
        submitBtn.textContent = originalLabel;
        formStatus.hidden = false;
        formStatus.textContent = '✓ Transmission sent! Bagas will reply within 24 hours.';
      }, 700);
    });
  }
})();
