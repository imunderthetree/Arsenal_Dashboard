# ⚽ Arsenal FC Dashboard

A data-driven web dashboard for exploring Arsenal FC match statistics across multiple seasons (2017–2023). Built with Flask, SQLite, and amCharts 5.

---

## Features

- **Season filtering** — Switch between individual seasons or view all seasons at once
- **KPI cards** — Live Win Rate, Total Points, Goal Difference, Top Scorer, and Longest Win Streak
- **Result Share pie chart** — Win / Draw / Loss breakdown with color-coded slices
- **Top Players bar chart** — Top 10 scorers filtered by selected season
- **Goals per Match line chart** — Average goals per season, or per-match when a specific season is selected
- **Salaries & Contracts bar chart** — Hardcoded player salary data per season
- **Attendance trend chart** — Stadium attendance across all tour rounds
- **Season Win/Loss Timeline** — Scatter plot of match outcomes across tours, grouped by season

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python / Flask |
| Database | SQLite |
| Data Loading | Pandas |
| Frontend | HTML / CSS / Vanilla JS |
| Charts | amCharts 5 |
| Fonts | Google Fonts (Bebas Neue, Archivo) |
| Server | Gunicorn |

---

## Project Structure

```
arsenal-dashboard/
├── app.py              # Flask application & API routes
├── init_db.py          # Database setup script (CSV → SQLite)
├── requirements.txt    # Python dependencies
├── arsenal.db          # SQLite database (auto-generated)
├── matches.csv         # Match data (required)
├── players.csv         # Player data (optional)
├── static/
│   ├── js/
│   │   └── dashboard.js    # All chart logic & API calls
│   └── imges/
│       └── Arsenal_FC.png  # Club logo
└── templates/
    └── index.html      # Main dashboard template
```

---

## Getting Started

### Prerequisites

- Python 3.8+
- pip

### Installation

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd arsenal-dashboard
```

2. **Install dependencies**

```bash
pip install -r requirements.txt
pip install pandas  # needed for init_db.py
```

3. **Add your data files**

Place your CSV files in the project root:
- `matches.csv` — Required. Must contain columns: `Tour`, `Date`, `Season`, `Opponent`, `ArsenalScore`, `OpponentScore`, `Stadium`, `Attendance`
- `players.csv` — Optional. Expected columns include player name fields and a goals column (`Goals` or `G`)

4. **Initialize the database**

```bash
python init_db.py
```

5. **Run the app**

```bash
python app.py
```

6. **Open in browser**

```
http://localhost:5000
```

---

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/matches` | All matches |
| `GET /api/matches/<season>` | Matches filtered by season (e.g. `2022-2023`) |
| `GET /api/stats/<season>` | Aggregated stats for a season |
| `GET /api/players?season=<season>` | Top scorers, optionally filtered by season |
| `GET /api/wins-by-season` | Wins, losses, goals aggregated per season |
| `GET /api/test` | Database connectivity check |

**Season format in URLs:** `2022-2023` (maps to `2022/23` in the database)

---

## Data Format

### matches.csv

```
Tour,Date,Season,Opponent,ArsenalScore,OpponentScore,Stadium,Attendance
1,2022-08-05,2022/23,Crystal Palace,2,0,Emirates Stadium,60000
```

### players.csv

Flexible column support. The app auto-detects name columns (`FirstName`/`LastName`, `Player`, or `Name`) and goals columns (`Goals` or `G`).

```
FirstName,LastName,Goals,Date
Bukayo,Saka,14,2022-08-05
```

---

## Deployment (Docker)

A `.dockerignore` file is included. To containerize:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]
```

The app reads `DATABASE_PATH` and `PORT` from environment variables:

```bash
export DATABASE_PATH=/data/arsenal.db
export PORT=8080
```

---

## Configuration

| Environment Variable | Default | Description |
|---|---|---|
| `DATABASE_PATH` | `arsenal.db` | Path to the SQLite database file |
| `PORT` | `5000` | Server port |

---

## Credits

Made by **Yusuf & Rawan**
