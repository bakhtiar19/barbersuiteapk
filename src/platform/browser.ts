import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

function toNativeWhatsAppScheme(url: string): string | null {
  if (url.startsWith('whatsapp://')) {
    return url;
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'wa.me') {
      const phone = parsed.pathname.replace(/^\/+/, '').replace(/\D/g, '');
      const text = parsed.searchParams.get('text') ?? '';
      if (phone) {
        return `whatsapp://send?phone=${phone}${text ? `&text=${encodeURIComponent(text)}` : ''}`;
      }
    }
    if (parsed.hostname === 'api.whatsapp.com' && parsed.pathname.startsWith('/send')) {
      const phone = (parsed.searchParams.get('phone') ?? '').replace(/\D/g, '');
      const text = parsed.searchParams.get('text') ?? '';
      if (phone) {
        return `whatsapp://send?phone=${phone}${text ? `&text=${encodeURIComponent(text)}` : ''}`;
      }
    }
  } catch {
    // Not a standard URL
  }
  return null;
}

export async function openExternalUrl(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const nativeWaUrl = toNativeWhatsAppScheme(url);
    if (nativeWaUrl) {
      window.location.href = nativeWaUrl;
      return;
    }

    try {
      await Browser.open({ url });
      return;
    } catch {
      // Fallback to window.open if Browser plugin fails on universal link
    }
  }
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    window.location.href = url;
  }
}
