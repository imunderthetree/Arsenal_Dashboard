from flask import Flask, render_template, jsonify, request
import sqlite3
import json

app = Flask(__name__)

def get_db_connection():
    """Create database connection"""
    conn = sqlite3.connect('arsenal.db')
    conn.row_factory = sqlite3.Row
    return conn

def convert_season_format(season_url):
    """Convert URL season format (2022-2023) to DB format (2022/23)"""
    if season_url == 'all':
        return None
    
    parts = season_url.split('-')
    if len(parts) == 2:
        return f"{parts[0]}/{parts[1][-2:]}"
    return season_url

def convert_season_to_url(season_db):
    """Convert DB season format (2022/23) to URL format (2022-2023)"""
    if '/' in season_db:
        parts = season_db.split('/')
        year1 = parts[0]
        year2 = parts[1]
        # Handle both 2-digit and 4-digit second year
        if len(year2) == 2:
            year2 = year1[:2] + year2
        return f"{year1}-{year2}"
    return season_db

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/test')
def test_api():
    """Test endpoint to check database connectivity"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM matches")
        count = cursor.fetchone()['count']
        
        cursor.execute("SELECT DISTINCT Season FROM matches ORDER BY Season")
        seasons = [row['Season'] for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'status': 'success',
            'total_matches': count,
            'seasons': seasons
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/matches')
def get_matches():
    """Get all matches data"""
    try:
        conn = get_db_connection()
        matches = conn.execute('''
            SELECT * FROM matches 
            ORDER BY Season, Tour
        ''').fetchall()
        conn.close()
        
        matches_list = []
        for match in matches:
            matches_list.append({
                'Tour': match['Tour'],
                'Date': match['Date'] if 'Date' in match.keys() else '',
                'Season': match['Season'],
                'Opponent': match['Opponent'],
                'ArsenalScore': match['ArsenalScore'],
                'OpponentScore': match['OpponentScore'],
                'Stadium': match['Stadium'] if 'Stadium' in match.keys() else '',
                'Attendance': match['Attendance'] if 'Attendance' in match.keys() else 0,
                'win': match['win'] if 'win' in match.keys() else (1 if match['ArsenalScore'] > match['OpponentScore'] else 0)
            })
        
        return jsonify(matches_list)
    except Exception as e:
        print(f"Error in get_matches: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/matches/<season>')
def get_matches_by_season(season):
    """Get matches filtered by season"""
    try:
        conn = get_db_connection()
        
        if season != 'all':
            db_season = convert_season_format(season)
            print(f"Filtering by season: URL={season}, DB={db_season}")
            
            matches = conn.execute('''
                SELECT * FROM matches 
                WHERE Season = ? 
                ORDER BY Tour
            ''', (db_season,)).fetchall()
        else:
            matches = conn.execute('''
                SELECT * FROM matches 
                ORDER BY Season, Tour
            ''').fetchall()
        
        conn.close()
        
        matches_list = []
        for match in matches:
            matches_list.append({
                'Tour': match['Tour'],
                'Date': match['Date'] if 'Date' in match.keys() else '',
                'Season': match['Season'],
                'Opponent': match['Opponent'],
                'ArsenalScore': match['ArsenalScore'],
                'OpponentScore': match['OpponentScore'],
                'Stadium': match['Stadium'] if 'Stadium' in match.keys() else '',
                'Attendance': match['Attendance'] if 'Attendance' in match.keys() else 0,
                'win': match['win'] if 'win' in match.keys() else (1 if match['ArsenalScore'] > match['OpponentScore'] else 0)
            })
        
        print(f"Returning {len(matches_list)} matches for season {season}")
        return jsonify(matches_list)
        
    except Exception as e:
        print(f"Error in get_matches_by_season: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats/<season>')
def get_season_stats(season):
    """Get aggregated statistics for a season"""
    try:
        conn = get_db_connection()
        
        if season != 'all':
            db_season = convert_season_format(season)
            where_clause = 'WHERE Season = ?'
            params = (db_season,)
        else:
            where_clause = ''
            params = ()
        
        # Get wins, draws, losses
        query = f'''
            SELECT 
                SUM(CASE WHEN ArsenalScore > OpponentScore THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN ArsenalScore = OpponentScore THEN 1 ELSE 0 END) as draws,
                SUM(CASE WHEN ArsenalScore < OpponentScore THEN 1 ELSE 0 END) as losses,
                SUM(ArsenalScore) as goals_scored,
                SUM(OpponentScore) as goals_conceded,
                COUNT(*) as total_matches
            FROM matches
            {where_clause}
        '''
        
        stats = conn.execute(query, params).fetchone()
        
        # Calculate points (3 for win, 1 for draw)
        wins = stats['wins'] or 0
        draws = stats['draws'] or 0
        losses = stats['losses'] or 0
        points = (wins * 3) + draws
        
        # Get home vs away stats
        home_away_query = f'''
            SELECT 
                CASE 
                    WHEN Stadium LIKE '%Emirates%' OR Stadium LIKE '%Arsenal%' OR Stadium LIKE '%Highbury%' 
                    THEN 'Home'
                    ELSE 'Away'
                END as location,
                SUM(CASE WHEN ArsenalScore > OpponentScore THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN ArsenalScore = OpponentScore THEN 1 ELSE 0 END) as draws,
                SUM(CASE WHEN ArsenalScore < OpponentScore THEN 1 ELSE 0 END) as losses,
                SUM(ArsenalScore) as goals_for,
                SUM(OpponentScore) as goals_against
            FROM matches
            {where_clause}
            GROUP BY location
        '''
        
        home_away = conn.execute(home_away_query, params).fetchall()
        
        conn.close()
        
        home_away_data = []
        for ha in home_away:
            home_away_data.append({
                'location': ha['location'],
                'wins': ha['wins'] or 0,
                'draws': ha['draws'] or 0,
                'losses': ha['losses'] or 0,
                'goals_for': ha['goals_for'] or 0,
                'goals_against': ha['goals_against'] or 0
            })
        
        result = {
            'wins': wins,
            'draws': draws,
            'losses': losses,
            'points': points,
            'goals_scored': stats['goals_scored'] or 0,
            'goals_conceded': stats['goals_conceded'] or 0,
            'goal_difference': (stats['goals_scored'] or 0) - (stats['goals_conceded'] or 0),
            'total_matches': stats['total_matches'] or 0,
            'home_away': home_away_data
        }
        
        print(f"Stats for {season}: {result}")
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in get_season_stats: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/players')
def get_players():
    """Get player statistics"""
    try:
        conn = get_db_connection()
        
        # Check if players table exists
        cursor = conn.cursor()
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='players'
        """)
        
        if cursor.fetchone():
            # Get all columns to handle different formats
            cursor.execute("PRAGMA table_info(players)")
            columns_info = cursor.fetchall()
            column_names = [col[1] for col in columns_info]
            
            print(f"Players table columns: {column_names}")
            
            # Determine which column contains goals (support G, Goals, etc.)
            goals_col = None
            if 'Goals' in column_names:
                goals_col = 'Goals'
            elif 'goals' in column_names:
                goals_col = 'goals'
            elif 'GOALS' in column_names:
                goals_col = 'GOALS'
            elif 'G' in column_names:
                goals_col = 'G'
            elif 'g' in column_names:
                goals_col = 'g'

            # Determine name columns to aggregate by
            name_cols = None
            if 'FirstName' in column_names and 'LastName' in column_names:
                name_cols = ('FirstName', 'LastName')
            elif 'Firstname' in column_names and 'Lastname' in column_names:
                name_cols = ('Firstname', 'Lastname')
            elif 'Player' in column_names:
                name_cols = ('Player',)
            elif 'Name' in column_names:
                name_cols = ('Name',)

            # Read optional season filter from query string
            season_param = request.args.get('season')
            if season_param and season_param != 'all':
                db_season = convert_season_format(season_param)
            else:
                db_season = None

            if goals_col and name_cols:
                # Aggregate goals per player (optionally per season)
                # If Season column exists and a season query param is provided on frontend,
                # the JavaScript requests per-season players via `/api/players` (no season param currently),
                # so here we aggregate across all rows (all seasons). If needed, this can be extended.
                params = ()
                if len(name_cols) == 2:
                    fn, ln = name_cols
                    if db_season:
                        # Join with matches table on Date to filter by season
                        query = f"""
                            SELECT p.{fn} as FirstName, p.{ln} as LastName,
                                   SUM(COALESCE(p.{goals_col},0)) as Goals,
                                   COUNT(*) as Appearances
                            FROM players p
                            JOIN matches m ON p.Date = m.Date
                            WHERE m.Season = ?
                            GROUP BY p.{fn}, p.{ln}
                            ORDER BY Goals DESC
                            LIMIT 15
                        """
                        params = (db_season,)
                    else:
                        query = f"""
                            SELECT {fn} as FirstName, {ln} as LastName,
                                   SUM(COALESCE({goals_col},0)) as Goals,
                                   COUNT(*) as Appearances
                            FROM players
                            GROUP BY {fn}, {ln}
                            ORDER BY Goals DESC
                            LIMIT 15
                        """
                else:
                    (pn,) = name_cols
                    if db_season:
                        query = f"""
                            SELECT p.{pn} as Player,
                                   SUM(COALESCE(p.{goals_col},0)) as Goals,
                                   COUNT(*) as Appearances
                            FROM players p
                            JOIN matches m ON p.Date = m.Date
                            WHERE m.Season = ?
                            GROUP BY p.{pn}
                            ORDER BY Goals DESC
                            LIMIT 15
                        """
                        params = (db_season,)
                    else:
                        query = f"""
                            SELECT {pn} as Player,
                                   SUM(COALESCE({goals_col},0)) as Goals,
                                   COUNT(*) as Appearances
                            FROM players
                            GROUP BY {pn}
                            ORDER BY Goals DESC
                            LIMIT 15
                        """

                players = conn.execute(query, params).fetchall()

                players_list = []
                for p in players:
                    d = dict(p)
                    # Standardize keys for frontend
                    standardized = {}
                    if 'FirstName' in d and 'LastName' in d:
                        standardized['Firstname'] = d.get('FirstName')
                        standardized['Lastname'] = d.get('LastName')
                        standardized['Player'] = f"{d.get('FirstName') or ''} {d.get('LastName') or ''}".strip()
                    else:
                        standardized['Player'] = d.get('Player') or d.get('Name') or 'Unknown'

                    standardized['Goals'] = d.get('Goals') or 0
                    standardized['Appearances'] = d.get('Appearances') or 0
                    players_list.append(standardized)

                conn.close()
                print(f"Returning {len(players_list)} aggregated players")
                return jsonify(players_list)
            else:
                print("No suitable name+goals columns found in players table")
                conn.close()
                return jsonify([])
        else:
            print("Players table does not exist")
            conn.close()
            return jsonify([])
            
    except Exception as e:
        print(f"Error in get_players: {e}")
        import traceback
        traceback.print_exc()
        return jsonify([])

@app.route('/api/wins-by-season')
def get_wins_by_season():
    """Get wins count per season"""
    try:
        conn = get_db_connection()
        
        query = '''
            SELECT 
                Season,
                SUM(CASE WHEN ArsenalScore > OpponentScore THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN ArsenalScore = OpponentScore THEN 1 ELSE 0 END) as draws,
                SUM(CASE WHEN ArsenalScore < OpponentScore THEN 1 ELSE 0 END) as losses,
                COUNT(*) as total_matches,
                SUM(ArsenalScore) as goals_for,
                SUM(OpponentScore) as goals_against
            FROM matches
            GROUP BY Season
            ORDER BY Season
        '''
        
        results = conn.execute(query).fetchall()
        conn.close()
        
        data = []
        for row in results:
            wins = row['wins'] or 0
            draws = row['draws'] or 0
            total = row['total_matches'] or 1  # Avoid division by zero
            
            data.append({
                'season': row['Season'],
                'wins': wins,
                'draws': draws,
                'losses': row['losses'] or 0,
                'total_matches': total,
                'win_rate': round((wins / total) * 100, 1) if total > 0 else 0,
                'points': (wins * 3) + draws,
                'goals_for': row['goals_for'] or 0,
                'goals_against': row['goals_against'] or 0
            })
        
        print(f"Wins by season: {data}")
        return jsonify(data)
        
    except Exception as e:
        print(f"Error in get_wins_by_season: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("=" * 60)
    print("ARSENAL FC DASHBOARD - Starting Server")
    print("=" * 60)
    print("\nTesting database connection...")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM matches")
        count = cursor.fetchone()['count']
        print(f"✓ Database connected: {count} matches found")
        
        cursor.execute("SELECT DISTINCT Season FROM matches ORDER BY Season")
        seasons = [row['Season'] for row in cursor.fetchall()]
        print(f"✓ Seasons available: {', '.join(seasons)}")
        
        conn.close()
        print("\n" + "=" * 60)
        print("Server starting on http://localhost:5000")
        print("=" * 60 + "\n")
        
    except Exception as e:
        print(f"✗ Database error: {e}")
        print("\nPlease run the database setup script first!")
        print("=" * 60 + "\n")
    
    app.run(debug=True, port=5000)