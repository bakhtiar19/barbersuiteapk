import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface SaveFileOptions {
  filename: string;
  content: string | Blob;
  mimeType: string;
  shareAfterSave?: boolean;
  shareTitle?: string;
  shareText?: string;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file untuk disimpan.'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

export async function saveFile(options: SaveFileOptions): Promise<{ savedPath?: string; shared: boolean }> {
  const { filename, content, mimeType, shareAfterSave = false, shareTitle, shareText } = options;

  if (Capacitor.isNativePlatform()) {
    const isText = typeof content === 'string';
    const fileData = isText ? content : await blobToBase64(content);
    let fileUri: string;
    let fellBackToCache = false;

    try {
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: fileData,
        directory: Directory.Documents,
        encoding: isText ? Encoding.UTF8 : undefined,
        recursive: true,
      });
      fileUri = writeResult.uri;
    } catch {
      const cacheResult = await Filesystem.writeFile({
        path: filename,
        data: fileData,
        directory: Directory.Cache,
        encoding: isText ? Encoding.UTF8 : undefined,
        recursive: true,
      });
      fileUri = cacheResult.uri;
      fellBackToCache = true;
    }

    if (shareAfterSave || fellBackToCache) {
      await Share.share({
        title: shareTitle || filename,
        text: shareText,
        url: fileUri,
        dialogTitle: shareTitle || 'Simpan / Bagikan file',
      });
      return { savedPath: fileUri, shared: true };
    }

    return { savedPath: fileUri, shared: false };
  }

  // Web / PWA fallback
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });

  if (shareAfterSave && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const file = new File([blob], filename, { type: mimeType });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: shareTitle || filename,
          text: shareText,
          files: [file],
        });
        return { shared: true };
      }
    } catch (err) {
      // If user cancels share sheet, don't force download; otherwise fall back to download
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { shared: false };
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 1500);

  return { savedPath: filename, shared: false };
}

export async function sharePlainText(title: string, text: string): Promise<'shared' | 'copied'> {
  if (Capacitor.isNativePlatform()) {
    await Share.share({ title, text, dialogTitle: title });
    return 'shared';
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return 'copied';
  }

  // Legacy textarea copy fallback
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  return 'copied';
}

export async function copyPlainText(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fallback below
    }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

interface AndroidWhatsAppBridge {
  sendReceiptToWhatsApp: (
    phone: string,
    text: string,
    base64Image: string,
    filename: string,
  ) => string;
}

declare global {
  interface Window {
    AndroidWhatsAppBridge?: AndroidWhatsAppBridge;
  }
}

export async function shareImageWithText(options: {
  filename: string;
  blob: Blob;
  mimeType: string;
  title: string;
  text: string;
  phone?: string | null;
}): Promise<'wa-direct-image' | 'native-shared' | 'web-shared' | 'downloaded'> {
  const { filename, blob, mimeType, title, text, phone } = options;

  if (
    phone &&
    typeof window !== 'undefined' &&
    window.AndroidWhatsAppBridge &&
    typeof window.AndroidWhatsAppBridge.sendReceiptToWhatsApp === 'function'
  ) {
    const base64Data = await blobToBase64(blob);
    const result = window.AndroidWhatsAppBridge.sendReceiptToWhatsApp(
      phone,
      text,
      base64Data,
      filename,
    );
    if (typeof result === 'string' && result.startsWith('sent:')) {
      return 'wa-direct-image';
    }
  }

  if (Capacitor.isNativePlatform()) {
    await copyPlainText(text).catch(() => undefined);
    const writeResult = await Filesystem.writeFile({
      path: filename,
      data: await blobToBase64(blob),
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({
      title,
      text,
      url: writeResult.uri,
      dialogTitle: title,
    });
    return 'native-shared';
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const file = new File([blob], filename, { type: mimeType });
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      // Copy text quietly as backup in case target app only reads the image file
      await copyPlainText(text).catch(() => undefined);
      await navigator.share({
        title,
        text,
        files: [file],
      });
      return 'web-shared';
    }
  }

  // Desktop / non-HTTPS fallback: download lightweight receipt image so user can attach it
  await saveFile({
    filename,
    content: blob,
    mimeType,
    shareAfterSave: false,
  });
  return 'downloaded';
}

