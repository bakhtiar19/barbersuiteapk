import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export function subscribeToAppBackground(onBackground: () => void): () => void {
  if (Capacitor.isNativePlatform()) {
    let removeNativeListener: (() => void) | null = null;
    void App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        onBackground();
      }
    }).then((handle) => {
      removeNativeListener = () => {
        void handle.remove();
      };
    });
    return () => {
      removeNativeListener?.();
    };
  }

  const handleVisibility = () => {
    if (document.visibilityState === 'hidden') {
      onBackground();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}

let pullToRefreshDisabled = false;

function hasScrolledAncestor(target: EventTarget | null): boolean {
  let node = target instanceof HTMLElement ? target : null;
  while (node && node !== document.documentElement) {
    if (node.scrollTop > 0) {
      const style = window.getComputedStyle(node);
      if (
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        node.scrollHeight > node.clientHeight
      ) {
        return true;
      }
    }
    node = node.parentElement;
  }
  return false;
}

/**
 * Prevents accidental browser pull-to-refresh on mobile browsers (including iOS Safari)
 * when swiping downward at the top of the page.
 */
export function disablePullToRefresh(): void {
  if (pullToRefreshDisabled || typeof document === 'undefined') return;
  pullToRefreshDisabled = true;

  let startX = 0;
  let startY = 0;
  let startedAtTop = false;

  const getRootScrollTop = () =>
    window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

  document.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length !== 1) {
        startedAtTop = false;
        return;
      }
      const touch = e.touches[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
      startedAtTop = getRootScrollTop() <= 0 && !hasScrolledAncestor(e.target);
    },
    { passive: true },
  );

  document.addEventListener(
    'touchmove',
    (e) => {
      if (!startedAtTop || e.touches.length !== 1) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (
        getRootScrollTop() <= 0 &&
        !hasScrolledAncestor(e.target) &&
        dy > 10 &&
        dy > Math.abs(dx) &&
        e.cancelable
      ) {
        e.preventDefault();
      }
    },
    { passive: false },
  );

  const resetTouch = () => {
    startedAtTop = false;
  };
  document.addEventListener('touchend', resetTouch, { passive: true });
  document.addEventListener('touchcancel', resetTouch, { passive: true });
}

