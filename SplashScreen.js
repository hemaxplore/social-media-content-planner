/**
 * SplashScreen.js
 * ─────────────────────────────────────────────
 * Standalone splash screen component for
 * Social Media Content Planner.
 *
 * Self-contained: renders its own DOM + CSS.
 * Session-aware:  shows only once per browser
 *                 session via sessionStorage.
 *
 * HOW TO USE:
 *   // In your HTML, add before </body>:
 *   <script src="SplashScreen.js"></script>
 *
 *   // In app.js or inline:
 *   SplashScreen.init();
 *
 * ─────────────────────────────────────────────
 */

const SplashScreen = (function () {

  // ── Config ──────────────────────────────────
  // Descriptive key name avoids collisions with other apps.
  const SESSION_KEY   = 'socialContentPlannerSplashShown';
  const SHOW_DURATION = 2200;   // ms before fade starts
  const FADE_DURATION = 800;    // ms — must match CSS transition

  // Timer reference — stored so we can cancel if needed
  // and prevent duplicate timers if init() is called twice.
  let _dismissTimer = null;
  let _removeTimer  = null;

  // ── CSS ─────────────────────────────────────
  const CSS = `
    /* ── Overlay ── */
    #scp-splash {
      position: fixed;
      inset: 0;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      opacity: 1;
      transition: opacity ${FADE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    #scp-splash.scp-fade-out {
      opacity: 0;
      pointer-events: none;
    }

    /* ── Content wrapper — staggered children ── */
    .scp-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 0 24px;
    }

    /* ── Shared fade-up keyframe (reused by all children) ── */
    @keyframes scpFadeUp {
      from { opacity: 0; transform: translateY(22px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Logo ring — appears first ── */
    .scp-logo-ring {
      width: 130px;
      height: 130px;
      border-radius: 50%;
      background: rgba(99, 102, 241, 0.07);
      border: 1.5px solid rgba(129, 140, 248, 0.22);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 32px;
      opacity: 0;
      animation:
        scpFadeUp  0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s  both,
        scpPulse   2.6s ease-in-out                         0.65s infinite,
        scpSpin    6s   linear                              0.65s infinite;
    }

    /* Glow pulse — spreads out and fades */
    @keyframes scpPulse {
      0%,100% { box-shadow: 0 0  0  0    rgba(129,140,248,0.25),
                            0 0 28px 0px rgba(192,132,252,0);    }
      50%     { box-shadow: 0 0  0  22px rgba(129,140,248,0),
                            0 0 28px 8px rgba(192,132,252,0.12); }
    }

    /* Slow rotating conic border shimmer */
    @keyframes scpSpin {
      from { border-color: rgba(129,140,248,0.22); }
      25%  { border-color: rgba(192,132,252,0.38); }
      50%  { border-color: rgba(129,140,248,0.22); }
      75%  { border-color: rgba(251,191,36, 0.28); }
      100% { border-color: rgba(129,140,248,0.22); }
    }

    /* SVG icon subtle float */
    .scp-logo-ring svg {
      animation: scpFloat 3s ease-in-out 0.65s infinite;
      filter: drop-shadow(0 4px 18px rgba(129,140,248,0.22));
    }

    @keyframes scpFloat {
      0%,100% { transform: translateY(0);  }
      50%     { transform: translateY(-5px); }
    }

    /* ── App name — appears second ── */
    .scp-title {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: clamp(1.4rem, 5vw, 1.9rem);
      font-weight: 800;
      line-height: 1.2;
      margin: 0 0 10px;
      background: linear-gradient(135deg, #818cf8 0%, #c084fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      opacity: 0;
      animation: scpFadeUp 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.35s both;
    }

    /* ── Tagline — appears third ── */
    .scp-tagline {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 0.78rem;
      font-weight: 500;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #64748b;
      margin: 0 0 40px;
      opacity: 0;
      animation: scpFadeUp 0.5s ease 0.56s both;
    }

    /* ── Dots — appear last ── */
    .scp-dots {
      display: flex;
      gap: 8px;
      align-items: center;
      opacity: 0;
      animation: scpFadeUp 0.45s ease 0.72s both;
    }

    .scp-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #6366f1;
      opacity: 0.4;
      animation: scpBounce 1.4s ease-in-out infinite;
    }

    .scp-dot:nth-child(2) { animation-delay: 0.18s; }
    .scp-dot:nth-child(3) { animation-delay: 0.36s; }

    @keyframes scpBounce {
      0%,80%,100% { transform: translateY(0);    opacity: 0.35; }
      40%         { transform: translateY(-9px); opacity: 1;    }
    }

    /* ── Responsive ── */
    @media (max-width: 480px) {
      .scp-logo-ring { width: 100px; height: 100px; }
      .scp-title     { font-size: 1.3rem; }
    }
  `;

  // ── SVG Icon: Stacked content cards + sparkle star ──
  const ICON_SVG = `
    <svg viewBox="0 0 80 80" width="68" height="68"
         fill="none" xmlns="http://www.w3.org/2000/svg"
         role="img" aria-label="Content Planner Icon">
      <defs>
        <linearGradient id="scp-g1" x1="10" y1="16" x2="54" y2="52"
                        gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stop-color="#818cf8"/>
          <stop offset="100%" stop-color="#c084fc"/>
        </linearGradient>
        <linearGradient id="scp-g2" x1="51" y1="11" x2="67" y2="27"
                        gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stop-color="#fbbf24"/>
          <stop offset="100%" stop-color="#f59e0b"/>
        </linearGradient>
      </defs>

      <!-- Shadow card (back) -->
      <rect x="16" y="22" width="44" height="36"
            rx="7" fill="url(#scp-g1)" opacity="0.28"/>

      <!-- Main content card -->
      <rect x="10" y="15" width="44" height="37"
            rx="7" fill="url(#scp-g1)"/>

      <!-- Content rows (simulating text lines) -->
      <rect x="19" y="25" width="26" height="3"
            rx="1.5" fill="white" opacity="0.8"/>
      <rect x="19" y="32" width="18" height="3"
            rx="1.5" fill="white" opacity="0.5"/>
      <rect x="19" y="39" width="22" height="3"
            rx="1.5" fill="white" opacity="0.38"/>

      <!-- Dark cut-out circle behind star -->
      <circle cx="59" cy="20" r="12" fill="#0f172a"/>

      <!-- Sparkle / publish star -->
      <path d="M59 10.5
               L60.3 17.7
               L67.5 19
               L60.3 20.3
               L59 27.5
               L57.7 20.3
               L50.5 19
               L57.7 17.7 Z"
            fill="url(#scp-g2)"/>
    </svg>
  `;

  // ── Build DOM ────────────────────────────────
  function _buildHTML() {
    const wrap = document.createElement('div');
    wrap.id = 'scp-splash';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-label', 'Loading Social Media Content Planner');

    wrap.innerHTML = `
      <div class="scp-inner">
        <div class="scp-logo-ring">${ICON_SVG}</div>
        <h1 class="scp-title">Social Media<br/>Content Planner</h1>
        <p class="scp-tagline">Plan &middot; Create &middot; Publish</p>
        <div class="scp-dots" aria-hidden="true">
          <div class="scp-dot"></div>
          <div class="scp-dot"></div>
          <div class="scp-dot"></div>
        </div>
      </div>
    `;
    return wrap;
  }

  // ── Inject CSS once ──────────────────────────
  function _injectCSS() {
    if (document.getElementById('scp-styles')) return;
    const style = document.createElement('style');
    style.id = 'scp-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // ── Session storage helpers (safe wrappers) ─

  // Returns true if the splash has already been shown this session.
  // Falls back to false safely if sessionStorage is unavailable.
  function _alreadyShown() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch (e) {
      // sessionStorage blocked (e.g. private mode, iframe restriction)
      return false; // fail open: show the splash
    }
  }

  // Marks the splash as shown for this session.
  // Silently ignores errors so the app always continues.
  function _markShown() {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch (e) {
      // Storage unavailable — app still works normally
    }
  }

  // ── Dismiss (fade → remove) ──────────────────
  function _dismiss(el) {
    if (!el || !el.isConnected) return; // guard: element already removed

    el.classList.add('scp-fade-out');

    _removeTimer = setTimeout(() => {
      if (el.isConnected) el.remove();
      _markShown();
      _dismissTimer = null;
      _removeTimer  = null;
    }, FADE_DURATION);
  }

  // ── Public API ───────────────────────────────
  return {
    /**
     * init()
     * Call once when the app starts.
     * - Shows the splash on the first visit this session.
     * - Skips it on every subsequent refresh in the same session.
     * - Works safely even if sessionStorage is blocked.
     * - Prevents duplicate timers if called more than once.
     */
    init() {
      // Already shown this session — go straight to dashboard
      if (_alreadyShown()) return;

      // Already running (duplicate call guard)
      if (_dismissTimer !== null) return;

      _injectCSS();

      // Remove any leftover splash from a previous preview() call
      const existing = document.getElementById('scp-splash');
      if (existing) existing.remove();

      const el = _buildHTML();
      document.body.prepend(el);

      // Schedule auto-dismiss; store ID so it can be cancelled if needed
      _dismissTimer = setTimeout(() => _dismiss(el), SHOW_DURATION);
    },

    /**
     * preview()
     * Force-shows the splash, ignoring sessionStorage.
     * For design review or testing only.
     * Clears any running timers first to prevent overlap.
     */
    preview() {
      // Cancel any existing dismiss timer before relaunching
      if (_dismissTimer !== null) { clearTimeout(_dismissTimer); _dismissTimer = null; }
      if (_removeTimer  !== null) { clearTimeout(_removeTimer);  _removeTimer  = null; }

      _injectCSS();

      const existing = document.getElementById('scp-splash');
      if (existing) existing.remove();

      const el = _buildHTML();
      document.body.prepend(el);

      _dismissTimer = setTimeout(() => _dismiss(el), SHOW_DURATION);
    }
  };

})();
