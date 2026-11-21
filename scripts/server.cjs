const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load .env jika ada
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim();
        process.env[k] = v;
      }
    }
  });
}

const PORT = parseInt(process.env.PORT || '3000', 10);
const ADMIN_KEY = process.env.ADMIN_KEY || process.env.ADMIN_API_KEY || 'BarberAdmin2026';
const JWT_SECRET =
  process.env.JWT_SECRET || 'barber_suite_master_jwt_secret_71f0d2bf59dd477393380d122bc3bb43474';

const app = express();

// Zero-dependency CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-admin-key, admin-key');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

// Persistent JSON Database Engine
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'barber_licenses.json');

function loadDb() {
  const candidates = [
    path.join(DATA_DIR, 'kos_licenses.json'),
    path.join(DATA_DIR, 'licenses.json'),
    path.join(__dirname, 'data', 'kos_licenses.json'),
    path.join(__dirname, 'licenses.json'),
    path.join(__dirname, 'kos_licenses.json'),
  ];

  if (!fs.existsSync(DB_FILE)) {
    // Cari apakah ada data lama di file lain
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        try {
          const raw = fs.readFileSync(cand, 'utf8');
          const parsed = JSON.parse(raw);
          if ((parsed.licenses && parsed.licenses.length > 0) || (parsed.trials && parsed.trials.length > 0)) {
            fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf8');
            return parsed;
          }
        } catch (e) {}
      }
    }

    const initial = {
      licenses: [
        {
          id: 1,
          license_key: 'BARBER-DEMO-VIP-2026',
          client_name: 'Barbershop Percontohan',
          max_devices: 5,
          expires_at: null, // Lifetime
          status: 'active',
          created_at: new Date().toISOString(),
          devices: [],
        },
      ],
      trials: [],
      nextLicenseId: 2,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const current = JSON.parse(raw);
    const currentCount = (current.licenses?.length || 0) + (current.trials?.length || 0);

    // Jika file saat ini hanya memiliki data default/kosong, pulihkan dari kandidat yang lebih lengkap
    if (currentCount <= 1) {
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          try {
            const candRaw = fs.readFileSync(cand, 'utf8');
            const candDb = JSON.parse(candRaw);
            const candCount = (candDb.licenses?.length || 0) + (candDb.trials?.length || 0);
            if (candCount > currentCount) {
              fs.writeFileSync(DB_FILE, JSON.stringify(candDb, null, 2), 'utf8');
              return candDb;
            }
          } catch (e) {}
        }
      }
    }
    return current;
  } catch (err) {
    console.error('Error reading db file:', err);
    return { licenses: [], trials: [], nextLicenseId: 1 };
  }
}

function saveDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// Helpers
function generateLicenseKey() {
  const seg = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `BARBER-${seg()}-${seg()}-${seg()}`;
}

function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expected = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    if (signature !== expected) return null;
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

// Admin Auth Middleware
function requireAdmin(req, res, next) {
  const key =
    req.headers['x-admin-key'] ||
    req.headers['admin-key'] ||
    req.query.admin_key ||
    req.body?.admin_key;

  if (key === ADMIN_KEY) {
    return next();
  }
  return res.status(401).json({ success: false, error: 'Akses ditolak: Admin Key salah.' });
}

// -------------------------------------------------------------
// PUBLIC CLIENT API ENDPOINTS
// -------------------------------------------------------------

/**
 * Healthcheck
 */
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'Barber Suite License & Trial Server',
    time: new Date().toISOString(),
  });
});

/**
 * 14-Day Free Trial Check & Registration
 */
app.post('/api/trial/check', (req, res) => {
  const {
    device_id,
    device_name,
    device_info,
    shop_name,
    shop_phone,
    whatsapp,
    shop_address,
    total_transactions,
    total_revenue,
    app_version,
  } = req.body || {};

  if (!device_id) {
    return res.status(400).json({ success: false, message: 'device_id wajib disertakan.' });
  }

  const db = loadDb();
  let trial = db.trials.find((t) => t.device_id === device_id);

  const now = new Date();
  const phone = (whatsapp || shop_phone || '').trim();
  const sName = (shop_name || '').trim();
  const sAddr = (shop_address || '').trim();
  const version = app_version || 'v4.2.0';
  const trxCount = typeof total_transactions === 'number' ? total_transactions : 0;
  const rev = typeof total_revenue === 'number' ? total_revenue : 0;

  if (!trial) {
    const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    trial = {
      device_id,
      device_name: device_name || 'Barber Device',
      device_info: device_info || {},
      shop_name: sName || 'Barber Belum Dinamai',
      shop_phone: phone,
      whatsapp: phone,
      shop_address: sAddr,
      total_transactions: trxCount,
      total_revenue: rev,
      app_version: version,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      last_seen: now.toISOString(),
      last_login: now.toISOString(),
      is_active: true,
    };
    db.trials.push(trial);
    saveDb(db);
  } else {
    // Perbarui metadata toko dan waktu terakhir login
    trial.last_seen = now.toISOString();
    trial.last_login = now.toISOString();
    if (sName) trial.shop_name = sName;
    if (phone) {
      trial.shop_phone = phone;
      trial.whatsapp = phone;
    }
    if (sAddr) trial.shop_address = sAddr;
    if (device_name) trial.device_name = device_name;
    if (device_info && Object.keys(device_info).length > 0) trial.device_info = device_info;
    if (typeof total_transactions === 'number') trial.total_transactions = trxCount;
    if (typeof total_revenue === 'number') trial.total_revenue = rev;
    if (app_version) trial.app_version = version;
    saveDb(db);
  }

  const expiry = new Date(trial.expires_at);
  const isValid = now <= expiry;
  const daysLeft = Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const token = createToken({
    device_id,
    type: 'trial',
    started_at: trial.started_at,
    expires_at: trial.expires_at,
    is_valid: isValid,
  });

  res.json({
    success: true,
    is_valid: isValid,
    days_left: daysLeft,
    expires_at: trial.expires_at,
    started_at: trial.started_at,
    shop_name: trial.shop_name,
    shop_phone: trial.shop_phone,
    token,
    message: isValid
      ? `Masa trial aktif: ${daysLeft} hari tersisa.`
      : 'Masa trial 14 hari telah habis. Silakan aktivasi lisensi resmi.',
  });
});

/**
 * Aktivasi Lisensi Baru
 */
app.post('/api/license/activate', (req, res) => {
  const { license_key, device_id, device_name, device_info } = req.body || {};

  if (!license_key || !device_id) {
    return res.status(400).json({ success: false, message: 'Kunci lisensi dan ID perangkat diperlukan.' });
  }

  const db = loadDb();
  const cleanKey = license_key.trim().toUpperCase();
  const license = db.licenses.find((l) => l.license_key === cleanKey);

  if (!license) {
    return res.status(404).json({ success: false, message: 'Kunci lisensi tidak valid atau tidak terdaftar.' });
  }

  if (license.status !== 'active') {
    return res.status(403).json({ success: false, message: 'Lisensi ini telah dinonaktifkan oleh administrator.' });
  }

  if (license.expires_at && new Date() > new Date(license.expires_at)) {
    return res.status(403).json({ success: false, message: 'Masa berlaku lisensi ini telah kedaluwarsa.' });
  }

  license.devices = license.devices || [];
  const existingDevice = license.devices.find((d) => d.device_id === device_id);

  if (!existingDevice) {
    if (license.devices.length >= license.max_devices) {
      return res.status(403).json({
        success: false,
        message: `Batas kuota perangkat terlampaui (${license.devices.length}/${license.max_devices} perangkat). Hubungi admin untuk menambah kuota.`,
      });
    }

    license.devices.push({
      device_id,
      device_name: device_name || 'Device Barber',
      device_info: device_info || {},
      activated_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
    });
  } else {
    existingDevice.last_verified_at = new Date().toISOString();
    if (device_name) existingDevice.device_name = device_name;
    if (device_info) existingDevice.device_info = device_info;
  }

  saveDb(db);

  const token = createToken({
    license_id: license.id,
    license_key: license.license_key,
    client_name: license.client_name,
    device_id,
    expires_at: license.expires_at,
  });

  res.json({
    success: true,
    message: 'Aktivasi lisensi berhasil!',
    client_name: license.client_name,
    license_key: license.license_key,
    expires_at: license.expires_at,
    token,
  });
});

/**
 * Verifikasi token lisensi berkala
 */
app.post('/api/license/verify', (req, res) => {
  const { token, device_id } = req.body || {};

  if (!token || !device_id) {
    return res.status(400).json({ valid: false, message: 'Token dan ID perangkat diperlukan.' });
  }

  const payload = verifyToken(token);
  if (!payload || payload.device_id !== device_id) {
    return res.status(401).json({ valid: false, message: 'Token lisensi tidak valid.' });
  }

  const db = loadDb();
  const license = db.licenses.find((l) => l.license_key === payload.license_key);

  if (!license || license.status !== 'active') {
    return res.status(403).json({ valid: false, message: 'Lisensi tidak aktif atau dicabut.' });
  }

  if (license.expires_at && new Date() > new Date(license.expires_at)) {
    return res.status(403).json({ valid: false, message: 'Masa berlaku lisensi kedaluwarsa.' });
  }

  const dev = (license.devices || []).find((d) => d.device_id === device_id);
  if (dev) {
    dev.last_verified_at = new Date().toISOString();
    saveDb(db);
  }

  res.json({
    valid: true,
    client_name: license.client_name,
    expires_at: license.expires_at,
  });
});

// -------------------------------------------------------------
// ADMIN MANAGEMENT API ENDPOINTS
// -------------------------------------------------------------

app.get('/api/admin/licenses', requireAdmin, (req, res) => {
  const db = loadDb();
  res.json({ success: true, licenses: db.licenses });
});

app.post('/api/admin/licenses', requireAdmin, (req, res) => {
  const { client_name, custom_key, max_devices, expires_at } = req.body || {};
  if (!client_name) {
    return res.status(400).json({ success: false, error: 'Nama klien / barbershop wajib diisi.' });
  }

  const db = loadDb();
  const key = custom_key && custom_key.trim() !== '' ? custom_key.trim().toUpperCase() : generateLicenseKey();

  if (db.licenses.some((l) => l.license_key === key)) {
    return res.status(400).json({ success: false, error: 'Kunci lisensi sudah terdaftar. Gunakan kunci lain.' });
  }

  const newLicense = {
    id: db.nextLicenseId++,
    license_key: key,
    client_name: client_name.trim(),
    max_devices: parseInt(max_devices || '1', 10),
    expires_at: expires_at ? new Date(expires_at).toISOString() : null,
    status: 'active',
    created_at: new Date().toISOString(),
    devices: [],
  };

  db.licenses.push(newLicense);
  saveDb(db);
  res.json({ success: true, license: newLicense });
});

app.post('/api/admin/licenses/:id/reset', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = loadDb();
  const lic = db.licenses.find((l) => l.id === id);
  if (!lic) return res.status(404).json({ success: false, error: 'Lisensi tidak ditemukan.' });

  lic.devices = [];
  saveDb(db);
  res.json({ success: true, message: 'Semua perangkat berhasil di-reset dari lisensi.' });
});

app.post('/api/admin/licenses/:id/toggle-status', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = loadDb();
  const lic = db.licenses.find((l) => l.id === id);
  if (!lic) return res.status(404).json({ success: false, error: 'Lisensi tidak ditemukan.' });

  lic.status = lic.status === 'active' ? 'suspended' : 'active';
  saveDb(db);
  res.json({ success: true, status: lic.status });
});

app.delete('/api/admin/licenses/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = loadDb();
  const idx = db.licenses.findIndex((l) => l.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Lisensi tidak ditemukan.' });

  db.licenses.splice(idx, 1);
  saveDb(db);
  res.json({ success: true, message: 'Lisensi berhasil dihapus.' });
});

/**
 * Mengambil daftar trial diperkaya (Nama Barber, Nomor HP, Terakhir Login, Device, Status)
 */
app.get('/api/admin/trials', requireAdmin, (req, res) => {
  const db = loadDb();
  const now = new Date();

  const trials = (db.trials || [])
    .map((t) => {
      const exp = new Date(t.expires_at);
      const isActive = now <= exp;
      const daysLeft = Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      return {
        ...t,
        shop_name: t.shop_name || 'Barber Belum Dinamai',
        shop_phone: t.shop_phone || t.whatsapp || '',
        whatsapp: t.whatsapp || t.shop_phone || '',
        last_seen: t.last_seen || t.last_login || t.updated_at || t.started_at,
        is_active: isActive,
        days_left: daysLeft,
      };
    })
    .sort((a, b) => {
      const timeA = new Date(a.last_seen || a.started_at).getTime();
      const timeB = new Date(b.last_seen || b.started_at).getTime();
      return timeB - timeA;
    });

  res.json({ success: true, trials });
});

/**
 * Perpanjang masa trial perangkat (+7 hari atau kustom)
 */
app.post('/api/admin/trials/:deviceId/extend', requireAdmin, (req, res) => {
  const { deviceId } = req.params;
  const daysToAdd = parseInt(req.body?.days || '7', 10);

  const db = loadDb();
  const trial = (db.trials || []).find((t) => t.device_id === deviceId);

  if (!trial) {
    return res.status(404).json({ success: false, error: 'Data trial perangkat tidak ditemukan.' });
  }

  const now = new Date();
  const currentExpiry = new Date(trial.expires_at);
  const baseTime = currentExpiry > now ? currentExpiry.getTime() : now.getTime();
  const newExpiry = new Date(baseTime + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

  trial.expires_at = newExpiry;
  trial.is_active = true;
  saveDb(db);

  res.json({
    success: true,
    message: `Trial berhasil diperpanjang +${daysToAdd} hari.`,
    expires_at: newExpiry,
  });
});

/**
 * Hapus / reset trial perangkat
 */
app.delete('/api/admin/trials/:deviceId', requireAdmin, (req, res) => {
  const { deviceId } = req.params;
  const db = loadDb();
  const idx = (db.trials || []).findIndex((t) => t.device_id === deviceId);

  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Data trial perangkat tidak ditemukan.' });
  }

  db.trials.splice(idx, 1);
  saveDb(db);

  res.json({ success: true, message: 'Data trial perangkat berhasil dihapus.' });
});

// -------------------------------------------------------------
// SERVE CENTRAL ADMIN PORTAL (admin.barbersuite.site)
// -------------------------------------------------------------
const publicHtmlPath = path.join(__dirname, 'public', 'index.html');
const indexHtmlPath = path.join(__dirname, 'index.html');
const adminHtmlPath = path.join(__dirname, 'admin.html');
const fallbackHtmlPath = path.join(__dirname, '..', 'scripts', 'admin.html');

app.use(express.static(path.join(__dirname, 'public')));

app.get(['/', '/admin', '/admin/*'], (req, res) => {
  if (fs.existsSync(publicHtmlPath)) return res.sendFile(publicHtmlPath);
  if (fs.existsSync(indexHtmlPath)) return res.sendFile(indexHtmlPath);
  if (fs.existsSync(adminHtmlPath)) return res.sendFile(adminHtmlPath);
  if (fs.existsSync(fallbackHtmlPath)) return res.sendFile(fallbackHtmlPath);
  res.send('Barber Suite License Server is running.');
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`==========================================================`);
  console.log(`  Barber Suite License & Trial Server Aktif               `);
  console.log(`  Port: ${PORT}                                           `);
  console.log(`  Master Admin Key: ${ADMIN_KEY}                          `);
  console.log(`  Admin Portal: http://localhost:${PORT}/                 `);
  console.log(`==========================================================`);
});
