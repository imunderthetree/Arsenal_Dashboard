// Arsenal FC Dashboard - amCharts Implementation
// ================================================

// Global variables
let currentSeason = 'all';
let matchesChart, seasonsChart;
let playersChart;
let winsChart, attendanceChart, opponentsChart, scoresChart, resultPieChart;
let playersBarChart, goalsPerMatchChart;

// Arsenal Brand Colors
const ARSENAL_COLORS = {
    // core palette
    win: '#00B74A',   // green
    draw: '#FFA500',  // orange
    loss: '#EF0107',  // red
    darkBlue: '#023474',
    gold: '#9C824A',
    white: '#FFFFFF',
    red: '#EF0107'
};

// debug: confirm the color map is set when the file loads
console.log('ARSENAL_COLORS set:', ARSENAL_COLORS);

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Arsenal Dashboard initializing...');
    console.log('Color map on load:', ARSENAL_COLORS);
    
    // Set up season dropdown listener
    const seasonSelect = document.getElementById('seasonSelect');
    seasonSelect.addEventListener('change', function() {
        currentSeason = this.value;
        loadAllData();
    });

    // Prediction UI removed; no predictor handler
    
    // Load initial data
    loadAllData();
});

// Main data loading function
async function loadAllData() {
    console.log(`Loading data for season: ${currentSeason}`);
    
    try {

        // Load matches, stats, players and wins-by-season in parallel
        const [matches, stats, players, winsBySeason] = await Promise.all([
            fetch(`/api/matches/${currentSeason}`).then(r => r.json()),
            fetch(`/api/stats/${currentSeason}`).then(r => r.json()),
            fetch(`/api/players?season=${currentSeason}`).then(r => r.json()).catch(() => []),
            fetch('/api/wins-by-season').then(r => r.json()).catch(() => [])
        ]);

        // Update KPIs (pass players so top scorer name can be shown)
        updateKPIs(stats, matches, players);

        // Create the season timeline plus the requested charts
        // (season chart was removed earlier per request; re-enable it now)
        createSeasonComparisonChart(matches);
        createResultPieChart(matches);
        createAttendanceLineChart(matches);

        // New charts
        createPlayersBarChart(players);
        createGoalsPerMatchChart(matches, winsBySeason);

    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Update KPI Cards - FIXED VERSION
function updateKPIs(stats, matches, players = []) {
    // KPI 1: Win Rate (percentage of matches won)
    const totalMatches = stats.total_matches || 1;
    const winRate = totalMatches > 0 ? Math.round((stats.wins / totalMatches) * 100) : 0;
    document.getElementById('kpi-winrate').textContent = winRate + '%';
    
    // KPI 2: Current selection's total points
    document.getElementById('kpi-points').textContent = stats.points;
    
    // KPI 3: Goal Difference
    const goalDiff = stats.goal_difference;
    const goalDiffText = goalDiff > 0 ? '+' + goalDiff : goalDiff;
    document.getElementById('kpi-goaldiff').textContent = goalDiffText;
    
    // KPI 4: Top scorer - prefer name, goals as subtitle
    const scorerValueEl = document.getElementById('kpi-scorer');
    const scorerLabelEl = document.getElementById('kpi-scorer-label');

    // Reset any inline sizing
    scorerValueEl.style.fontSize = '';
    scorerLabelEl.style.fontSize = '';

    if (players && players.length > 0) {
        const topScorer = players[0];

        // Attempt to build player's full name from common columns
        let playerName = '';
        if (topScorer.Firstname || topScorer.FirstName || topScorer.firstname) {
            const fn = topScorer.Firstname || topScorer.FirstName || topScorer.firstname || '';
            const ln = topScorer.Lastname || topScorer.LastName || topScorer.lastname || '';
            playerName = [fn, ln].filter(Boolean).join(' ').trim();
        }

        // Fallbacks: several possible name fields
        if (!playerName) {
            playerName = topScorer.Player || topScorer.player || topScorer.Name || topScorer.name || topScorer.FullName || topScorer.fullname || '';
        }

        // As a last resort, pick any property that looks like a name
        if (!playerName) {
            for (const k in topScorer) {
                if (/name/i.test(k) && topScorer[k]) { playerName = topScorer[k]; break; }
            }
        }

        // Determine goals value from possible columns (G, Goals, g)
        const goals = topScorer.G || topScorer.Goals || topScorer.goals || topScorer.g || 0;

        if (!playerName) playerName = 'Unknown';

        // Shorten display if it's too long
        let displayName = String(playerName);
        if (displayName.length > 20) displayName = displayName.split(' ').slice(0,2).join(' ');

        scorerValueEl.textContent = displayName;
        scorerValueEl.style.fontSize = '1.5rem';
        scorerLabelEl.textContent = `${goals || 0} Goals`;
        scorerLabelEl.style.fontSize = '0.95rem';
    } else {
        // No players available: show placeholder title and put goals as subtitle
        scorerValueEl.textContent = 'Top Scorer';
        scorerValueEl.style.fontSize = '1.25rem';
        scorerLabelEl.textContent = `${stats.goals_scored || 0} Goals`;
        scorerLabelEl.style.fontSize = '0.95rem';
    }
}

// ================================================
// CHART: Wins by Season (Bar Chart)
// ================================================
function createWinsBySeasonChart(data) {
    if (winsChart) winsChart.dispose();

    const root = am5.Root.new("chartdiv_wins");
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            panX: false,
            panY: false,
            layout: root.verticalLayout
        })
    );

    const xAxis = chart.xAxes.push(
        am5xy.CategoryAxis.new(root, {
            categoryField: "season",
            renderer: am5xy.AxisRendererX.new(root, {
                minGridDistance: 30
            })
        })
    );

    const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererY.new(root, {})
        })
    );

    const series = chart.series.push(
        am5xy.ColumnSeries.new(root, {
            name: "Wins",
            xAxis: xAxis,
            yAxis: yAxis,
            valueYField: "wins",
            categoryXField: "season",
            tooltip: am5.Tooltip.new(root, { labelText: "{season}: {wins} wins" })
        })
    );

    series.columns.template.setAll({ strokeOpacity: 0, cornerRadiusTL: 6, cornerRadiusTR: 6, fillOpacity: 0.95 });
    series.columns.template.adapters.add("fill", function(fill, target) {
        const wins = target.dataItem.dataContext.wins;
        if (wins >= 22) return am5.color(ARSENAL_COLORS.win);
        if (wins >= 18) return am5.color(ARSENAL_COLORS.gold);
        return am5.color(ARSENAL_COLORS.red);
    });

    series.data.setAll(data.map(d => ({ season: d.season, wins: d.wins })));

    series.appear(800);
    chart.appear(800, 100);

    winsChart = root;
}

// Attendance chart (simple buckets)
function createAttendanceChart(matches) {
    if (attendanceChart) attendanceChart.dispose();
    const root = am5.Root.new("chartdiv_attendance");
    root.setThemes([am5themes_Animated.new(root)]);

    const buckets = { Low: 0, Medium: 0, High: 0 };
    matches.forEach(m => {
        const a = Number(m.Attendance) || 0;
        if (a < 30000) buckets.Low++;
        else if (a < 50000) buckets.Medium++;
        else buckets.High++;
    });

    const chart = root.container.children.push(am5xy.XYChart.new(root, {}));
    const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'bucket', renderer: am5xy.AxisRendererX.new(root, {}) }));
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: am5xy.AxisRendererY.new(root, {}) }));

    const series = chart.series.push(am5xy.ColumnSeries.new(root, { valueYField: 'count', categoryXField: 'bucket' }));
    series.columns.template.setAll({ fill: am5.color(ARSENAL_COLORS.darkBlue), strokeOpacity: 0 });
    const data = Object.keys(buckets).map(k => ({ bucket: k, count: buckets[k] }));
    xAxis.data.setAll(data);
    series.data.setAll(data);

    chart.appear(600, 100);
    attendanceChart = root;
}

// Opponents chart (top opponents by match count)
function createOpponentsChart(matches) {
    if (opponentsChart) opponentsChart.dispose();
    const root = am5.Root.new("chartdiv_opponents");
    root.setThemes([am5themes_Animated.new(root)]);

    const counts = {};
    matches.forEach(m => { const o = m.Opponent || 'Unknown'; counts[o] = (counts[o] || 0) + 1; });
    const arr = Object.keys(counts).map(k => ({ opponent: k, matches: counts[k] }));
    arr.sort((a,b) => b.matches - a.matches);
    const top = arr.slice(0, 10);

    const chart = root.container.children.push(am5xy.XYChart.new(root, {}));
    const yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'opponent', renderer: am5xy.AxisRendererY.new(root, {}) }));
    const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { renderer: am5xy.AxisRendererX.new(root, {}) }));

    const series = chart.series.push(am5xy.ColumnSeries.new(root, { valueXField: 'matches', categoryYField: 'opponent', xAxis: xAxis, yAxis: yAxis }));
    series.columns.template.setAll({ fill: am5.color(ARSENAL_COLORS.gold), strokeOpacity: 0 });

    yAxis.data.setAll(top.map(t => ({ opponent: t.opponent })));
    series.data.setAll(top);

    chart.appear(600, 100);
    opponentsChart = root;
}

// Score distribution (common scorelines)
function createScoreDistributionChart(matches) {
    if (scoresChart) scoresChart.dispose();
    const root = am5.Root.new("chartdiv_scores");
    root.setThemes([am5themes_Animated.new(root)]);

    const counts = {};
    matches.forEach(m => { const s = `${m.ArsenalScore}-${m.OpponentScore}`; counts[s] = (counts[s] || 0) + 1; });
    const arr = Object.keys(counts).map(k => ({ score: k, count: counts[k] }));
    arr.sort((a,b) => b.count - a.count);
    const top = arr.slice(0, 10);

    const chart = root.container.children.push(am5xy.XYChart.new(root, {}));
    const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'score', renderer: am5xy.AxisRendererX.new(root, {}) }));
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: am5xy.AxisRendererY.new(root, {}) }));

    const series = chart.series.push(am5xy.ColumnSeries.new(root, { valueYField: 'count', categoryXField: 'score' }));
    series.columns.template.setAll({ fill: am5.color(ARSENAL_COLORS.red), strokeOpacity: 0 });

    xAxis.data.setAll(top.map(t => ({ score: t.score })));
    series.data.setAll(top);

    chart.appear(600, 100);
    scoresChart = root;
}

// Result pie chart (Win/Draw/Loss)
function createResultPieChart(matches) {
    if (resultPieChart) resultPieChart.dispose();
    const root = am5.Root.new("chartdiv_result_pie");
    root.setThemes([am5themes_Animated.new(root)]);

    const counts = { Win: 0, Draw: 0, Loss: 0 };
    matches.forEach(m => {
        const isWin = m.ArsenalScore > m.OpponentScore;
        const isDraw = m.ArsenalScore === m.OpponentScore;
        if (isWin) counts.Win++;
        else if (isDraw) counts.Draw++;
        else counts.Loss++;
    });

    const chart = root.container.children.push(am5percent.PieChart.new(root, {}));
    const series = chart.series.push(am5percent.PieSeries.new(root, { valueField: 'count', categoryField: 'result' }));
    const data = [
        { result: 'Win', count: counts.Win, fill: am5.color(ARSENAL_COLORS.win) },
        { result: 'Draw', count: counts.Draw, fill: am5.color(ARSENAL_COLORS.draw) },
        { result: 'Loss', count: counts.Loss, fill: am5.color(ARSENAL_COLORS.loss) }
    ];
    series.data.setAll(data);
    // Debug: log pie data and colors
    try {
        console.log('Result pie data:', data, 'Color map:', ARSENAL_COLORS);
    } catch (e) {}
    // Force the chart's color set to match our explicit ordering (Win, Draw, Loss)
    const colorList = [am5.color(ARSENAL_COLORS.win), am5.color(ARSENAL_COLORS.draw), am5.color(ARSENAL_COLORS.loss)];
    try {
        chart.get('colors').set('colors', colorList);
        series.get('colors').set('colors', colorList);
    } catch (e) {
        // fallback: try setting on root
        try { root.set('colors', am5.ColorSet.new(root, { colors: colorList })); } catch (e2) {}
    }
    series.slices.template.setAll({ stroke: am5.color(0xffffff), strokeWidth: 2 });
    // Ensure slice fill follows our explicit result color mapping
    series.slices.template.adapters.add("fill", function(fill, target) {
        const dataItem = target.dataItem;
        if (dataItem && dataItem.dataContext) {
            const r = dataItem.dataContext.result;
            if (r === 'Win') return am5.color(ARSENAL_COLORS.win);
            if (r === 'Draw') return am5.color(ARSENAL_COLORS.draw);
            return am5.color(ARSENAL_COLORS.loss);
        }
        return fill;
    });

    chart.appear(600, 100);
    resultPieChart = root;
    // Force-set slice fills after render to work around any color-set issues
    setTimeout(() => {
        try {
            series.slices.each(function(slice) {
                const di = slice.dataItem;
                if (di && di.dataContext) {
                    const r = di.dataContext.result;
                    let color = ARSENAL_COLORS.loss;
                    if (r === 'Win') color = ARSENAL_COLORS.win;
                    else if (r === 'Draw') color = ARSENAL_COLORS.draw;
                    slice.set('fill', am5.color(color));
                    slice.set('stroke', am5.color('#ffffff'));
                }
                try { console.log('Slice fill after force-set:', slice.get('fill')); } catch (e) {}
            });
        } catch (e) { console.error('Error forcing pie slice fills', e); }
    }, 50);
}

// Attendance line chart (attendance over tours/dates)
function createAttendanceLineChart(matches) {
    if (attendanceChart) attendanceChart.dispose();
    const root = am5.Root.new("chartdiv_attendance_line");
    root.setThemes([am5themes_Animated.new(root)]);

    // Prepare data: use Tour (or index) as x, Attendance as y
    const data = matches.map(m => ({ tour: Number(m.Tour) || 0, date: m.Date, attendance: Number(m.Attendance) || 0 }));
    data.sort((a,b) => a.tour - b.tour);

    const chart = root.container.children.push(am5xy.XYChart.new(root, {
        panX: true,
        panY: false,
        wheelX: 'panX'
    }));

    const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'tour', renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 30 }) }));
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: am5xy.AxisRendererY.new(root, {}) }));

    xAxis.data.setAll(data.map(d => ({ tour: d.tour })));

    const series = chart.series.push(am5xy.LineSeries.new(root, {
        name: 'Attendance',
        categoryXField: 'tour',
        valueYField: 'attendance',
        xAxis: xAxis,
        yAxis: yAxis,
        tooltip: am5.Tooltip.new(root, { labelText: 'Tour {categoryX}: {valueY}' })
    }));

    series.data.setAll(data);
    series.strokes.template.setAll({ stroke: am5.color(ARSENAL_COLORS.darkBlue), strokeWidth: 2 });
    series.bullets.push(function() {
        return am5.Bullet.new(root, { sprite: am5.Circle.new(root, { radius: 4, fill: am5.color(ARSENAL_COLORS.darkBlue) }) });
    });

    chart.appear(800, 100);
    attendanceChart = root;
}

// ================================================
// CHART 2: Home vs Away Performance (Clustered Bar)
// ================================================
function createHomeAwayChart(homeAwayData) {
    // This will be rendered in chartdiv_players
    if (playersChart) {
        playersChart.dispose();
    }
    
    const root = am5.Root.new("chartdiv_players");
    root.setThemes([am5themes_Animated.new(root)]);
    
    const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            panX: false,
            panY: false,
            layout: root.verticalLayout
        })
    );
    
    // Prepare data
    const chartData = [];
    homeAwayData.forEach(item => {
        chartData.push({
            location: item.location,
            wins: item.wins,
            draws: item.draws,
            losses: item.losses
        });
    });
    
    // Create X-axis
    const xAxis = chart.xAxes.push(
        am5xy.CategoryAxis.new(root, {
            categoryField: "location",
            renderer: am5xy.AxisRendererX.new(root, {
                cellStartLocation: 0.1,
                cellEndLocation: 0.9
            })
        })
    );
    xAxis.data.setAll(chartData);
    
    // Create Y-axis
    const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererY.new(root, {})
        })
    );
    
    // Function to create series
    function createSeries(name, field, color) {
        const series = chart.series.push(
            am5xy.ColumnSeries.new(root, {
                name: name,
                xAxis: xAxis,
                yAxis: yAxis,
                valueYField: field,
                categoryXField: "location",
                tooltip: am5.Tooltip.new(root, {
                    labelText: "{name}: {valueY}"
                })
            })
        );
        
        series.columns.template.setAll({
            strokeOpacity: 0,
            cornerRadiusTL: 5,
            cornerRadiusTR: 5,
            fill: am5.color(color)
        });
        
        series.data.setAll(chartData);
        series.appear();
        
        return series;
    }
    
    // Create series for each result type
    createSeries("Wins", "wins", ARSENAL_COLORS.win);
    createSeries("Draws", "draws", ARSENAL_COLORS.draw);
    createSeries("Losses", "losses", ARSENAL_COLORS.loss);
    
    // Add legend
    const legend = chart.children.push(
        am5.Legend.new(root, {
            centerX: am5.percent(50),
            x: am5.percent(50)
        })
    );
    legend.data.setAll(chart.series.values);
    
    chart.appear(1000, 100);
    playersChart = root;
}

// ================================================
// CHART 3: Players Chart (Top Scorers)
// ================================================
function createPlayersChart(players) {
    // Replace the home/away chart with players chart
    if (playersChart) {
        playersChart.dispose();
    }
    
    const root = am5.Root.new("chartdiv_players");
    root.setThemes([am5themes_Animated.new(root)]);
    
    const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            panX: false,
            panY: false,
            layout: root.verticalLayout
        })
    );
    
    // Prepare data - take top 10 scorers
    const chartData = players.slice(0, 10).map(player => {
        // Handle multiple possible property names
        const playerName = player.Player || player.player || player.PLAYER || player.Name || player.name || 'Unknown';
        const goals = player.Goals || player.goals || player.GOALS || 0;
        const season = player.Season || player.season || player.SEASON || 'N/A';
        const appearances = player.Appearances || player.appearances || player.APPEARANCES || 0;
        
        return {
            player: playerName,
            goals: goals,
            season: season,
            appearances: appearances
        };
    });
    
    // Sort by goals descending
    chartData.sort((a, b) => b.goals - a.goals);
    
    console.log('Players Chart Data:', chartData);
    
    // Create Y-axis (categories)
    const yAxis = chart.yAxes.push(
        am5xy.CategoryAxis.new(root, {
            categoryField: "player",
            renderer: am5xy.AxisRendererY.new(root, {
                minGridDistance: 10,
                cellStartLocation: 0.1,
                cellEndLocation: 0.9
            })
        })
    );
    yAxis.data.setAll(chartData);
    
    // Create X-axis (values)
    const xAxis = chart.xAxes.push(
        am5xy.ValueAxis.new(root, {
            min: 0,
            renderer: am5xy.AxisRendererX.new(root, {})
        })
    );
    
    // Add series
    const series = chart.series.push(
        am5xy.ColumnSeries.new(root, {
            name: "Goals",
            xAxis: xAxis,
            yAxis: yAxis,
            valueXField: "goals",
            categoryYField: "player",
            tooltip: am5.Tooltip.new(root, {
                labelText: "{player}: {goals} goals\nSeason: {season}\nAppearances: {appearances}"
            })
        })
    );
    
    series.columns.template.setAll({
        strokeOpacity: 0,
        cornerRadiusTR: 5,
        cornerRadiusBR: 5,
        height: am5.percent(70),
        fill: am5.color(ARSENAL_COLORS.gold)
    });
    
    // Color gradient based on goals
    series.columns.template.adapters.add("fill", function(fill, target) {
        const goals = target.dataItem.dataContext.goals;
        if (goals >= 20) return am5.color(ARSENAL_COLORS.red);
        if (goals >= 15) return am5.color(ARSENAL_COLORS.gold);
        return am5.color(ARSENAL_COLORS.darkBlue);
    });
    
    series.data.setAll(chartData);
    
    // Add value labels
    series.bullets.push(function() {
        return am5.Bullet.new(root, {
            locationX: 1,
            locationY: 0.5,
            sprite: am5.Label.new(root, {
                centerY: am5.p50,
                text: "{valueX}",
                fill: am5.color(0xffffff),
                populateText: true,
                paddingRight: 10
            })
        });
    });
    
    series.appear(1000);
    chart.appear(1000, 100);
    
    playersChart = root;
    
    console.log('Players chart created with', chartData.length, 'players');
}

// New: Players Bar Chart (Top scorers)
function createPlayersBarChart(players) {
    if (playersBarChart) playersBarChart.dispose();
    const root = am5.Root.new('chartdiv_players_bar');
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            panX: false,
            panY: false
        })
    );

    // Prepare data: players expected to have 'Player' and 'Goals'
    const data = (players || []).slice(0, 10).map(p => ({ player: p.Player || p.player || p.Player || 'Unknown', goals: Number(p.Goals || p.G || 0) }));
    data.sort((a,b) => b.goals - a.goals);

    const yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'player', renderer: am5xy.AxisRendererY.new(root, {}) }));
    const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { renderer: am5xy.AxisRendererX.new(root, {}) }));

    yAxis.data.setAll(data);

    // Ensure labels are visible: allow wrapping, increase left padding and spacing
    const yRenderer = yAxis.get('renderer');
    yRenderer.labels.template.setAll({ fontSize: 12, paddingLeft: 8 });
    yRenderer.minGridDistance = 18;
    chart.set('paddingLeft', 140);

    const series = chart.series.push(am5xy.ColumnSeries.new(root, {
        name: 'Goals',
        xAxis: xAxis,
        yAxis: yAxis,
        valueXField: 'goals',
        categoryYField: 'player',
        tooltip: am5.Tooltip.new(root, { labelText: '{player}: {goals} goals' })
    }));

    series.columns.template.setAll({ strokeOpacity: 0, cornerRadiusTR: 6, cornerRadiusBR: 6, fill: am5.color(ARSENAL_COLORS.gold), height: am5.percent(60) });
    series.data.setAll(data);

    // value labels
    series.bullets.push(function(){
        return am5.Bullet.new(root, { sprite: am5.Label.new(root, { text: '{valueX}', populateText: true, centerY: am5.p50, paddingLeft: 8 }) });
    });

    chart.appear(800,100);
    playersBarChart = root;
}

// New: Goals per Match chart
function createGoalsPerMatchChart(matches, winsBySeason) {
    if (goalsPerMatchChart) goalsPerMatchChart.dispose();
    const root = am5.Root.new('chartdiv_goals_per_match');
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: true, panY: false }));

    if (currentSeason === 'all') {
        // Use winsBySeason data (season, goals_for, total_matches)
        const data = (winsBySeason || []).map(d => ({ season: d.season, gpm: d.total_matches ? (d.goals_for / d.total_matches) : 0 }));
        // sort by season (assumes season strings sort chronologically)
        data.sort((a,b) => a.season.localeCompare(b.season));

        const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'season', renderer: am5xy.AxisRendererX.new(root, {}) }));
        const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: am5xy.AxisRendererY.new(root, {}) }));

        xAxis.data.setAll(data.map(d => ({ season: d.season })));

        const series = chart.series.push(am5xy.LineSeries.new(root, { name: 'Goals per match', categoryXField: 'season', valueYField: 'gpm', xAxis: xAxis, yAxis: yAxis, tooltip: am5.Tooltip.new(root, { labelText: '{season}: {valueY.formatNumber("#.00")}' }) }));
        series.strokes.template.setAll({ stroke: am5.color(ARSENAL_COLORS.darkBlue), strokeWidth: 2 });
        series.data.setAll(data);

    } else {
        // Show per-match goals for selected season (matches is already filtered)
        const data = (matches || []).map(m => ({ tour: Number(m.Tour) || 0, date: m.Date, goals: Number(m.ArsenalScore) || 0 }));
        data.sort((a,b) => a.tour - b.tour);

        const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'tour', renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 30 }) }));
        const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: am5xy.AxisRendererY.new(root, {}) }));

        xAxis.data.setAll(data.map(d => ({ tour: d.tour })));

        const series = chart.series.push(am5xy.LineSeries.new(root, { name: 'Goals', categoryXField: 'tour', valueYField: 'goals', xAxis: xAxis, yAxis: yAxis, tooltip: am5.Tooltip.new(root, { labelText: 'Tour {categoryX}: {valueY}' }) }));
        series.strokes.template.setAll({ stroke: am5.color(ARSENAL_COLORS.red), strokeWidth: 2 });
        series.data.setAll(data);
    }

    chart.appear(800,100);
    goalsPerMatchChart = root;
}

// ================================================
// CHART 4: Season Comparison (NEW - from notebook)
// This is the scatter plot showing wins/losses across tours for all seasons
// ================================================
function createSeasonComparisonChart(matches) {
    // Dispose existing chart
    if (seasonsChart) {
        seasonsChart.dispose();
    }
    
    // Create root
    const root = am5.Root.new("chartdiv_seasons");
    root.setThemes([am5themes_Animated.new(root)]);
    
    // Create chart
    const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            panX: true,
            panY: true,
            wheelX: "panX",
            wheelY: "zoomX",
            pinchZoomX: true,
            paddingLeft: 10,
            paddingRight: 20
        })
    );
    
    // Add cursor
    const cursor = chart.set("cursor", am5xy.XYCursor.new(root, {
        behavior: "none"
    }));
    cursor.lineY.set("visible", false);
    
    // Group matches by season
    const seasonGroups = {};
    matches.forEach(match => {
        if (!seasonGroups[match.Season]) {
            seasonGroups[match.Season] = [];
        }
        
        const isWin = match.ArsenalScore > match.OpponentScore;
        const isDraw = match.ArsenalScore === match.OpponentScore;
        const isLoss = match.ArsenalScore < match.OpponentScore;
        
        seasonGroups[match.Season].push({
            tour: match.Tour,
            season: match.Season,
            win: isWin ? 1 : 0,
            result: isWin ? 'Win' : (isDraw ? 'Draw' : 'Loss'),
            opponent: match.Opponent,
            score: `${match.ArsenalScore}-${match.OpponentScore}`,
            arsenalScore: match.ArsenalScore,
            opponentScore: match.OpponentScore
        });
    });
    
    // Create X-axis (Tour number)
    const xAxis = chart.xAxes.push(
        am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererX.new(root, {
                minGridDistance: 50
            }),
            min: 0,
            max: 40,
            strictMinMax: true,
            tooltip: am5.Tooltip.new(root, {})
        })
    );
    xAxis.get("renderer").labels.template.setAll({
        fontSize: 11
    });
    
    // Create Y-axis (Season - categorical)
    const seasons = Object.keys(seasonGroups).sort();
    const yAxis = chart.yAxes.push(
        am5xy.CategoryAxis.new(root, {
            categoryField: "season",
            renderer: am5xy.AxisRendererY.new(root, {
                minGridDistance: 30,
                cellStartLocation: 0.2,
                cellEndLocation: 0.8
            })
        })
    );
    
    // Set Y-axis data
    const yAxisData = seasons.map(s => ({season: s}));
    yAxis.data.setAll(yAxisData);
    
    // Create series for each season
    seasons.forEach((season, index) => {
        const seasonData = seasonGroups[season];
        
        // Create scatter series
        const series = chart.series.push(
            am5xy.LineSeries.new(root, {
                name: season,
                xAxis: xAxis,
                yAxis: yAxis,
                valueXField: "tour",
                categoryYField: "season",
                valueYField: "win",
                tooltip: am5.Tooltip.new(root, {
                    labelText: "Tour {tour}: {result}\n{opponent}\nScore: {score}"
                })
            })
        );
        
        // Configure bullets (scatter points) - larger/bolder markers
        series.bullets.push(function() {
            const bulletCircle = am5.Circle.new(root, {
                radius: 7,
                strokeWidth: 3,
                stroke: am5.color(0xffffff),
                strokeOpacity: 0.95
            });

            // Color based on result
            bulletCircle.adapters.add("fill", function(fill, target) {
                const dataItem = target.dataItem;
                if (dataItem) {
                    const result = dataItem.dataContext.result;
                    if (result === 'Win') return am5.color(ARSENAL_COLORS.win);
                    if (result === 'Draw') return am5.color(ARSENAL_COLORS.draw);
                    return am5.color(ARSENAL_COLORS.loss);
                }
                return fill;
            });

            return am5.Bullet.new(root, {
                sprite: bulletCircle
            });
        });
        
        // Hide the connecting line
        series.strokes.template.setAll({
            strokeOpacity: 0
        });
        
        series.data.setAll(seasonData);
    });
    
    // Add legend
    const legend = chart.children.push(
        am5.Legend.new(root, {
            centerX: am5.percent(50),
            x: am5.percent(50),
            layout: root.horizontalLayout
        })
    );
    
    // Custom legend with color indicators
    legend.data.setAll([
        {
            name: "Win",
            fill: am5.color(ARSENAL_COLORS.win)
        },
        {
            name: "Draw",
            fill: am5.color(ARSENAL_COLORS.draw)
        },
        {
            name: "Loss",
            fill: am5.color(ARSENAL_COLORS.loss)
        }
    ]);
    
    // Customize legend markers
    legend.markers.template.setAll({
        width: 12,
        height: 12
    });
    
    chart.appear(1000, 100);
    seasonsChart = root;
    
    console.log('Season comparison chart created with', seasons.length, 'seasons');
}

console.log('Dashboard JavaScript loaded successfully');