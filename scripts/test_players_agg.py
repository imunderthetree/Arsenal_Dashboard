import sqlite3
import os

DB = os.path.join(os.path.dirname(__file__), '..', 'arsenal.db')

def run():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    print('Checking players aggregation...')
    cur.execute("PRAGMA table_info(players)")
    cols = [c[1] for c in cur.fetchall()]
    print('columns:', cols)

    # run same aggregation logic as the API and optionally test per-season join
    goals_col = None
    if 'G' in cols:
        goals_col = 'G'
    elif 'Goals' in cols:
        goals_col = 'Goals'
    elif 'goals' in cols:
        goals_col = 'goals'

    if not goals_col:
        print('No goals column found')
        conn.close()
        return

    # Aggregate across all seasons
    q = f"SELECT FirstName, LastName, SUM(COALESCE({goals_col},0)) as Goals FROM players GROUP BY FirstName, LastName ORDER BY Goals DESC LIMIT 10"
    cur.execute(q)
    print('\nTop scorers (all seasons):')
    for r in cur.fetchall():
        print(r['FirstName'], r['LastName'], r['Goals'])

    # Try per-season aggregation by joining on matches (if Season exists in matches)
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='matches'")
    if cur.fetchone():
        # pick a sample season from matches
        cur.execute("SELECT DISTINCT Season FROM matches ORDER BY Season")
        seasons = [row[0] for row in cur.fetchall()]
        if seasons:
            sample_season = seasons[0]
            print(f'\nSample season to test: {sample_season}')
            q2 = f"SELECT p.FirstName, p.LastName, SUM(COALESCE(p.{goals_col},0)) as Goals FROM players p JOIN matches m ON p.Date = m.Date WHERE m.Season = ? GROUP BY p.FirstName, p.LastName ORDER BY Goals DESC LIMIT 10"
            cur.execute(q2, (sample_season,))
            print(f'Top scorers for {sample_season}:')
            for r in cur.fetchall():
                print(r['FirstName'], r['LastName'], r['Goals'])
    else:
        print('No suitable columns found for aggregation')

    conn.close()

if __name__ == '__main__':
    run()
