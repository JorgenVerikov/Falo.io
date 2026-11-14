/**
 * Mobile Device Detection & Twin-Stick Touch Controls
 * Provides Movement Joystick, Aiming Joystick, Auto-Fire / Auto-Spin toggles,
 * and Top-Left Self Destruct confirmation flow.
 */

export function detectIsMobileDevice() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua);
  const hasTouch = (navigator.maxTouchPoints > 0) || ('ontouchstart' in window);
  const coarsePointer = Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const anyCoarse = Boolean(window.matchMedia && window.matchMedia('(any-pointer: coarse)').matches);

  if (coarsePointer || uaMobile) return true;
  if (hasTouch && anyCoarse && window.innerWidth <= 1024) return true;
  return false;
}

export class MobileControls {
  constructor(callbacks = {}) {
    this.onToggleAutoFire = callbacks.onToggleAutoFire || (() => {});
    this.onToggleAutoSpin = callbacks.onToggleAutoSpin || (() => {});
    this.onConfirmSelfDestruct = callbacks.onConfirmSelfDestruct || (() => {});

    this.isMobile = detectIsMobileDevice();
    this.inGameActive = false;
    this.lastTouchTime = 0;

    this.moveVec = { x: 0, y: 0 };
    this.aimState = {
      active: false,
      hasAimed: false,
      angle: 0,
      isFiring: false,
      magnitude: 0
    };

    this.layerEl = document.getElementById('mobile-controls-layer');
    this.movePadEl = document.getElementById('mobile-move-joystick');
    this.moveKnobEl = document.getElementById('mobile-move-knob');
    this.aimPadEl = document.getElementById('mobile-aim-joystick');
    this.aimKnobEl = document.getElementById('mobile-aim-knob');
    this.autoFireBtn = document.getElementById('mobile-autofire-btn');
    this.autoSpinBtn = document.getElementById('mobile-autospin-btn');
    this.selfDestructBtn = document.getElementById('mobile-self-destruct-btn');

    this.confirmModal = document.getElementById('self-destruct-modal');
    this.cancelSelfDestructBtn = document.getElementById('cancel-self-destruct-btn');
    this.confirmSelfDestructBtn = document.getElementById('confirm-self-destruct-btn');
    this.deviceBadgeEl = document.getElementById('settings-device-mode-badge');

    this.setupDeviceDetectionListeners();
    this.bindJoystick(this.movePadEl, this.moveKnobEl, (nx, ny, mag, active) => {
      if (!active || mag < 0.12) {
        this.moveVec.x = 0;
        this.moveVec.y = 0;
      } else {
        this.moveVec.x = nx;
        this.moveVec.y = ny;
      }
    });

    this.bindJoystick(this.aimPadEl, this.aimKnobEl, (nx, ny, mag, active) => {
      this.aimState.active = active;
      this.aimState.magnitude = mag;
      if (active && mag >= 0.14) {
        this.aimState.angle = Math.atan2(ny, nx);
        this.aimState.hasAimed = true;
        this.aimState.isFiring = mag >= 0.25;
      } else {
        this.aimState.isFiring = false;
      }
    });

    this.bindActionButtons();
    this.applyDeviceMode();
  }

  setupDeviceDetectionListeners() {
    if (window.matchMedia) {
      const mql = window.matchMedia('(pointer: coarse)');
      const onMediaChange = () => {
        this.setMobileMode(detectIsMobileDevice());
      };
      if (mql.addEventListener) mql.addEventListener('change', onMediaChange);
      else if (mql.addListener) mql.addListener(onMediaChange);
    }

    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') {
        this.lastTouchTime = performance.now();
        if (!this.isMobile) {
          this.setMobileMode(true);
        }
      } else if (e.pointerType === 'mouse') {
        const elapsed = performance.now() - this.lastTouchTime;
        const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent || '');
        const coarse = Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
        if (this.isMobile && !uaMobile && !coarse && elapsed > 800) {
          this.setMobileMode(false);
        }
      }
    }, { passive: true });

    window.addEventListener('resize', () => {
      const detected = detectIsMobileDevice();
      if (detected !== this.isMobile && performance.now() - this.lastTouchTime > 1000) {
        this.setMobileMode(detected);
      }
    });
  }

  setMobileMode(isMobile) {
    if (this.isMobile === isMobile) return;
    this.isMobile = isMobile;
    if (!isMobile) {
      this.resetInputs();
    }
    this.applyDeviceMode();
  }

  applyDeviceMode() {
    document.body.classList.toggle('is-mobile', this.isMobile);
    document.body.classList.toggle('is-pc', !this.isMobile);

    if (this.deviceBadgeEl) {
      this.deviceBadgeEl.textContent = this.isMobile ? 'DETECTED: MOBILE (TOUCH)' : 'DETECTED: PC (KEYBOARD & MOUSE)';
      this.deviceBadgeEl.classList.toggle('mode-mobile', this.isMobile);
      this.deviceBadgeEl.classList.toggle('mode-pc', !this.isMobile);
    }

    this.updateLayerVisibility();
  }

  setInGameVisible(visible) {
    this.inGameActive = Boolean(visible);
    if (!this.inGameActive) {
      this.resetInputs();
      this.aimState.hasAimed = false;
      this.aimState.angle = 0;
      this.hideSelfDestructPrompt();
    }
    this.updateLayerVisibility();
  }

  updateLayerVisibility() {
    if (!this.layerEl) return;
    const shouldShow = this.isMobile && this.inGameActive;
    this.layerEl.classList.toggle('hidden', !shouldShow);
  }

  resetInputs() {
    this.moveVec.x = 0;
    this.moveVec.y = 0;
    this.aimState.active = false;
    this.aimState.isFiring = false;
    this.aimState.magnitude = 0;
    if (this.moveKnobEl) this.moveKnobEl.style.transform = 'translate(-50%, -50%)';
    if (this.aimKnobEl) this.aimKnobEl.style.transform = 'translate(-50%, -50%)';
  }

  syncToggleStates(autoFire, autoSpin) {
    if (this.autoFireBtn) {
      this.autoFireBtn.classList.toggle('active', Boolean(autoFire));
    }
    if (this.autoSpinBtn) {
      this.autoSpinBtn.classList.toggle('active', Boolean(autoSpin));
    }
  }

  showSelfDestructPrompt() {
    if (!this.confirmModal || !this.inGameActive) return;
    this.resetInputs();
    this.confirmModal.classList.remove('hidden');
    void this.confirmModal.offsetWidth;
    this.confirmModal.classList.add('active');
  }

  hideSelfDestructPrompt() {
    if (!this.confirmModal) return;
    this.confirmModal.classList.remove('active');
    this.confirmModal.classList.add('hidden');
  }

  isSelfDestructPromptOpen() {
    return Boolean(this.confirmModal && !this.confirmModal.classList.contains('hidden'));
  }

  bindActionButtons() {
    const bindTap = (el, handler) => {
      if (!el) return;
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        handler();
      });
    };

    bindTap(this.autoFireBtn, () => this.onToggleAutoFire());
    bindTap(this.autoSpinBtn, () => this.onToggleAutoSpin());
    bindTap(this.selfDestructBtn, () => this.showSelfDestructPrompt());

    this.cancelSelfDestructBtn?.addEventListener('click', () => {
      this.hideSelfDestructPrompt();
    });

    this.confirmSelfDestructBtn?.addEventListener('click', () => {
      this.hideSelfDestructPrompt();
      this.onConfirmSelfDestruct();
    });

    this.confirmModal?.addEventListener('click', (e) => {
      if (e.target === this.confirmModal) {
        this.hideSelfDestructPrompt();
      }
    });
  }

  bindJoystick(padEl, knobEl, onUpdate) {
    if (!padEl || !knobEl) return;

    let activePointerId = null;

    const updateFromClient = (clientX, clientY) => {
      const rect = padEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const maxRadius = Math.max(24, rect.width * 0.36);

      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);
      const clampedDist = Math.min(dist, maxRadius);
      const mag = clampedDist / maxRadius;

      let clampedX = 0;
      let clampedY = 0;
      let nx = 0;
      let ny = 0;

      if (dist > 0.001) {
        const ux = dx / dist;
        const uy = dy / dist;
        clampedX = ux * clampedDist;
        clampedY = uy * clampedDist;
        nx = ux * mag;
        ny = uy * mag;
      }

      knobEl.style.transform = `translate(calc(-50% + ${clampedX.toFixed(1)}px), calc(-50% + ${clampedY.toFixed(1)}px))`;
      onUpdate(nx, ny, mag, true);
    };

    const releaseStick = () => {
      if (activePointerId === null) return;
      activePointerId = null;
      padEl.classList.remove('active');
      knobEl.style.transform = 'translate(-50%, -50%)';
      onUpdate(0, 0, 0, false);
    };

    padEl.addEventListener('pointerdown', (e) => {
      if (activePointerId !== null) return;
      e.preventDefault();
      e.stopPropagation();
      activePointerId = e.pointerId;
      padEl.classList.add('active');
      try {
        padEl.setPointerCapture(e.pointerId);
      } catch (_) {
        // Fallback relies on window pointer listeners
      }
      updateFromClient(e.clientX, e.clientY);
    });

    padEl.addEventListener('pointermove', (e) => {
      if (e.pointerId !== activePointerId) return;
      e.preventDefault();
      updateFromClient(e.clientX, e.clientY);
    });

    const onPointerEnd = (e) => {
      if (e.pointerId !== activePointerId) return;
      e.preventDefault();
      releaseStick();
    };

    padEl.addEventListener('pointerup', onPointerEnd);
    padEl.addEventListener('pointercancel', onPointerEnd);
    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);
  }
}
