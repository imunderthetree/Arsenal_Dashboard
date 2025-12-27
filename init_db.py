import sqlite3
import pandas as pd
import os

def create_database(db_name='arsenal.db'):
    """Create SQLite database and return connection"""
    conn = sqlite3.connect(db_name)
    print(f"Database '{db_name}' created/connected successfully")
    return conn

def load_matches_to_db(csv_path, conn):
    """Load matches CSV into database"""
    try:
        # Read the CSV file
        matches_df = pd.read_csv(csv_path)
        print(f"Loaded {len(matches_df)} matches from CSV")
        
        # Create a 'win' column
        matches_df['win'] = (matches_df['ArsenalScore'] > matches_df['OpponentScore']).astype(int)
        
        # Write to database
        matches_df.to_sql('matches', conn, if_exists='replace', index=False)
        print("Matches data loaded into 'matches' table")
        
        return matches_df
    except Exception as e:
        print(f"Error loading matches: {e}")
        return None

def load_players_to_db(csv_path, conn):
    """Load players CSV into database"""
    try:
        # Read the CSV file
        players_df = pd.read_csv(csv_path)
        print(f"Loaded {len(players_df)} players from CSV")
        
        # Display structure
        print("\nPlayers CSV columns:")
        print(players_df.columns.tolist())
        
        # Clean column names (remove spaces, standardize)
        players_df.columns = players_df.columns.str.strip()
        
        # Display sample
        print("\nSample player data:")
        print(players_df.head(3))
        
        # Write to database
        players_df.to_sql('players', conn, if_exists='replace', index=False)
        print("Players data loaded into 'players' table")
        
        # Show summary
        print(f"\nPlayers table summary:")
        if 'Goals' in players_df.columns:
            print(f"  - Top scorer: {players_df.nlargest(1, 'Goals').iloc[0]['Player']} ({players_df['Goals'].max()} goals)")
        print(f"  - Total players: {len(players_df)}")
        
        return players_df
    except Exception as e:
        print(f"Error loading players: {e}")
        import traceback
        traceback.print_exc()
        return None

def create_merged_view(conn):
    """Create a view that merges matches with players data"""
    try:
        cursor = conn.cursor()
        
        # This assumes players table has columns that can be joined with matches
        # Adjust the JOIN condition based on your actual column names
        cursor.execute("""
            CREATE VIEW IF NOT EXISTS matches_with_players AS
            SELECT 
                m.*,
                p.*
            FROM matches m
            LEFT JOIN players p ON m.Season = p.Season
        """)
        
        conn.commit()
        print("Created merged view 'matches_with_players'")
    except Exception as e:
        print(f"Error creating merged view: {e}")

def verify_database(conn):
    """Print database structure and sample data"""
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print("\n=== Database Tables ===")
    for table in tables:
        print(f"  - {table[0]}")
        
        # Get row count
        cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
        count = cursor.fetchone()[0]
        print(f"    Rows: {count}")
        
        # Get column info
        cursor.execute(f"PRAGMA table_info({table[0]})")
        columns = cursor.fetchall()
        print(f"    Columns: {', '.join([col[1] for col in columns])}")
        print()

def main():
    # Define your CSV file paths
    matches_csv = "matches.csv"  # Update this path
    players_csv = "players.csv"  # Update this path
    
    print("=" * 60)
    print("ARSENAL DATABASE SETUP")
    print("=" * 60)
    
    # Create database connection
    conn = create_database('arsenal.db')
    
    # Load matches data
    print("\n[1/2] Loading Matches Data...")
    if os.path.exists(matches_csv):
        matches_df = load_matches_to_db(matches_csv, conn)
        if matches_df is not None:
            print("✓ Matches loaded successfully")
    else:
        print(f"✗ Warning: {matches_csv} not found")
        print(f"  Please place matches.csv in the current directory")
    
    # Load players data
    print("\n[2/2] Loading Players Data...")
    if os.path.exists(players_csv):
        players_df = load_players_to_db(players_csv, conn)
        if players_df is not None:
            print("✓ Players loaded successfully")
            
            # Create merged view if both tables exist
            print("\n[3/3] Creating Merged View...")
            create_merged_view(conn)
    else:
        print(f"✗ Warning: {players_csv} not found")
        print(f"  Please place players.csv in the current directory")
        print(f"  Dashboard will work without player data")
    
    # Verify what was created
    print("\n" + "=" * 60)
    print("DATABASE VERIFICATION")
    print("=" * 60)
    verify_database(conn)
    
    # Close connection
    conn.close()
    
    print("\n" + "=" * 60)
    print("DATABASE SETUP COMPLETE!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Run your Flask app: python app.py")
    print("2. Open http://localhost:5000 in your browser")
    print("3. Enjoy your Arsenal dashboard! ⚽")

if __name__ == "__main__":
    main()