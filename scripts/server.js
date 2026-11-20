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

// Zero-dependency CORS middleware (tidak perlu npm package cors tambahan)
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

// Gunakan file database yang ada atau default barber_licenses.json
const DB_FILE = fs.existsSync(path.join(DATA_DIR, 'barber_licenses.json'))
  ? path.join(DATA_DIR, 'barber_licenses.json')
  : fs.existsSync(path.join(DATA_DIR, 'licenses.json'))
    ? path.join(DATA_DIR, 'licenses.json')
    : path.join(DATA_DIR, 'barber_licenses.json');

function loadDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      licenses: [
        {
          id: 1,
          license_key: 'KS-DEMO-KOSKU-2026',
          client_name: 'Kos Demo Percontohan',
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
    return JSON.parse(raw);
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
  return `KS-${seg()}-${seg()}-${seg()}`;
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
    service: 'Barber Suite License Server',
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
    // Pendaftaran trial baru (14 hari)
    const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    trial = {
      device_id,
      device_name: device_name || 'Perangkat Baru',
      device_info: device_info || {},
      shop_name: sName || 'Belum diatur',
      whatsapp: phone,
      shop_address: sAddr,
      total_transactions: trxCount,
      total_revenue: rev,
      app_version: version,
      started_at: now.toISOString(),
      expires_at: expiresAt,
      is_active: true,
      last_seen: now.toISOString(),
    };
    db.trials.push(trial);
    saveDb(db);

    const token = createToken({
      type: 'trial',
      device_id,
      expires_at: expiresAt,
    });

    return res.json({
      success: true,
      is_valid: true,
      days_left: 14,
      started_at: trial.started_at,
      expires_at: trial.expires_at,
      token,
    });
  }

  // Update existing trial
  trial.last_seen = now.toISOString();
  if (device_name) trial.device_name = device_name;
  if (device_info && Object.keys(device_info).length > 0) trial.device_info = device_info;
  if (sName && sName !== 'Belum diatur') trial.shop_name = sName;
  if (phone) trial.whatsapp = phone;
  if (sAddr) trial.shop_address = sAddr;
  if (typeof total_transactions === 'number') trial.total_transactions = total_transactions;
  if (typeof total_revenue === 'number') trial.total_revenue = total_revenue;
  if (app_version) trial.app_version = app_version;
  saveDb(db);

  const expiryMs = new Date(trial.expires_at).getTime();
  const diffMs = expiryMs - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isValid = diffMs > 0 && trial.is_active;

  const token = createToken({
    type: 'trial',
    device_id,
    expires_at: trial.expires_at,
  });

  if (!isValid) {
    return res.json({
      success: true,
      is_valid: false,
      days_left: 0,
      started_at: trial.started_at,
      expires_at: trial.expires_at,
      message:
        'Masa uji coba gratis (14 hari) telah selesai. Masukkan kode lisensi untuk melanjutkan.',
    });
  }

  return res.json({
    success: true,
    is_valid: true,
    days_left: daysLeft,
    started_at: trial.started_at,
    expires_at: trial.expires_at,
    token,
  });
});

/**
 * Activate License Key & Bind Device
 */
app.post('/api/activate', (req, res) => {
  const { license_key, device_id, device_name, device_info } = req.body || {};
  if (!license_key || !device_id) {
    return res
      .status(400)
      .json({ success: false, error: 'license_key dan device_id wajib disertakan.' });
  }

  const cleanKey = String(license_key).trim().toUpperCase();
  const db = loadDb();
  const license = db.licenses.find((l) => l.license_key === cleanKey);

  if (!license) {
    return res.status(404).json({
      success: false,
      error: 'Kode lisensi tidak ditemukan. Periksa kembali huruf dan angka kode lisensi Anda.',
    });
  }

  if (license.status !== 'active') {
    return res.status(403).json({
      success: false,
      error: 'Kode lisensi ini sedang dinonaktifkan oleh administrator.',
    });
  }

  if (license.expires_at) {
    const expMs = new Date(license.expires_at).getTime();
    if (Date.now() > expMs) {
      return res.status(403).json({
        success: false,
        error: 'Masa berlaku kode lisensi ini telah selesai. Silakan hubungi admin.',
      });
    }
  }

  if (!license.devices) license.devices = [];

  const existingDevice = license.devices.find((d) => d.device_id === device_id);

  if (!existingDevice) {
    // Cek kuota perangkat
    if (license.devices.length >= license.max_devices) {
      return res.status(400).json({
        success: false,
        error: `Kuota perangkat untuk lisensi ini sudah penuh (Maksimal ${license.max_devices} perangkat). Hubungi admin untuk reset HP atau upgrade kuota.`,
      });
    }

    license.devices.push({
      device_id,
      device_name: device_name || 'Kos Device',
      device_info: device_info || {},
      bound_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
    });
  } else {
    existingDevice.last_active = new Date().toISOString();
    if (device_name) existingDevice.device_name = device_name;
  }

  saveDb(db);

  const token = createToken({
    type: 'paid',
    license_id: license.id,
    license_key: license.license_key,
    client_name: license.client_name,
    device_id,
    expires_at: license.expires_at,
  });

  return res.json({
    success: true,
    client_name: license.client_name,
    token,
    expires_at: license.expires_at,
    message: 'Lisensi Kos Suite resmi berhasil diaktifkan pada perangkat ini.',
  });
});

/**
 * Verify Token
 */
app.post('/api/verify', (req, res) => {
  const { token, device_id } = req.body || {};
  if (!token || !device_id) {
    return res.json({ success: false, valid: false });
  }

  const payload = verifyToken(token);
  if (!payload || payload.device_id !== device_id) {
    return res.json({ success: false, valid: false });
  }

  if (payload.expires_at) {
    if (Date.now() > new Date(payload.expires_at).getTime()) {
      return res.json({ success: false, valid: false, error: 'Expired' });
    }
  }

  if (payload.type === 'paid') {
    const db = loadDb();
    const license = db.licenses.find((l) => l.license_key === payload.license_key);
    if (!license || license.status !== 'active') {
      return res.json({ success: false, valid: false });
    }
  }

  return res.json({ success: true, valid: true });
});

// -------------------------------------------------------------
// ADMIN API ENDPOINTS (Protected with requireAdmin)
// -------------------------------------------------------------

/**
 * Get all licenses with bound devices count
 */
app.get('/api/admin/licenses', requireAdmin, (req, res) => {
  const db = loadDb();
  const licenses = db.licenses.map((l) => ({
    id: l.id,
    license_key: l.license_key,
    client_name: l.client_name,
    max_devices: l.max_devices,
    expires_at: l.expires_at,
    status: l.status,
    created_at: l.created_at,
    bound_count: (l.devices || []).length,
    devices: l.devices || [],
  }));

  res.json({ success: true, licenses });
});

/**
 * Create new license
 */
app.post('/api/admin/licenses', requireAdmin, (req, res) => {
  const { client_name, custom_key, max_devices, expires_at } = req.body || {};
  if (!client_name) {
    return res.status(400).json({ success: false, error: 'client_name wajib diisi.' });
  }

  const db = loadDb();
  const key = custom_key
    ? String(custom_key).trim().toUpperCase()
    : generateLicenseKey();

  if (db.licenses.some((l) => l.license_key === key)) {
    return res.status(400).json({ success: false, error: 'Kunci lisensi tersebut sudah dipakai.' });
  }

  const newLic = {
    id: db.nextLicenseId++,
    license_key: key,
    client_name: client_name.trim(),
    max_devices: parseInt(max_devices || '1', 10),
    expires_at: expires_at ? new Date(expires_at).toISOString() : null,
    status: 'active',
    created_at: new Date().toISOString(),
    devices: [],
  };

  db.licenses.unshift(newLic);
  saveDb(db);

  res.json({
    success: true,
    license: {
      ...newLic,
      bound_count: 0,
    },
  });
});

/**
 * Reset bound devices on license (Reset HP)
 */
app.post('/api/admin/licenses/:id/reset', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = loadDb();
  const license = db.licenses.find((l) => l.id === id);

  if (!license) {
    return res.status(404).json({ success: false, error: 'Lisensi tidak ditemukan.' });
  }

  license.devices = [];
  saveDb(db);

  res.json({ success: true, message: 'Semua perangkat pada lisensi ini telah berhasil dilepas.' });
});

/**
 * Toggle Status (active/inactive)
 */
app.post('/api/admin/licenses/:id/toggle-status', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = loadDb();
  const license = db.licenses.find((l) => l.id === id);

  if (!license) {
    return res.status(404).json({ success: false, error: 'Lisensi tidak ditemukan.' });
  }

  license.status = license.status === 'active' ? 'inactive' : 'active';
  saveDb(db);

  res.json({ success: true, status: license.status });
});

/**
 * Delete license
 */
app.delete('/api/admin/licenses/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = loadDb();
  const idx = db.licenses.findIndex((l) => l.id === id);

  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Lisensi tidak ditemukan.' });
  }

  db.licenses.splice(idx, 1);
  saveDb(db);

  res.json({ success: true, message: 'Lisensi berhasil dihapus.' });
});

/**
 * Get all devices in 14-day trial
 */
app.get('/api/admin/trials', requireAdmin, (req, res) => {
  const db = loadDb();
  const now = Date.now();

  const trials = (db.trials || []).map((t) => {
    const expMs = new Date(t.expires_at).getTime();
    const diff = expMs - now;
    const daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    const isActive = diff > 0 && t.is_active;

    return {
      device_id: t.device_id,
      device_name: t.device_name || 'Perangkat Baru',
      shop_name: t.shop_name || 'Belum diatur',
      whatsapp: t.whatsapp || t.shop_phone || '',
      shop_address: t.shop_address || '',
      last_seen: t.last_seen || t.started_at,
      total_transactions: t.total_transactions || 0,
      total_revenue: t.total_revenue || 0,
      app_version: t.app_version || 'v4.2.0',
      device_info: t.device_info || {},
      started_at: t.started_at,
      expires_at: t.expires_at,
      days_left: daysLeft,
      is_active: isActive,
    };
  });

  // Sort: yang paling baru dibuka (last_seen) berada di urutan teratas
  trials.sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime());

  res.json({ success: true, trials });
});

/**
 * Perpanjang masa trial perangkat (+N hari, default 7 hari)
 */
app.post('/api/admin/trials/:deviceId/extend', requireAdmin, (req, res) => {
  const { deviceId } = req.params;
  const daysToAdd = parseInt(req.body?.days || 7, 10);
  const db = loadDb();
  const trial = (db.trials || []).find((t) => t.device_id === deviceId);

  if (!trial) {
    return res.status(404).json({ success: false, error: 'Data trial perangkat tidak ditemukan.' });
  }

  const baseMs = Math.max(Date.now(), new Date(trial.expires_at).getTime());
  const newExpiry = new Date(baseMs + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
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
