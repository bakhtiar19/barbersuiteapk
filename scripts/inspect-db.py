import sqlite3
import json
import os

db_path = '/home/antigravity/barber-license-server/data/license.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} tidak ditemukan!")
    exit(1)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Checkpoint WAL agar 2MB data dari license.db-wal masuk ke database
try:
    cursor.execute("PRAGMA wal_checkpoint(FULL);")
    conn.commit()
except Exception as e:
    print("WAL checkpoint:", e)

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [r[0] for r in cursor.fetchall() if not r[0].startswith('sqlite_')]
print("==========================================================")
print(f"  STRUKTUR DATABASE SQLITE (license.db) DI VPS             ")
print("==========================================================")
print("Daftar Tabel:", tables)

data_summary = {}

for t in tables:
    cursor.execute(f"PRAGMA table_info({t});")
    cols = [c["name"] for c in cursor.fetchall()]
    cursor.execute(f"SELECT count(*) FROM {t};")
    count = cursor.fetchone()[0]
    print(f"\n>> Tabel: '{t}' (Total: {count} data)")
    print(f"   Kolom: {', '.join(cols)}")
    cursor.execute(f"SELECT * FROM {t} LIMIT 5;")
    rows = [dict(r) for r in cursor.fetchall()]
    data_summary[t] = rows
    print(f"   Contoh Data (5 pertama):")
    print(json.dumps(rows, indent=2, default=str))

print("\n==========================================================")
