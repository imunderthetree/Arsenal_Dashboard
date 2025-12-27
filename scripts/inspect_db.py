import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'arsenal.db')

def inspect_db(path):
    if not os.path.exists(path):
        print(json.dumps({'error': f"Database not found at {path}"}))
        return

    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall()]

    out = {}
    for t in tables:
        try:
            cur.execute(f"SELECT COUNT(*) as cnt FROM {t}")
            cnt = cur.fetchone()[0]

            cur.execute(f"SELECT * FROM {t} LIMIT 5")
            rows = [dict(r) for r in cur.fetchall()]

            out[t] = {'count': cnt, 'sample': rows}
        except Exception as e:
            out[t] = {'error': str(e)}

    conn.close()
    print(json.dumps(out, indent=2, default=str))

if __name__ == '__main__':
    inspect_db(DB_PATH)
