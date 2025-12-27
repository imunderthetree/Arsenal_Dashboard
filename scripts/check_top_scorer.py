import sqlite3
import os

DB = os.path.join(os.path.dirname(__file__), '..', 'arsenal.db')

def main():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("PRAGMA table_info(players)")
    cols = [c[1] for c in cur.fetchall()]
    print('players columns:', cols)

    # try common goals columns
    for goals_col in ('Goals','goals','GOALS','G','g'):
        if goals_col in cols:
            print('Using goals column:', goals_col)
            try:
                cur.execute(f"SELECT * FROM players ORDER BY {goals_col} DESC LIMIT 1")
                r = cur.fetchone()
                if r:
                    print('Top player row keys:', list(dict(r).keys()))
                    # Try to print common name fields
                    d = dict(r)
                    name = d.get('FirstName') or d.get('Firstname') or d.get('Player') or d.get('LastName') or d.get('Name')
                    print('Top scorer sample:', name, '-', d.get(goals_col))
                else:
                    print('No rows in players')
            except Exception as e:
                print('Error querying players by', goals_col, e)
            break
    else:
        print('No recognized goals column found')

    conn.close()

if __name__ == '__main__':
    main()
