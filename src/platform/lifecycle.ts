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

