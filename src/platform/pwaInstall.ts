import { Capacitor } from '@capacitor/core';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_STORAGE_KEY = 'barber_home_install_dismissed';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listenersInitialized = false;
const subscribers = new Set<() => void>();

function notifySubscribers() {
  for (const listener of subscribers) {
    listener();
  }
}

export function initPwaInstallListener(): void {
  if (listenersInitialized || typeof window === 'undefined') return;
  listenersInitialized = true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifySubscribers();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifySubscribers();
  });
}

export function subscribePwaInstall(listener: () => void): () => void {
  initPwaInstallListener();
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

export function hasDeferredInstallPrompt(): boolean {
  return deferredPrompt !== null;
}

export async function triggerPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  notifySubscribers();

  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  return choice.outcome;
}

export function isRunningStandalone(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof window === 'undefined') return false;

  const displayModeStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return displayModeStandalone || iosStandalone;
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isClassicIos = /iPad|iPhone|iPod/.test(ua);
  const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isClassicIos || isIpadOs;
}

export function isHomeInstallDismissed(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(DISMISS_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissHomeInstallBanner(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DISMISS_STORAGE_KEY, '1');
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}
