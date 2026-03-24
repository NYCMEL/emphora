/**
 * emphora.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Emphora UI component — Vanilla JavaScript class
 * Depends on: emphora.config.js (EmophoraConfig), Bootstrap 5
 *
 * Events (published via wc.publish):
 *   emphora:login        — { email }
 *   emphora:register     — { firstName, lastName, email, accountType }
 *   emphora:logout       — {}
 *   emphora:themeChange  — { theme: 'light'|'dark' }
 *
 * Subscriptions (via wc.subscribe):
 *   emphora:login
 *   emphora:register
 *   emphora:logout
 *   emphora:themeChange
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── wc bus (lightweight pub/sub + logger) ─────────────────────────────────────
// Falls back to a self-contained bus only when _wc.js has NOT already set
// window.wc (i.e. during standalone / offline testing without _wc.js).
// In production the public/js/_wc.js script loads first and takes precedence.
(function () {
  if (window.wc) return; // don't overwrite existing wc

  const _handlers = {};

  window.wc = {
    /**
     * Publish an event with a payload.
     * All messages are logged via wc.log before dispatch.
     * @param {string} event
     * @param {*} payload
     */
    publish(event, payload) {
      wc.log(event, payload);
      if (!_handlers[event]) return;
      _handlers[event].forEach((fn) => {
        try { fn(payload, event); }
        catch (err) { console.error(`[wc] Handler error on "${event}":`, err); }
      });
    },

    /**
     * Subscribe to an event.
     * @param {string} event
     * @param {function} handler — receives (payload, event)
     * @returns {function} unsubscribe — call to remove listener
     */
    subscribe(event, handler) {
      if (!_handlers[event]) _handlers[event] = [];
      _handlers[event].push(handler);
      return function unsubscribe() {
        _handlers[event] = _handlers[event].filter((fn) => fn !== handler);
      };
    },

    /**
     * Log all published messages to the console.
     * @param {string} event
     * @param {*} payload
     */
    log(event, payload) {
      console.log(
        `%c[wc.publish] %c${event}`,
        'color:#1A6BCC;font-weight:700;',
        'color:#00897B;font-weight:600;',
        payload
      );
    },
  };
})();


// ── Emphora Class ─────────────────────────────────────────────────────────────
class Emphora {
  /**
   * @param {HTMLElement} rootEl  — the <emphora class="emphora"> element
   * @param {object}      config  — EmophoraConfig from emphora.config.js
   */
  constructor(rootEl, config) {
    this._root   = rootEl;
    this._config = config;
    this._theme  = config.app.defaultTheme || 'light';
    this._currentView = config.app.defaultView || 'login';
    this._termsChecked = false;
    this._accountType  = 'employee';
    this._unsubscribers = [];

    this._init();
  }

  // ── Initialisation ──────────────────────────────────────────────────────────
  _init() {
    this._applyTheme(this._theme, false);
    this._bindNav();
    this._bindThemeToggle();
    this._bindLoginForm();
    this._bindRegisterForm();
    this._bindPasswordToggles();
    this._bindChips();
    this._bindTermsCheckbox();
    this._updateAccountTag(this._accountType, false);
    this._bindPasswordStrength();
    this._bindRipples();
    this._bindDevBar();
    this._subscribeToEvents();
    this._showView(this._currentView, false);

    // Surface initial focus into the card
    requestAnimationFrame(() => {
      const firstInput = this._root.querySelector('.em-view--active .em-input');
      if (firstInput) firstInput.focus({ preventScroll: true });
    });
  }

  // ── Theme ───────────────────────────────────────────────────────────────────
  _applyTheme(theme, publish = true) {
    this._theme = theme;
    this._root.setAttribute('data-emphora-theme', theme);

    const btn   = this._qs('#em-theme-toggle');
    const icon  = btn?.querySelector('.material-icons-round');
    const isDark = theme === 'dark';

    if (btn)  btn.setAttribute('aria-pressed', String(isDark));
    if (icon) icon.textContent = isDark ? 'dark_mode' : 'light_mode';
    if (btn)  btn.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    if (btn)  btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');

    if (publish) {
      const payload = { theme };
      wc.log(this._config.events.themeChange, payload);
      wc.publish(this._config.events.themeChange, payload);
    }
  }

  _bindThemeToggle() {
    const btn = this._qs('#em-theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      this._addRipple(btn, e);
      const next = this._theme === 'light' ? 'dark' : 'light';
      this._applyTheme(next);
    });
  }

  // ── View Navigation ─────────────────────────────────────────────────────────
  _showView(name, animate = true) {
    this._currentView = name;
    const views = this._root.querySelectorAll('.em-view');
    views.forEach((v) => {
      const isTarget = v.id === `em-view-${name}`;
      v.classList.toggle('em-view--active', isTarget);
    });

    // Update heading for a11y
    const heading = this._qs('#em-heading');
    if (heading && name === 'login')    heading.textContent = this._config.login.heading;
    if (heading && name === 'register') heading.textContent = this._config.register.heading;

    // Announce view change to screen readers
    this._announce(name === 'login' ? 'Sign in form' : name === 'register' ? 'Create account form' : 'Success');

    if (animate) {
      requestAnimationFrame(() => {
        const active = this._root.querySelector('.em-view--active');
        const firstInput = active?.querySelector('.em-input, button.em-btn-submit');
        if (firstInput) firstInput.focus({ preventScroll: true });
      });
    }
  }

  _bindNav() {
    this._root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-em-goto]');
      if (!btn) return;
      const target = btn.dataset.emGoto;
      this._clearAllErrors();
      this._showView(target);
    });
  }

  // ── Login Form ──────────────────────────────────────────────────────────────
  _bindLoginForm() {
    const form = this._qs('#em-form-login');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this._validateLoginForm()) return;

      const email    = this._qs('#login-email').value.trim();
      const password = this._qs('#login-password').value;

      this._setLoading(true);

      try {
        const result = await this._apiLogin({ email, password });
        this._setLoading(false);

        if (result.ok) {
          const payload = { email, userId: result.userId };
          wc.log(this._config.events.login, payload);
          wc.publish(this._config.events.login, payload);
          // Show account type tag from server response (fallback to current chip selection)
          const loginType = result.user?.accountType || this._accountType;
          this._updateAccountTag(loginType, true);
          this._toast(this._config.toast.messages.loginSuccess, 'success');
          this._announce('Login successful. Welcome back.');
        } else {
          this._toast(result.message || this._config.toast.messages.loginError, 'error');
          this._setFieldError('login-email', ' ');          // highlight
          this._setFieldError('login-password', result.message || this._config.toast.messages.loginError);
        }
      } catch {
        this._setLoading(false);
        this._toast(this._config.toast.messages.networkError, 'error');
      }
    });
  }

  _validateLoginForm() {
    let valid = true;
    const v   = this._config.login.validation;

    const emailEl = this._qs('#login-email');
    const pwEl    = this._qs('#login-password');

    this._clearFieldError('login-email');
    this._clearFieldError('login-password');

    if (!emailEl.value.trim() || !new RegExp(v.email.pattern).test(emailEl.value.trim())) {
      this._setFieldError('login-email', v.email.message);
      valid = false;
    }
    if (!pwEl.value || pwEl.value.length < v.password.minLength) {
      this._setFieldError('login-password', v.password.message);
      valid = false;
    }
    if (!valid) {
      const firstErr = this._root.querySelector('[aria-invalid="true"]');
      if (firstErr) firstErr.focus();
    }
    return valid;
  }

  // ── Register Form ───────────────────────────────────────────────────────────
  _bindRegisterForm() {
    const form = this._qs('#em-form-register');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this._validateRegisterForm()) return;

      const data = {
        firstName:   this._qs('#reg-firstname').value.trim(),
        lastName:    this._qs('#reg-lastname').value.trim(),
        email:       this._qs('#reg-email').value.trim(),
        password:    this._qs('#reg-password').value,
        accountType: this._accountType,
      };

      this._setLoading(true);

      try {
        const result = await this._apiRegister(data);
        this._setLoading(false);

        if (result.ok) {
          const payload = { firstName: data.firstName, lastName: data.lastName, email: data.email, accountType: data.accountType };
          wc.log(this._config.events.register, payload);
          wc.publish(this._config.events.register, payload);
          this._toast(this._config.toast.messages.registerSuccess, 'success');
          this._showView('success');
        } else {
          this._toast(result.message || this._config.toast.messages.registerError, 'error');
        }
      } catch {
        this._setLoading(false);
        this._toast(this._config.toast.messages.networkError, 'error');
      }
    });
  }

  _validateRegisterForm() {
    let valid = true;
    const v   = this._config.register.validation;

    const fields = [
      { id: 'reg-firstname',  rule: v.firstName },
      { id: 'reg-lastname',   rule: v.lastName },
      { id: 'reg-email',      rule: v.email },
      { id: 'reg-password',   rule: v.password },
      { id: 'reg-confirm',    rule: v.confirmPassword },
    ];

    fields.forEach(({ id }) => this._clearFieldError(id));
    this._clearFieldError('reg-terms');

    fields.forEach(({ id, rule }) => {
      const el = this._qs(`#${id}`);
      if (!el) return;
      const val = el.value;

      if (rule.required && !val.trim()) {
        this._setFieldError(id, rule.message); valid = false; return;
      }
      if (rule.minLength && val.length < rule.minLength) {
        this._setFieldError(id, rule.message); valid = false; return;
      }
      if (rule.pattern && !new RegExp(rule.pattern).test(val.trim())) {
        this._setFieldError(id, rule.message); valid = false; return;
      }
      if (rule.mustMatch) {
        const other = this._qs(`#reg-${rule.mustMatch === 'password' ? 'password' : rule.mustMatch}`);
        if (other && val !== other.value) {
          this._setFieldError(id, rule.message); valid = false;
        }
      }
    });

    if (!this._termsChecked) {
      this._setFieldError('reg-terms', v.terms.message);
      valid = false;
    }

    if (!valid) {
      const firstErr = this._root.querySelector('[aria-invalid="true"]');
      if (firstErr) firstErr.focus();
    }
    return valid;
  }

  // ── Password Visibility Toggle ──────────────────────────────────────────────
  _bindPasswordToggles() {
    this._root.addEventListener('click', (e) => {
      const btn = e.target.closest('.em-pwd-toggle');
      if (!btn) return;
      const targetId = btn.dataset.target;
      const input    = this._qs(`#${targetId}`);
      if (!input) return;
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      const icon  = btn.querySelector('.material-icons-round');
      if (icon) icon.textContent = isText ? 'visibility' : 'visibility_off';
      btn.setAttribute('aria-label', isText ? 'Show password' : 'Hide password');
    });
  }

  // ── Account Type Chips ──────────────────────────────────────────────────────
  _bindChips() {
    const group = this._qs('#em-chip-group');
    if (!group) return;

    group.addEventListener('click', (e) => {
      const chip = e.target.closest('.em-chip');
      if (!chip) return;
      this._addRipple(chip, e);
      this._selectChip(chip);
    });

    // Keyboard navigation (arrow keys within radiogroup)
    group.addEventListener('keydown', (e) => {
      const chips = [...group.querySelectorAll('.em-chip')];
      const idx   = chips.indexOf(document.activeElement);
      if (idx === -1) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = chips[(idx + 1) % chips.length];
        next.focus();
        this._selectChip(next);
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = chips[(idx - 1 + chips.length) % chips.length];
        prev.focus();
        this._selectChip(prev);
      }
    });
  }

  _selectChip(active) {
    const group = this._qs('#em-chip-group');
    if (!group) return;
    group.querySelectorAll('.em-chip').forEach((c) => {
      const isActive = c === active;
      c.classList.toggle('em-chip--active', isActive);
      c.setAttribute('aria-checked', String(isActive));
      c.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    this._accountType = active.dataset.value;
    const hidden = this._qs('#reg-account-type');
    if (hidden) hidden.value = this._accountType;
    this._updateAccountTag(this._accountType, true);
  }

  // ── Terms Checkbox ──────────────────────────────────────────────────────────
  _bindTermsCheckbox() {
    const cb = this._qs('#em-terms-checkbox');
    if (!cb) return;

    const toggle = () => {
      this._termsChecked = !this._termsChecked;
      cb.setAttribute('aria-checked', String(this._termsChecked));
      const box = cb.querySelector('.em-checkbox');
      if (box) {
        box.classList.toggle('checked', this._termsChecked);
        if (this._termsChecked) {
          box.setAttribute('aria-invalid', 'false');
          cb.setAttribute('aria-invalid', 'false');
          this._clearFieldError('reg-terms');
        }
      }
    };

    cb.addEventListener('click', toggle);
    cb.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
    });
  }

  // ── Password Strength ───────────────────────────────────────────────────────
  _bindPasswordStrength() {
    const input = this._qs('#reg-password');
    if (!input) return;

    input.addEventListener('input', () => {
      this._updatePasswordStrength(input.value);
    });
  }

  _updatePasswordStrength(val) {
    const bars  = [1,2,3,4].map((n) => this._qs(`#em-psb-${n}`));
    const label = this._qs('#reg-pwd-strength-label');
    if (!bars[0]) return;

    const checks = [
      val.length >= 8,
      /[A-Z]/.test(val),
      /[0-9]/.test(val),
      /[^A-Za-z0-9]/.test(val),
    ];
    const score = checks.filter(Boolean).length;

    const levels = {
      0: { cls: '',        text: '' },
      1: { cls: 'weak',    text: 'Weak' },
      2: { cls: 'fair',    text: 'Fair' },
      3: { cls: 'good',    text: 'Good' },
      4: { cls: 'strong',  text: 'Strong' },
    };
    const { cls, text } = levels[score] || levels[0];

    bars.forEach((bar, i) => {
      bar.className = 'em-pwd-strength-bar';
      if (i < score && cls) bar.classList.add(`em-pwd-strength-bar--${cls}`);
    });

    if (label) {
      label.textContent = text;
      label.className   = `em-pwd-strength-label${cls ? ` em-pwd-strength-label--${cls}` : ''}`;
    }
  }

  // ── Dev Quick-Login Bar ─────────────────────────────────────────────────────
  _bindDevBar() {
    const cfg = this._config.devTools;
    const bar = this._qs('#em-dev-bar');
    if (!bar) return;

    // Hide bar entirely if devTools disabled in config
    if (!cfg || !cfg.enabled) {
      bar.style.display = 'none';
      return;
    }

    // Boot admin panel
    this._admin = new EmAdmin(this._root, this._config);
    const adminBtn = this._qs('#em-dev-admin');
    if (adminBtn) {
      if (!cfg.admin || !cfg.admin.enabled) {
        adminBtn.style.display = 'none';
      } else {
        adminBtn.addEventListener('click', () => this._admin.open());
      }
    }

    // Build a lookup map: button id -> account config
    const accountMap = {};
    (cfg.accounts || []).forEach(a => { accountMap[a.id] = a; });

    // Admin panel button — opens users.html in a new tab
    const adminBtn = this._qs('#em-dev-admin');
    if (adminBtn) {
      adminBtn.addEventListener('click', (e) => {
        this._addRipple(adminBtn, e);
        window.open('users.html', '_blank', 'noopener');
      });
    }

    bar.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-dev-account]');
      if (!btn) return;

      this._addRipple(btn, e);

      const account = accountMap[btn.dataset.devAccount];
      if (!account) return;

      // Show spinner on clicked button
      const icon  = btn.querySelector('.material-icons-round');
      const label = btn.childNodes[btn.childNodes.length - 1];
      const spinner = document.createElement('span');
      spinner.className = 'em-dev-btn-spinner';
      btn.classList.add('em-dev-btn--loading');
      if (icon) icon.style.display = 'none';
      btn.insertBefore(spinner, btn.firstChild);

      // Pre-fill the login form fields so the user can see what was used
      const emailEl = this._qs('#login-email');
      const pwEl    = this._qs('#login-password');
      if (emailEl) emailEl.value = account.email;
      if (pwEl)    pwEl.value    = account.password;

      this._setLoading(true);

      try {
        // First attempt login — if account doesn't exist yet, auto-register it
        let result = await this._apiLogin({
          email:    account.email,
          password: account.password,
        });

        if (!result.ok && result.message && result.message.toLowerCase().includes('invalid')) {
          // Account not seeded yet — register it silently
          console.info(`[Emphora DevTools] Seeding test account: ${account.email}`);
          const regResult = await this._apiRegister({
            firstName:   account.label,
            lastName:    'Test',
            email:       account.email,
            password:    account.password,
            accountType: account.accountType,
          });
          if (regResult.ok) {
            // Now login with the freshly created account
            result = await this._apiLogin({
              email:    account.email,
              password: account.password,
            });
          }
        }

        this._setLoading(false);

        if (result.ok) {
          const loginType = result.user?.accountType || account.accountType;
          const payload   = { email: account.email, userId: result.userId, accountType: loginType };
          wc.log(this._config.events.login, payload);
          wc.publish(this._config.events.login, payload);
          this._updateAccountTag(loginType, true);
          this._toast(`Signed in as ${account.label} (test account)`, 'success');
          this._announce(`Quick login successful as ${account.label}`);
        } else {
          this._toast(result.message || this._config.toast.messages.loginError, 'error');
        }
      } catch {
        this._setLoading(false);
        this._toast(this._config.toast.messages.networkError, 'error');
      } finally {
        // Restore button
        btn.classList.remove('em-dev-btn--loading');
        if (spinner.parentNode) spinner.remove();
        if (icon) icon.style.display = '';
      }
    });
  }

  // ── Account Tag ─────────────────────────────────────────────────────────────
  /**
   * Update the account type tag in the card header.
   * @param {string}  type    — 'employee' | 'employer' | 'researcher'
   * @param {boolean} visible — whether to show the tag
   */
  _updateAccountTag(type, visible) {
    const tag      = this._qs('#em-account-tag');
    if (!tag) return;

    const tagConfig = this._config.accountTag;
    if (!tagConfig || !tagConfig.show) return;

    const typeData  = tagConfig.types[type] || tagConfig.types[tagConfig.defaultType];
    const iconEl    = tag.querySelector('.em-account-tag__icon');
    const labelEl   = tag.querySelector('.em-account-tag__label');

    // Swap colour class
    Object.values(tagConfig.types).forEach((t) => tag.classList.remove(t.colorClass));
    tag.classList.add(typeData.colorClass);

    // Update icon + label
    if (iconEl)  iconEl.textContent  = typeData.icon;
    if (labelEl) labelEl.textContent = typeData.label;

    // Update a11y
    tag.setAttribute('aria-label', `Account type: ${typeData.label}`);
    tag.setAttribute('aria-hidden', String(!visible));

    // Animate in/out
    tag.classList.toggle('em-account-tag--visible', visible);
  }

  // ── Ripple Effect ───────────────────────────────────────────────────────────
  _addRipple(el, e) {
    const rect   = el.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'em-ripple';
    ripple.style.left = `${(e.clientX || rect.left + rect.width / 2) - rect.left}px`;
    ripple.style.top  = `${(e.clientY || rect.top  + rect.height / 2) - rect.top}px`;
    el.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }

  _bindRipples() {
    this._root.addEventListener('click', (e) => {
      const btn = e.target.closest('.em-btn-submit');
      if (btn) this._addRipple(btn, e);
    });
  }

  // ── Error helpers ───────────────────────────────────────────────────────────
  _setFieldError(fieldId, message) {
    const errorEl = this._qs(`#${fieldId.replace('reg-', 'reg-').replace('login-', 'login-')}-error`) ||
                    this._qs(`#${fieldId}-error`);
    const inputEl = this._qs(`#${fieldId}`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.innerHTML = `<span class="material-icons-round" aria-hidden="true">error_outline</span> ${message}`;
    }
    if (inputEl) inputEl.setAttribute('aria-invalid', 'true');
  }

  _clearFieldError(fieldId) {
    const errorEl = this._qs(`#${fieldId}-error`);
    const inputEl = this._qs(`#${fieldId}`);
    if (errorEl) { errorEl.textContent = ''; }
    if (inputEl) inputEl.setAttribute('aria-invalid', 'false');
  }

  _clearAllErrors() {
    this._root.querySelectorAll('.em-field-error').forEach((el) => { el.textContent = ''; });
    this._root.querySelectorAll('.em-input').forEach((el) => el.setAttribute('aria-invalid', 'false'));
    this._termsChecked = false;
    const cb = this._qs('#em-terms-checkbox');
    if (cb) cb.setAttribute('aria-checked', 'false');
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  _setLoading(on) {
    const loader = this._qs('#em-loader');
    const btns   = this._root.querySelectorAll('.em-btn-submit');
    if (loader) {
      loader.classList.toggle('em-loader--active', on);
      loader.setAttribute('aria-hidden', String(!on));
    }
    btns.forEach((btn) => {
      btn.disabled = on;
      const label  = btn.querySelector('.em-btn-label');
      const icon   = btn.querySelector('.material-icons-round');
      let spinner  = btn.querySelector('.em-btn-spinner');
      if (on) {
        if (!spinner) {
          spinner = document.createElement('span');
          spinner.className = 'em-btn-spinner';
          spinner.setAttribute('aria-hidden', 'true');
          btn.insertBefore(spinner, label);
        }
        if (icon) icon.style.display = 'none';
      } else {
        if (spinner) spinner.remove();
        if (icon) icon.style.display = '';
      }
    });
  }

  // ── Toast ───────────────────────────────────────────────────────────────────
  _toast(message, type = 'info') {
    const area  = this._qs('#em-toast-area');
    if (!area) return;

    const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
    const icon  = icons[type] || 'info';

    const toast = document.createElement('div');
    toast.className = `em-toast em-toast--${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.innerHTML = `
      <span class="em-toast-icon"><span class="material-icons-round" aria-hidden="true">${icon}</span></span>
      <span class="em-toast-msg">${message}</span>
      <button class="em-toast-close" type="button" aria-label="Dismiss notification">
        <span class="material-icons-round" aria-hidden="true">close</span>
      </button>`;

    area.appendChild(toast);
    this._announce(message);

    const dismiss = () => {
      toast.classList.add('em-toast--out');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    };

    toast.querySelector('.em-toast-close').addEventListener('click', dismiss);
    setTimeout(dismiss, this._config.toast.duration);
  }

  // ── A11y announce ───────────────────────────────────────────────────────────
  _announce(text) {
    const region = this._qs('#emphora-live-region') ||
                   document.getElementById(this._config.a11y.liveRegionId);
    if (!region) return;
    region.textContent = '';
    requestAnimationFrame(() => { region.textContent = text; });
  }

  // ── API calls ───────────────────────────────────────────────────────────────
  async _apiLogin({ email, password }) {
    const { baseUrl, endpoints } = this._config.api;
    try {
      const res = await fetch(`${baseUrl}${endpoints.login}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      const json = await res.json();
      return { ok: res.ok, ...json };
    } catch {
      // Fallback for demo/offline — simulate success
      console.warn('[Emphora] API unavailable — using demo mode');
      return { ok: true, userId: 'demo-' + Date.now() };
    }
  }

  async _apiRegister(data) {
    const { baseUrl, endpoints } = this._config.api;
    try {
      const res = await fetch(`${baseUrl}${endpoints.register}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      const json = await res.json();
      return { ok: res.ok, ...json };
    } catch {
      console.warn('[Emphora] API unavailable — using demo mode');
      return { ok: true };
    }
  }

  // ── wc subscriptions ────────────────────────────────────────────────────────
  _subscribeToEvents() {
    const { events } = this._config;

    // onMessage handler — processes all 4 emphora events
    const onMessage = (payload, event) => {
      switch (event) {
        case events.login:
          console.info('[Emphora] ← login received', payload);
          break;
        case events.register:
          console.info('[Emphora] ← register received', payload);
          break;
        case events.logout:
          console.info('[Emphora] ← logout received', payload);
          this._showView('login');
          this._toast(this._config.toast.messages.logoutSuccess, 'info');
          break;
        case events.themeChange:
          console.info('[Emphora] ← themeChange received', payload);
          break;
        default:
          console.info('[Emphora] ← unknown event', event, payload);
      }
    };

    // Subscribe to all 4 emphora events
    [events.login, events.register, events.logout, events.themeChange].forEach((evt) => {
      const unsub = wc.subscribe(evt, onMessage);
      this._unsubscribers.push(unsub);
    });
  }

  // ── Teardown ────────────────────────────────────────────────────────────────
  destroy() {
    this._unsubscribers.forEach((fn) => fn());
    this._unsubscribers = [];
  }

  // ── Util ────────────────────────────────────────────────────────────────────
  _qs(selector) {
    return this._root.querySelector(selector);
  }
}



// ─────────────────────────────────────────────────────────────────────────────
// EmAdmin — inline admin panel (users list, add, edit, enable/disable, delete)
// ─────────────────────────────────────────────────────────────────────────────
class EmAdmin {
  constructor(rootEl, config) {
    this._root    = rootEl;
    this._config  = config;
    this._users   = [];
    this._editId  = null;   // null = add mode, number = edit mode
    this._overlay = rootEl.querySelector('#em-admin-overlay');
    this._panel   = rootEl.querySelector('#em-admin-panel');
    this._body    = rootEl.querySelector('#em-admin-body');
    this._drawer  = rootEl.querySelector('#em-admin-form-drawer');
    this._form    = rootEl.querySelector('#em-admin-form');
    this._search  = rootEl.querySelector('#em-admin-search');
    this._fType   = rootEl.querySelector('#em-admin-filter-type');
    this._fStatus = rootEl.querySelector('#em-admin-filter-status');
    this._count   = rootEl.querySelector('#em-admin-count');

    this._bindEvents();
  }

  // ── Public ──────────────────────────────────────────────────────────────────
  open() {
    this._overlay.setAttribute('aria-hidden', 'false');
    this._overlay.classList.add('em-admin-overlay--open');
    document.body.style.overflow = 'hidden';
    this._fetchUsers();
    requestAnimationFrame(() => {
      this._root.querySelector('#em-admin-search')?.focus({ preventScroll: true });
    });
  }

  close() {
    this._overlay.classList.remove('em-admin-overlay--open');
    this._overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    this._closeDrawer();
  }

  // ── Events ──────────────────────────────────────────────────────────────────
  _bindEvents() {
    // Close on overlay click / close button / Escape
    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) this.close();
    });
    this._root.querySelector('#em-admin-close')
      ?.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._overlay.classList.contains('em-admin-overlay--open')) {
        this.close();
      }
    });

    // Refresh
    this._root.querySelector('#em-admin-refresh')
      ?.addEventListener('click', () => this._fetchUsers());

    // Add user
    this._root.querySelector('#em-admin-add')
      ?.addEventListener('click', () => this._openDrawer(null));

    // Form cancel / close
    this._root.querySelector('#em-admin-form-cancel')
      ?.addEventListener('click', () => this._closeDrawer());
    this._root.querySelector('#em-admin-form-close')
      ?.addEventListener('click', () => this._closeDrawer());

    // Form submit
    this._form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this._submitForm();
    });

    // Live filter
    this._search?.addEventListener('input',  () => this._renderList());
    this._fType?.addEventListener('change',  () => this._renderList());
    this._fStatus?.addEventListener('change', () => this._renderList());
  }

  // ── Fetch ────────────────────────────────────────────────────────────────────
  async _fetchUsers() {
    const btn = this._root.querySelector('#em-admin-refresh');
    btn?.classList.add('spinning');
    this._showLoading();

    try {
      const res  = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.ok) {
        this._users = data.users;
        if (this._count) {
          this._count.textContent = `${data.total} user${data.total !== 1 ? 's' : ''}`;
        }
        this._renderList();
      } else {
        this._showEmpty('Failed to load users.');
      }
    } catch {
      this._showEmpty('Network error — is the server running?');
    } finally {
      btn?.classList.remove('spinning');
    }
  }

  // ── Render list ──────────────────────────────────────────────────────────────
  _filtered() {
    const q      = (this._search?.value || '').toLowerCase().trim();
    const type   = this._fType?.value   || '';
    const status = this._fStatus?.value || '';

    return this._users.filter(u => {
      const name = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase();
      if (q      && !name.includes(q))               return false;
      if (type   && u.accountType !== type)           return false;
      if (status === 'active'   && !u.isActive)       return false;
      if (status === 'disabled' &&  u.isActive)       return false;
      return true;
    });
  }

  _renderList() {
    const users = this._filtered();

    if (users.length === 0) {
      this._showEmpty(
        this._users.length === 0 ? 'No users registered yet.' : 'No users match your filters.'
      );
      return;
    }

    const ICONS = { employee: 'badge', employer: 'business', researcher: 'science' };
    const TYPE_LABELS = { employee: 'Employee', employer: 'Employer', researcher: 'Researcher' };

    this._body.innerHTML = users.map(u => {
      const initials = `${u.firstName[0] || ''}${u.lastName[0] || ''}`.toUpperCase();
      const avatarCls = `em-admin-avatar em-admin-avatar--${u.accountType}`;
      const rowCls    = `em-admin-user-row${u.isActive ? '' : ' em-admin-user-row--disabled'}`;
      const pipCls    = `em-admin-status-pip em-admin-status-pip--${u.isActive ? 'active' : 'disabled'}`;
      const typeLabel = TYPE_LABELS[u.accountType] || u.accountType;
      const verBadge  = u.isVerified
        ? '<span style="color:var(--em-success);font-size:0.65rem;font-weight:700">✓ Verified</span>'
        : '';

      const enableBtn = !u.isActive
        ? `<button class="em-admin-action-btn em-admin-action-btn--enable"
             data-action="enable" data-id="${u.id}"
             aria-label="Enable ${escHtml(u.firstName)}" title="Enable">
             <span class="material-icons-round">check_circle</span></button>`
        : `<button class="em-admin-action-btn em-admin-action-btn--disable"
             data-action="disable" data-id="${u.id}"
             aria-label="Disable ${escHtml(u.firstName)}" title="Disable">
             <span class="material-icons-round">block</span></button>`;

      return `
        <div class="${rowCls}" data-user-id="${u.id}">
          <div class="${avatarCls}" aria-hidden="true">${escHtml(initials)}</div>
          <div class="em-admin-user-info">
            <div class="em-admin-user-name">${escHtml(u.firstName)} ${escHtml(u.lastName)} ${verBadge}</div>
            <div class="em-admin-user-meta">${escHtml(u.email)} · ${escHtml(typeLabel)}</div>
          </div>
          <span class="${pipCls}" title="${u.isActive ? 'Active' : 'Disabled'}"></span>
          <div class="em-admin-user-actions">
            <button class="em-admin-action-btn em-admin-action-btn--edit"
              data-action="edit" data-id="${u.id}"
              aria-label="Edit ${escHtml(u.firstName)}" title="Edit">
              <span class="material-icons-round">edit</span></button>
            ${enableBtn}
            <button class="em-admin-action-btn em-admin-action-btn--delete"
              data-action="delete" data-id="${u.id}"
              aria-label="Delete ${escHtml(u.firstName)}" title="Delete">
              <span class="material-icons-round">delete_outline</span></button>
          </div>
        </div>`;
    }).join('');

    // Delegate action button clicks
    this._body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, id } = btn.dataset;
      const uid = Number(id);
      if (action === 'edit')    this._openDrawer(uid);
      if (action === 'enable')  this._setActive(uid, true);
      if (action === 'disable') this._setActive(uid, false);
      if (action === 'delete')  this._deleteUser(uid);
    }, { once: true });
  }

  _showLoading() {
    this._body.innerHTML = `
      <div class="em-admin-empty" id="em-admin-loading">
        <span class="em-admin-spinner"></span>
        <span>Loading users…</span>
      </div>`;
  }

  _showEmpty(msg) {
    this._body.innerHTML = `
      <div class="em-admin-empty">
        <span class="material-icons-round">group_off</span>
        <span>${escHtml(msg)}</span>
      </div>`;
  }

  // ── Add / Edit drawer ────────────────────────────────────────────────────────
  _openDrawer(userId) {
    this._editId = userId;
    const isEdit = userId !== null;
    const titleEl = this._root.querySelector('#em-admin-form-title');
    const pwHint  = this._root.querySelector('#em-admin-pw-hint');
    const pwInput = this._root.querySelector('#em-admin-password');

    if (titleEl) titleEl.textContent = isEdit ? 'Edit user' : 'Add user';
    if (pwHint)  pwHint.textContent  = isEdit ? '(leave blank to keep current)' : '(min 8 chars)';
    if (pwInput) pwInput.required    = !isEdit;

    if (isEdit) {
      const u = this._users.find(x => x.id === userId);
      if (!u) return;
      this._root.querySelector('#em-admin-form-id').value   = u.id;
      this._root.querySelector('#em-admin-fname').value     = u.firstName;
      this._root.querySelector('#em-admin-lname').value     = u.lastName;
      this._root.querySelector('#em-admin-email').value     = u.email;
      this._root.querySelector('#em-admin-password').value  = '';
      this._root.querySelector('#em-admin-type').value      = u.accountType;
      this._root.querySelector('#em-admin-verified').checked = Boolean(u.isVerified);
      this._root.querySelector('#em-admin-active').checked   = u.isActive !== false;
    } else {
      this._form?.reset();
      this._root.querySelector('#em-admin-form-id').value = '';
      this._root.querySelector('#em-admin-active').checked = true;
    }

    this._drawer?.classList.add('em-admin-form-drawer--open');
    this._drawer?.setAttribute('aria-hidden', 'false');
    setTimeout(() => this._root.querySelector('#em-admin-fname')?.focus(), 50);
  }

  _closeDrawer() {
    this._drawer?.classList.remove('em-admin-form-drawer--open');
    this._drawer?.setAttribute('aria-hidden', 'true');
    this._form?.reset();
    this._editId = null;
  }

  // ── Form submit ──────────────────────────────────────────────────────────────
  async _submitForm() {
    const submitBtn  = this._root.querySelector('#em-admin-form-submit');
    const labelEl    = submitBtn?.querySelector('.em-admin-btn-label');
    const isEdit     = this._editId !== null;

    const body = {
      firstName:   this._root.querySelector('#em-admin-fname').value.trim(),
      lastName:    this._root.querySelector('#em-admin-lname').value.trim(),
      email:       this._root.querySelector('#em-admin-email').value.trim(),
      accountType: this._root.querySelector('#em-admin-type').value,
      isVerified:  this._root.querySelector('#em-admin-verified').checked,
      isActive:    this._root.querySelector('#em-admin-active').checked,
    };

    const pw = this._root.querySelector('#em-admin-password').value;
    if (pw) body.password = pw;
    else if (!isEdit) {
      alert('Password is required for new users.');
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    if (labelEl)   labelEl.textContent = isEdit ? 'Saving…' : 'Creating…';

    try {
      let res, data;

      if (isEdit) {
        res  = await fetch(`/api/admin/users/${this._editId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        });
        data = await res.json();
      } else {
        // Create via public register endpoint
        res  = await fetch(`${this._config.api.baseUrl}${this._config.api.endpoints.register}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        });
        data = await res.json();
      }

      if (data.ok) {
        this._closeDrawer();
        await this._fetchUsers();
        wc.log('emphora:admin:userSaved', { isEdit, id: this._editId });
        wc.publish('emphora:admin:userSaved', { isEdit, id: this._editId });
      } else {
        alert(data.message || 'Save failed.');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (labelEl)   labelEl.textContent = 'Save user';
    }
  }

  // ── Enable / Disable ─────────────────────────────────────────────────────────
  async _setActive(userId, active) {
    const action = active ? 'activate' : 'deactivate';
    try {
      const res  = await fetch(`/api/admin/users/${userId}/${action}`, { method: 'PATCH' });
      const data = await res.json();
      if (data.ok) {
        wc.log(`emphora:admin:user${active ? 'Enabled' : 'Disabled'}`, { userId });
        wc.publish(`emphora:admin:user${active ? 'Enabled' : 'Disabled'}`, { userId });
        await this._fetchUsers();
      } else {
        alert(data.message || 'Action failed.');
      }
    } catch {
      alert('Network error.');
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async _deleteUser(userId) {
    const u = this._users.find(x => x.id === userId);
    if (!u) return;
    if (!confirm(`Permanently delete ${u.firstName} ${u.lastName}? This cannot be undone.`)) return;

    try {
      const res  = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        wc.log('emphora:admin:userDeleted', { userId });
        wc.publish('emphora:admin:userDeleted', { userId });
        await this._fetchUsers();
      } else {
        alert(data.message || 'Delete failed.');
      }
    } catch {
      alert('Network error.');
    }
  }
}

// ── Shared HTML escape util (used by EmAdmin) ─────────────────────────────────
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOT — wait for <emphora class="emphora"> to exist in the DOM.
// Supports <wc-include> dynamic insertion via MutationObserver.
// ─────────────────────────────────────────────────────────────────────────────
(function bootEmphora() {
  const SELECTOR = 'emphora.emphora';

  function tryInit() {
    const el = document.querySelector(SELECTOR);
    if (!el) return false;
    if (el._emInstance) return true; // already initialised

    if (typeof EmophoraConfig === 'undefined') {
      console.error('[Emphora] EmophoraConfig not found. Make sure emphora.config.js is loaded before emphora.js.');
      return false;
    }

    el._emInstance = new Emphora(el, EmophoraConfig);
    console.info('[Emphora] Initialised on', el);
    return true;
  }

  // Try immediately if DOM is ready
  if (document.readyState !== 'loading') {
    if (tryInit()) return;
  }

  // Also try on DOMContentLoaded (covers normal script placement)
  document.addEventListener('DOMContentLoaded', () => {
    if (tryInit()) return;
  });

  // MutationObserver for <wc-include> lazy insertion
  const observer = new MutationObserver(() => {
    if (tryInit()) observer.disconnect();
  });

  observer.observe(document.documentElement, {
    childList:  true,
    subtree:    true,
  });
})();
