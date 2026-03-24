/**
 * avatar-upload.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared avatar upload module for Emphora dashboards.
 *
 * Usage:
 *   <script src="js/avatar-upload.js"></script>
 *   initAvatar(email, heroAvatarEl, topbarAvatarEl);
 *
 * - Hover the avatar → shows "+" overlay
 * - Click → opens hidden file input (jpg/png/gif/webp, max 5MB)
 * - Crops to square, resizes to 200×200, converts to base64
 * - Saves to localStorage keyed by email
 * - Syncs hero + topbar avatars immediately
 * - Shows a subtle toast on save
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  const STORAGE_KEY  = (email) => `emphora_avatar_${email}`;
  const SIZE         = 200;   // output canvas size px
  const MAX_BYTES    = 5 * 1024 * 1024; // 5 MB input limit
  const QUALITY      = 0.88;  // jpeg quality

  /**
   * Initialise avatar upload on a dashboard page.
   * @param {string}      email         — user's email (used as storage key)
   * @param {HTMLElement} heroEl        — the large hero avatar div
   * @param {HTMLElement} [topbarEl]    — the small topbar avatar div (optional)
   * @param {string}      [initials]    — fallback text when no image saved
   */
  window.initAvatar = function (email, heroEl, topbarEl, initials) {
    if (!heroEl || !email) return;

    // ── Load saved image ───────────────────────────────────────────────────
    const saved = loadAvatar(email);
    if (saved) {
      applyImage(heroEl, topbarEl, saved);
    }

    // ── Build the hidden file input ────────────────────────────────────────
    const fileInput = document.createElement('input');
    fileInput.type   = 'file';
    fileInput.accept = 'image/jpeg,image/png,image/webp,image/gif';
    fileInput.style.display = 'none';
    fileInput.setAttribute('aria-hidden', 'true');
    document.body.appendChild(fileInput);

    // ── Make hero avatar interactive ───────────────────────────────────────
    heroEl.classList.add('em-avatar-upload');
    heroEl.setAttribute('role', 'button');
    heroEl.setAttribute('tabindex', '0');
    heroEl.setAttribute('aria-label', 'Change profile picture');
    heroEl.title = 'Click to change profile picture';

    // "+" overlay inside the avatar
    const overlay = document.createElement('span');
    overlay.className   = 'em-avatar-overlay';
    overlay.innerHTML   = '<span class="material-icons-round">add_a_photo</span>';
    overlay.setAttribute('aria-hidden', 'true');
    heroEl.appendChild(overlay);

    // ── Events ─────────────────────────────────────────────────────────────
    heroEl.addEventListener('click', () => fileInput.click());
    heroEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      fileInput.value = ''; // reset so same file can be re-selected
      if (!file) return;
      if (file.size > MAX_BYTES) {
        showToast('Image too large — max 5 MB', 'warning');
        return;
      }
      processImage(file, email, heroEl, topbarEl);
    });
  };

  // ── Image processing ───────────────────────────────────────────────────────
  function processImage(file, email, heroEl, topbarEl) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const dataUrl = cropAndResize(img);
        saveAvatar(email, dataUrl);
        applyImage(heroEl, topbarEl, dataUrl);
        showToast('Profile picture updated', 'success');
      };
      img.onerror = () => showToast('Could not load image', 'error');
      img.src = e.target.result;
    };
    reader.onerror = () => showToast('Could not read file', 'error');
    reader.readAsDataURL(file);
  }

  function cropAndResize(img) {
    const canvas = document.createElement('canvas');
    canvas.width  = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');

    // Crop to square from centre
    const side = Math.min(img.width, img.height);
    const sx   = (img.width  - side) / 2;
    const sy   = (img.height - side) / 2;

    // Clip to circle
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
    return canvas.toDataURL('image/jpeg', QUALITY);
  }

  // ── Apply image to avatar elements ─────────────────────────────────────────
  function applyImage(heroEl, topbarEl, dataUrl) {
    // Hero
    heroEl.style.backgroundImage  = `url(${dataUrl})`;
    heroEl.style.backgroundSize   = 'cover';
    heroEl.style.backgroundPosition = 'center';
    heroEl.style.color            = 'transparent';
    heroEl.dataset.hasImage       = 'true';

    // Topbar (small circle)
    if (topbarEl) {
      topbarEl.style.backgroundImage    = `url(${dataUrl})`;
      topbarEl.style.backgroundSize     = 'cover';
      topbarEl.style.backgroundPosition = 'center';
      topbarEl.style.color              = 'transparent';
      topbarEl.dataset.hasImage         = 'true';
    }
  }

  // ── localStorage helpers ────────────────────────────────────────────────────
  function saveAvatar(email, dataUrl) {
    try { localStorage.setItem(STORAGE_KEY(email), dataUrl); }
    catch (e) {
      // localStorage full — try clearing old avatars first
      try {
        for (const k of Object.keys(localStorage)) {
          if (k.startsWith('emphora_avatar_') && k !== STORAGE_KEY(email)) {
            localStorage.removeItem(k);
          }
        }
        localStorage.setItem(STORAGE_KEY(email), dataUrl);
      } catch (_) {
        showToast('Could not save — storage full', 'error');
      }
    }
  }

  function loadAvatar(email) {
    try { return localStorage.getItem(STORAGE_KEY(email)); }
    catch { return null; }
  }

  // ── Toast notification ──────────────────────────────────────────────────────
  function showToast(message, type) {
    const ICONS = { success: 'check_circle', warning: 'warning', error: 'error', info: 'info' };
    const COLORS = {
      success: '#2E7D32',
      warning: '#E65100',
      error:   '#C62828',
      info:    '#1A6BCC',
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed; bottom:1.25rem; left:50%; transform:translateX(-50%) translateY(20px) scale(.95);
      background:#fff; color:#0D1B2A; border-radius:12px;
      padding:.7rem 1rem; display:flex; align-items:center; gap:.6rem;
      font-family:'Plus Jakarta Sans',system-ui,sans-serif; font-size:.82rem; font-weight:500;
      box-shadow:0 8px 32px rgba(0,0,0,.18); z-index:9999; min-width:220px; max-width:340px;
      border-left:3.5px solid ${COLORS[type]||COLORS.info};
      transition:transform .28s cubic-bezier(.34,1.4,.64,1), opacity .25s ease;
      opacity:0; pointer-events:none;
    `;
    toast.innerHTML = `
      <span class="material-icons-round" style="font-size:1.1rem;color:${COLORS[type]||COLORS.info};flex-shrink:0">${ICONS[type]||'info'}</span>
      <span>${message}</span>`;
    document.body.appendChild(toast);

    // Dark mode
    if (document.body.dataset.theme === 'dark') {
      toast.style.background = '#111827';
      toast.style.color      = '#E8F1FF';
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.transform = 'translateX(-50%) translateY(0) scale(1)';
        toast.style.opacity   = '1';
      });
    });

    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(12px) scale(.95)';
      toast.style.opacity   = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

})();
