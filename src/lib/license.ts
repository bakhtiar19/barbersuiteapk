import { CapacitorHttp } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';

const LICENSE_STORAGE_KEY = 'barber_license_data';
const TRIAL_STORAGE_KEY = 'barber_trial_data';
const DEVICE_ID_KEY = 'barber_device_id';

const CANDIDATE_SERVERS = [
  (import.meta.env.VITE_LICENSE_SERVER_URL as string | undefined),
  '', // Same origin relative path (untuk reverse proxy web hosting / Vercel / Nginx)
  'https://barbersuite.site',
  'https://admin.barbersuite.site',
  'https://202.10.35.192',
  'http://202.10.35.192',
].filter((s) => s !== undefined && s !== null) as string[];

export interface StoredLicense {
  licenseKey: string;
  clientName: string;
  token: string;
  expiresAt: string | null;
  activatedAt: string;
  lastVerifiedAt: string;
}

export interface StoredTrial {
  startedAt: string;
  expiresAt: string;
  token?: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  model: string;
  platform: string;
  osVersion: string;
}

export interface AppAccessState {
  hasAccess: boolean;
  isTrial: boolean;
  daysLeft?: number;
  clientName?: string;
  expiresAt?: string | null;
  error?: string;
}

/**
 * Robust API caller using Native CapacitorHttp (bypasses browser mixed content & SSL issues)
 * with automatic fallback to standard fetch for Web browsers.
 */
async function callLicenseApi(
  endpoint: string,
  body: object
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  let lastError: Error | null = null;

  // 1. Try Native CapacitorHttp first (Android / iOS native networking)
  for (const base of CANDIDATE_SERVERS) {
    try {
      const url = `${base}${endpoint}`;
      const response = await CapacitorHttp.post({
        url,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        data: body,
        connectTimeout: 8000,
        readTimeout: 8000,
      });

      if (response && response.data) {
        const ok = response.status >= 200 && response.status < 300;
        const data =
          typeof response.data === 'string'
            ? JSON.parse(response.data)
            : response.data;
        return { ok, status: response.status, data };
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  // 2. Fallback to standard browser fetch (for Web browser preview)
  for (const base of CANDIDATE_SERVERS) {
    try {
      const url = `${base}${endpoint}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      return { ok: response.ok, status: response.status, data };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw (
    lastError ||
    new Error(
      'Koneksi internet bermasalah. Pastikan perangkat terhubung ke internet lalu coba lagi.'
    )
  );
}

/**
 * Mendapatkan ID unik perangkat (Hardware UUID di Android/iOS atau persistent UUID di Web)
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  let deviceId = '';
  let model = 'Unknown';
  let platform = 'web';
  let osVersion = 'Unknown';
  let deviceName = 'Barber Device';

  try {
    const idInfo = await Device.getId();
    if (idInfo && idInfo.identifier) {
      deviceId = idInfo.identifier;
    }
  } catch {
    // Fallback for environments where Device.getId() is unavailable
  }

  // Fallback to Preferences if empty
  if (!deviceId) {
    const stored = await Preferences.get({ key: DEVICE_ID_KEY });
    if (stored.value) {
      deviceId = stored.value;
    } else {
      deviceId =
        'WEB-' +
        (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2) + Date.now().toString(36));
      await Preferences.set({ key: DEVICE_ID_KEY, value: deviceId });
    }
  }

  try {
    const info = await Device.getInfo();
    model = info.model || 'Unknown';
    platform = info.platform || 'web';
    osVersion = info.osVersion || 'Unknown';
    deviceName = `${info.manufacturer || ''} ${model} (${platform})`.trim();
  } catch {
    deviceName = `Browser (${navigator.userAgent.substring(0, 30)}...)`;
  }

  return {
    deviceId,
    deviceName,
    model,
    platform,
    osVersion,
  };
}

/**
 * Mengambil data lisensi berbayar lokal
 */
export async function getStoredLicense(): Promise<StoredLicense | null> {
  try {
    const res = await Preferences.get({ key: LICENSE_STORAGE_KEY });
    if (!res.value) return null;
    return JSON.parse(res.value) as StoredLicense;
  } catch {
    return null;
  }
}

export async function saveStoredLicense(license: StoredLicense): Promise<void> {
  await Preferences.set({
    key: LICENSE_STORAGE_KEY,
    value: JSON.stringify(license),
  });
}

export async function removeStoredLicense(): Promise<void> {
  await Preferences.remove({ key: LICENSE_STORAGE_KEY });
}

/**
 * Mengambil data trial lokal
 */
export async function getStoredTrial(): Promise<StoredTrial | null> {
  try {
    const res = await Preferences.get({ key: TRIAL_STORAGE_KEY });
    if (!res.value) return null;
    return JSON.parse(res.value) as StoredTrial;
  } catch {
    return null;
  }
}

export async function saveStoredTrial(trial: StoredTrial): Promise<void> {
  await Preferences.set({
    key: TRIAL_STORAGE_KEY,
    value: JSON.stringify(trial),
  });
}

export interface TrialMetadata {
  shop_name?: string;
  shop_phone?: string;
  whatsapp?: string;
  shop_address?: string;
  total_transactions?: number;
  total_revenue?: number;
  app_version?: string;
}

const META_SHOP_NAME_KEY = 'barber_meta_shop_name';
const META_SHOP_PHONE_KEY = 'barber_meta_shop_phone';
const META_SHOP_ADDR_KEY = 'barber_meta_shop_address';
const META_TRX_COUNT_KEY = 'barber_meta_trx_count';

/**
 * Sinkronisasi data profil toko & keaktifan ke license server
 */
export async function syncTrialMetadata(meta: TrialMetadata): Promise<void> {
  if (meta.shop_name) await Preferences.set({ key: META_SHOP_NAME_KEY, value: meta.shop_name }).catch(() => undefined);
  if (meta.shop_phone || meta.whatsapp) await Preferences.set({ key: META_SHOP_PHONE_KEY, value: meta.shop_phone || meta.whatsapp || '' }).catch(() => undefined);
  if (meta.shop_address) await Preferences.set({ key: META_SHOP_ADDR_KEY, value: meta.shop_address }).catch(() => undefined);
  if (typeof meta.total_transactions === 'number') await Preferences.set({ key: META_TRX_COUNT_KEY, value: String(meta.total_transactions) }).catch(() => undefined);

  // Kirim data terbaru ke license server
  void checkTrialStatus(meta).catch(() => undefined);
}

/**
 * Cek status trial otomatis 14 hari
 */
export async function checkTrialStatus(meta?: TrialMetadata): Promise<{
  isValid: boolean;
  daysLeft: number;
  expiresAt: string;
  error?: string;
}> {
  if (meta?.shop_name) await Preferences.set({ key: META_SHOP_NAME_KEY, value: meta.shop_name }).catch(() => undefined);
  if (meta?.shop_phone || meta?.whatsapp) await Preferences.set({ key: META_SHOP_PHONE_KEY, value: meta.shop_phone || meta.whatsapp || '' }).catch(() => undefined);
  if (meta?.shop_address) await Preferences.set({ key: META_SHOP_ADDR_KEY, value: meta.shop_address }).catch(() => undefined);
  if (typeof meta?.total_transactions === 'number') await Preferences.set({ key: META_TRX_COUNT_KEY, value: String(meta.total_transactions) }).catch(() => undefined);

  const cachedShop = meta?.shop_name || (await Preferences.get({ key: META_SHOP_NAME_KEY }).then((r) => r.value || '').catch(() => ''));
  const cachedPhone = meta?.shop_phone || meta?.whatsapp || (await Preferences.get({ key: META_SHOP_PHONE_KEY }).then((r) => r.value || '').catch(() => ''));
  const cachedAddr = meta?.shop_address || (await Preferences.get({ key: META_SHOP_ADDR_KEY }).then((r) => r.value || '').catch(() => ''));
  const cachedTrxStr = await Preferences.get({ key: META_TRX_COUNT_KEY }).then((r) => r.value || '').catch(() => '');
  const cachedTrx = typeof meta?.total_transactions === 'number' ? meta.total_transactions : (cachedTrxStr ? parseInt(cachedTrxStr, 10) : 0);

  const device = await getDeviceInfo();

  try {
    const { ok, data } = await callLicenseApi('/api/trial/check', {
      device_id: device.deviceId,
      device_name: device.deviceName,
      shop_name: cachedShop || undefined,
      shop_phone: cachedPhone || undefined,
      whatsapp: cachedPhone || undefined,
      shop_address: cachedAddr || undefined,
      total_transactions: cachedTrx,
      app_version: meta?.app_version || 'v4.2.0',
      device_info: {
        model: device.model,
        platform: device.platform,
        osVersion: device.osVersion,
      },
    });

    if (ok && data.success) {
      const expiresAt = (data.expires_at as string) || '';
      const daysLeft = typeof data.days_left === 'number' ? data.days_left : 14;
      const isValid = Boolean(data.is_valid);

      await saveStoredTrial({
        startedAt: (data.started_at as string) || new Date().toISOString(),
        expiresAt: expiresAt,
        token: (data.token as string) || undefined,
      });

      if (!isValid) {
        return {
          isValid: false,
          daysLeft: 0,
          expiresAt,
          error:
            (data.message as string) ||
            'Masa uji coba gratis telah selesai. Masukkan kode lisensi untuk melanjutkan.',
        };
      }

      return {
        isValid: true,
        daysLeft,
        expiresAt,
      };
    }
  } catch {
    // Offline fallback: periksa catatan trial yang tersimpan di HP
    const cached = await getStoredTrial();
    if (cached && cached.expiresAt) {
      const nowMs = Date.now();
      const expiryMs = new Date(cached.expiresAt).getTime();
      const isValid = nowMs <= expiryMs;
      const daysLeft = Math.max(0, Math.ceil((expiryMs - nowMs) / (1000 * 60 * 60 * 24)));

      if (isValid) {
        return { isValid: true, daysLeft, expiresAt: cached.expiresAt };
      } else {
        return {
          isValid: false,
          daysLeft: 0,
          expiresAt: cached.expiresAt,
          error: 'Masa uji coba gratis telah selesai. Masukkan kode lisensi untuk melanjutkan.',
        };
      }
    }
  }

  // Jika pertama kali dan offline total, berikan izin trial lokal
  const fallbackExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  await saveStoredTrial({
    startedAt: new Date().toISOString(),
    expiresAt: fallbackExpiry,
  });
  return { isValid: true, daysLeft: 14, expiresAt: fallbackExpiry };
}

/**
 * Pengecekan Akses Aplikasi Menyeluruh:
 * 1. Jika punya Lisensi Berbayar valid -> Akses Terbuka Penuh.
 * 2. Jika tidak ada Lisensi Berbayar -> Otomatis gunakan Trial 14 Hari.
 * 3. Jika Trial 14 Hari habis -> Terkunci (Minta input kredensial).
 */
export async function checkAppAccess(meta?: TrialMetadata): Promise<AppAccessState> {
  const paidLicense = await getStoredLicense();

  // 1. Cek Lisensi Berbayar
  if (paidLicense && paidLicense.token) {
    if (paidLicense.expiresAt) {
      const expiryMs = new Date(paidLicense.expiresAt).getTime();
      if (Date.now() > expiryMs) {
        return {
          hasAccess: false,
          isTrial: false,
          error: 'Masa berlaku kode lisensi Anda telah berakhir.',
        };
      }
    }

    // Background verify jika online
    if (navigator.onLine) {
      const device = await getDeviceInfo();
      callLicenseApi('/api/verify', {
        token: paidLicense.token,
        device_id: device.deviceId,
      }).then(({ ok, status, data }) => {
        if (!ok || status === 403 || !data.valid) {
          removeStoredLicense();
        }
      }).catch(() => {});
    }

    return {
      hasAccess: true,
      isTrial: false,
      clientName: paidLicense.clientName,
      expiresAt: paidLicense.expiresAt,
    };
  }

  // 2. Jika belum punya lisensi berbayar -> Cek Masa Uji Coba 14 Hari
  const trial = await checkTrialStatus(meta);
  if (trial.isValid) {
    return {
      hasAccess: true,
      isTrial: true,
      daysLeft: trial.daysLeft,
      expiresAt: trial.expiresAt,
    };
  }

  // 3. Masa uji coba habis -> Terkunci
  return {
    hasAccess: false,
    isTrial: true,
    daysLeft: 0,
    expiresAt: trial.expiresAt,
    error: trial.error || 'Masa uji coba gratis telah selesai. Masukkan kode lisensi untuk melanjutkan.',
  };
}

/**
 * Melakukan aktivasi lisensi ke server VPS (Kredensial Single atau Multi-Device)
 */
export async function activateDeviceWithLicense(licenseKey: string): Promise<{
  success: boolean;
  clientName: string;
  expiresAt: string | null;
  message?: string;
}> {
  const device = await getDeviceInfo();

  const { ok, data } = await callLicenseApi('/api/activate', {
    license_key: licenseKey.trim().toUpperCase(),
    device_id: device.deviceId,
    device_name: device.deviceName,
    device_info: {
      model: device.model,
      platform: device.platform,
      osVersion: device.osVersion,
    },
  });

  if (!ok || !data.success) {
    const raw = typeof data.error === 'string' ? data.error : (typeof data.message === 'string' ? data.message : '');
    throw new Error(raw || 'Aktivasi belum berhasil. Silakan periksa kembali kode lisensi Anda.');
  }

  const stored: StoredLicense = {
    licenseKey: licenseKey.trim().toUpperCase(),
    clientName: (data.client_name as string) || 'Pelanggan Barber Suite',
    token: data.token as string,
    expiresAt: (data.expires_at as string) || null,
    activatedAt: new Date().toISOString(),
    lastVerifiedAt: new Date().toISOString(),
  };

  await saveStoredLicense(stored);

  return {
    success: true,
    clientName: stored.clientName,
    expiresAt: stored.expiresAt,
    message: data.message as string | undefined,
  };
}
