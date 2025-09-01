class FootballMatchesApp {
    constructor() {
        this.apiEndpoints = [
            { name: 'MaxBet', url: 'https://maxbet.rs/restapi/offer/en/init' },
            { name: 'MerkurXTip', url: 'https://www.merkurxtip.rs/restapi/offer/en/init' },
            { name: 'Oktagon', url: 'https://oktagonbet.com/restapi/offer/en/init' },
            { name: 'Betole', url: 'https://betole.com/restapi/offer/en/init' }
        ];
        
        this.footballMatches = [];
        this.useMockData = false; // Set to true for testing
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadMatches();
    }
    
    bindEvents() {
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadMatches();
        });
        
        document.getElementById('toggleMockBtn').addEventListener('click', () => {
            this.toggleMockData();
        });
    }
    
    toggleMockData() {
        this.useMockData = !this.useMockData;
        const toggleBtn = document.getElementById('toggleMockBtn');
        
        if (this.useMockData) {
            toggleBtn.textContent = 'Use Live Data';
            toggleBtn.classList.add('mock-active');
        } else {
            toggleBtn.textContent = 'Use Mock Data';
            toggleBtn.classList.remove('mock-active');
        }
        
        this.loadMatches();
    }
    
    async loadMatches() {
        this.showLoading(true);
        this.footballMatches = [];
        
        if (this.useMockData) {
            this.loadMockData();
        } else {
            const promises = this.apiEndpoints.map(endpoint => 
                this.fetchFromEndpoint(endpoint)
            );
            
            await Promise.allSettled(promises);
        }
        
        this.showLoading(false);
        this.displayMatches();
        this.updateStats();
    }
    
    async fetchFromEndpoint(endpoint) {
        // Try local proxy server first (if running)
        try {
            console.log(`Trying local proxy for ${endpoint.name}...`);
            const localProxyUrl = `http://localhost:3000/api/proxy?url=${encodeURIComponent(endpoint.url)}&bookmaker=${encodeURIComponent(endpoint.name)}`;
            
            const response = await fetch(localProxyUrl);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Local proxy success for ${endpoint.name}:`, data);
                console.log(`🔍 Data structure for ${endpoint.name}:`, JSON.stringify(data, null, 2).substring(0, 1000));
                
                const footballEvents = this.extractFootballMatches(data, endpoint.name);
                this.footballMatches.push(...footballEvents);
                return;
            }
        } catch (error) {
            console.log(`Local proxy not available for ${endpoint.name}, trying external proxies...`);
        }
        
        // Fallback to external proxies
        const proxies = [
            'https://api.allorigins.win/get?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        
        for (let i = 0; i < proxies.length; i++) {
            try {
                console.log(`Fetching from ${endpoint.name} using external proxy ${i + 1}...`);
                
                let response;
                let data;
                
                if (i === 0) {
                    // allorigins returns wrapped response
                    response = await fetch(proxies[i] + encodeURIComponent(endpoint.url), {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const wrappedData = await response.json();
                    data = JSON.parse(wrappedData.contents);
                } else {
                    // Direct proxy
                    response = await fetch(proxies[i] + endpoint.url, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    data = await response.json();
                }
                
                console.log(`✅ External proxy success for ${endpoint.name}:`, data);
                
                const footballEvents = this.extractFootballMatches(data, endpoint.name);
                this.footballMatches.push(...footballEvents);
                return;
                
            } catch (error) {
                console.warn(`❌ External proxy ${i + 1} failed for ${endpoint.name}:`, error.message);
            }
        }
        
        console.error(`❌ All proxy attempts failed for ${endpoint.name}`);
        this.showError();
    }
    
    extractFootballMatches(data, bookmaker) {
        const matches = [];
        
        try {
            console.log(`🔍 Extracting matches from ${bookmaker}...`);
            console.log(`📊 Data keys:`, Object.keys(data || {}));
            
            // The actual API structure uses esMatches array
            if (data && data.esMatches && Array.isArray(data.esMatches)) {
                console.log(`📈 Found ${data.esMatches.length} matches in ${bookmaker}`);
                
                data.esMatches.forEach((match, matchIndex) => {
                    console.log(`🎯 Match ${matchIndex}:`, {
                        id: match.id,
                        home: match.home,
                        away: match.away,
                        sport: match.sport,
                        leagueName: match.leagueName,
                        kickOffTime: match.kickOffTime
                    });
                    
                    // Check if this is football/soccer
                    // Some matches have sport: "S", others might not have sport field but are football
                    const isFootball = match.sport === "S" || 
                                     match.sportToken?.includes("Football") ||
                                     match.sportToken?.includes("#S#") ||
                                     !match.sport; // If no sport specified, assume it's football for these betting APIs
                    
                    if (isFootball) {
                        console.log(`⚽ Found football match: ${match.home} vs ${match.away}`);
                        
                        // Convert timestamp to readable date
                        const startTime = match.kickOffTime ? new Date(match.kickOffTime).toISOString() : null;
                        
                        matches.push({
                            id: `${bookmaker}-${match.id}`,
                            bookmaker: bookmaker,
                            homeTeam: match.home,
                            awayTeam: match.away,
                            league: match.leagueName || 'Unknown League',
                            region: 'Unknown Region',
                            startTime: startTime,
                            eventId: match.id,
                            sport: match.sport || 'S',
                            matchCode: match.matchCode,
                            odds: {
                                home: match.odds?.['1'] || null,    // 1x2 odds - Home win
                                draw: match.odds?.['2'] || null,    // 1x2 odds - Draw  
                                away: match.odds?.['3'] || null     // 1x2 odds - Away win
                            },
                            normalizedKey: this.createMatchKey(match.home, match.away, startTime)
                        });
                    } else {
                        console.log(`🚫 Skipping non-football match: ${match.home} vs ${match.away} (sport: ${match.sport})`);
                    }
                });
            } else {
                console.log(`❌ No esMatches array found in ${bookmaker} response`);
                console.log(`🔍 Available top-level keys:`, Object.keys(data || {}));
            }
            
            console.log(`✅ Extracted ${matches.length} football matches from ${bookmaker}`);
            
        } catch (error) {
            console.error(`❌ Error parsing data from ${bookmaker}:`, error);
        }
        
        return matches;
    }
    
    displayMatches() {
        const container = document.getElementById('matchesContainer');
        
        if (this.footballMatches.length === 0) {
            container.innerHTML = `
                <div class="no-matches">
                    <h3>No football matches found</h3>
                    <p>Try refreshing or check the console for API errors.</p>
                </div>
            `;
            return;
        }
        
        // Group matches by normalized key
        const groupedMatches = this.groupMatchesByKey();
        
        // Convert to array and sort by start time
        const matchGroups = Object.values(groupedMatches).sort((a, b) => {
            const timeA = new Date(a[0].startTime || 0);
            const timeB = new Date(b[0].startTime || 0);
            return timeA - timeB;
        });
        
        container.innerHTML = matchGroups.map(matchGroup => 
            this.createMatchComparisonCard(matchGroup)
        ).join('');
    }
    
    createMatchComparisonCard(matchGroup) {
        const mainMatch = matchGroup[0]; // Use first match as reference
        const startTime = mainMatch.startTime ? 
            new Date(mainMatch.startTime).toLocaleString() : 
            'Time TBD';
        
        // Find best odds for each outcome
        const bestOdds = this.findBestOdds(matchGroup);
        
        return `
            <div class="match-comparison-card">
                <div class="match-header">
                    <div class="match-info">
                        <h3 class="match-title">${mainMatch.homeTeam} vs ${mainMatch.awayTeam}</h3>
                        <div class="match-details">
                            <span class="league">${mainMatch.league}</span>
                            <span class="match-time">${startTime}</span>
                        </div>
                    </div>
                    <div class="bookmaker-count">${matchGroup.length} bookmaker${matchGroup.length > 1 ? 's' : ''}</div>
                </div>
                
                <div class="odds-comparison">
                    <div class="odds-header">
                        <div class="outcome-label">Home Win</div>
                        <div class="outcome-label">Draw</div>
                        <div class="outcome-label">Away Win</div>
                    </div>
                    
                    ${matchGroup.map(match => this.createBookmakerOddsRow(match, bestOdds)).join('')}
                </div>
                
                <div class="best-odds-summary">
                    <div class="best-odd ${bestOdds.home.value ? '' : 'no-odds'}">
                        <span class="odd-value">${bestOdds.home.value || 'N/A'}</span>
                        <span class="odd-bookmaker">${bestOdds.home.bookmaker || ''}</span>
                    </div>
                    <div class="best-odd ${bestOdds.draw.value ? '' : 'no-odds'}">
                        <span class="odd-value">${bestOdds.draw.value || 'N/A'}</span>
                        <span class="odd-bookmaker">${bestOdds.draw.bookmaker || ''}</span>
                    </div>
                    <div class="best-odd ${bestOdds.away.value ? '' : 'no-odds'}">
                        <span class="odd-value">${bestOdds.away.value || 'N/A'}</span>
                        <span class="odd-bookmaker">${bestOdds.away.bookmaker || ''}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    createBookmakerOddsRow(match, bestOdds) {
        const isHomeOddBest = bestOdds.home.value && match.odds.home === bestOdds.home.value;
        const isDrawOddBest = bestOdds.draw.value && match.odds.draw === bestOdds.draw.value;
        const isAwayOddBest = bestOdds.away.value && match.odds.away === bestOdds.away.value;
        
        return `
            <div class="bookmaker-odds-row">
                <div class="bookmaker-name">${match.bookmaker}</div>
                <div class="odd-cell ${isHomeOddBest ? 'best-odd-highlight' : ''} ${match.odds.home ? '' : 'no-odds'}">
                    ${match.odds.home || 'N/A'}
                </div>
                <div class="odd-cell ${isDrawOddBest ? 'best-odd-highlight' : ''} ${match.odds.draw ? '' : 'no-odds'}">
                    ${match.odds.draw || 'N/A'}
                </div>
                <div class="odd-cell ${isAwayOddBest ? 'best-odd-highlight' : ''} ${match.odds.away ? '' : 'no-odds'}">
                    ${match.odds.away || 'N/A'}
                </div>
            </div>
        `;
    }
    
    findBestOdds(matchGroup) {
        const bestOdds = {
            home: { value: null, bookmaker: null },
            draw: { value: null, bookmaker: null },
            away: { value: null, bookmaker: null }
        };
        
        matchGroup.forEach(match => {
            // Higher odds are better for bettors
            if (match.odds.home && (!bestOdds.home.value || match.odds.home > bestOdds.home.value)) {
                bestOdds.home = { value: match.odds.home, bookmaker: match.bookmaker };
            }
            if (match.odds.draw && (!bestOdds.draw.value || match.odds.draw > bestOdds.draw.value)) {
                bestOdds.draw = { value: match.odds.draw, bookmaker: match.bookmaker };
            }
            if (match.odds.away && (!bestOdds.away.value || match.odds.away > bestOdds.away.value)) {
                bestOdds.away = { value: match.odds.away, bookmaker: match.bookmaker };
            }
        });
        
        return bestOdds;
    }
    
    updateStats() {
        const statsContainer = document.getElementById('stats');
        const bookmakerCounts = {};
        
        this.footballMatches.forEach(match => {
            bookmakerCounts[match.bookmaker] = (bookmakerCounts[match.bookmaker] || 0) + 1;
        });
        
        const statsHtml = `
            <div class="stat-item">
                <div class="stat-number">${this.footballMatches.length}</div>
                <div class="stat-label">Total Matches</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${Object.keys(bookmakerCounts).length}</div>
                <div class="stat-label">Active Bookmakers</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${new Set(this.footballMatches.map(m => m.league)).size}</div>
                <div class="stat-label">Leagues</div>
            </div>
        `;
        
        statsContainer.innerHTML = statsHtml;
    }
    
    showLoading(show) {
        const loading = document.getElementById('loading');
        loading.style.display = show ? 'block' : 'none';
    }
    
    loadMockData() {
        // Mock data with odds for testing when APIs are not accessible
        const baseTime = Date.now() + 2 * 60 * 60 * 1000;
        
        const mockMatches = [
            // Manchester United vs Liverpool - Multiple bookmakers
            {
                id: 'mock-1',
                bookmaker: 'MaxBet',
                homeTeam: 'Manchester United',
                awayTeam: 'Liverpool',
                league: 'Premier League',
                region: 'England',
                startTime: new Date(baseTime).toISOString(),
                eventId: '12345',
                sport: 'S',
                odds: { home: 2.10, draw: 3.40, away: 3.20 },
                normalizedKey: this.createMatchKey('Manchester United', 'Liverpool', new Date(baseTime).toISOString())
            },
            {
                id: 'mock-1b',
                bookmaker: 'Oktagon',
                homeTeam: 'Manchester United',
                awayTeam: 'Liverpool',
                league: 'Premier League',
                region: 'England',
                startTime: new Date(baseTime).toISOString(),
                eventId: '12345b',
                sport: 'S',
                odds: { home: 2.05, draw: 3.50, away: 3.25 },
                normalizedKey: this.createMatchKey('Manchester United', 'Liverpool', new Date(baseTime).toISOString())
            },
            {
                id: 'mock-1c',
                bookmaker: 'Betole',
                homeTeam: 'Manchester United',
                awayTeam: 'Liverpool',
                league: 'Premier League',
                region: 'England',
                startTime: new Date(baseTime).toISOString(),
                eventId: '12345c',
                sport: 'S',
                odds: { home: 2.15, draw: 3.30, away: 3.15 },
                normalizedKey: this.createMatchKey('Manchester United', 'Liverpool', new Date(baseTime).toISOString())
            },
            
            // Real Madrid vs Barcelona - Multiple bookmakers
            {
                id: 'mock-2',
                bookmaker: 'MaxBet',
                homeTeam: 'Real Madrid',
                awayTeam: 'Barcelona',
                league: 'La Liga',
                region: 'Spain',
                startTime: new Date(baseTime + 2 * 60 * 60 * 1000).toISOString(),
                eventId: '12346',
                sport: 'S',
                odds: { home: 2.80, draw: 3.10, away: 2.60 },
                normalizedKey: this.createMatchKey('Real Madrid', 'Barcelona', new Date(baseTime + 2 * 60 * 60 * 1000).toISOString())
            },
            {
                id: 'mock-2b',
                bookmaker: 'MerkurXTip',
                homeTeam: 'Real Madrid',
                awayTeam: 'Barcelona',
                league: 'La Liga',
                region: 'Spain',
                startTime: new Date(baseTime + 2 * 60 * 60 * 1000).toISOString(),
                eventId: '12346b',
                sport: 'S',
                odds: { home: 2.75, draw: 3.20, away: 2.65 },
                normalizedKey: this.createMatchKey('Real Madrid', 'Barcelona', new Date(baseTime + 2 * 60 * 60 * 1000).toISOString())
            },
            
            // Bayern Munich vs Borussia Dortmund - Single bookmaker
            {
                id: 'mock-3',
                bookmaker: 'MerkurXTip',
                homeTeam: 'Bayern Munich',
                awayTeam: 'Borussia Dortmund',
                league: 'Bundesliga',
                region: 'Germany',
                startTime: new Date(baseTime + 4 * 60 * 60 * 1000).toISOString(),
                eventId: '12347',
                sport: 'S',
                odds: { home: 1.85, draw: 3.60, away: 4.20 },
                normalizedKey: this.createMatchKey('Bayern Munich', 'Borussia Dortmund', new Date(baseTime + 4 * 60 * 60 * 1000).toISOString())
            },
            
            // Test case for team name variations - Herediano vs Liberia
            {
                id: 'mock-4a',
                bookmaker: 'MaxBet',
                homeTeam: 'Herediano',
                awayTeam: 'Liberia',
                league: 'Costa Rica Liga',
                region: 'Costa Rica',
                startTime: new Date(baseTime + 6 * 60 * 60 * 1000).toISOString(),
                eventId: '12348a',
                sport: 'S',
                odds: { home: 1.95, draw: 3.20, away: 3.80 },
                normalizedKey: this.createMatchKey('Herediano', 'Liberia', new Date(baseTime + 6 * 60 * 60 * 1000).toISOString())
            },
            {
                id: 'mock-4b',
                bookmaker: 'Oktagon',
                homeTeam: 'Herediano',
                awayTeam: 'M.Liberia',
                league: 'Costa Rica Liga',
                region: 'Costa Rica',
                startTime: new Date(baseTime + 6 * 60 * 60 * 1000).toISOString(),
                eventId: '12348b',
                sport: 'S',
                odds: { home: 2.00, draw: 3.15, away: 3.75 },
                normalizedKey: this.createMatchKey('Herediano', 'M.Liberia', new Date(baseTime + 6 * 60 * 60 * 1000).toISOString())
            },
            {
                id: 'mock-4c',
                bookmaker: 'Betole',
                homeTeam: 'CS Herediano',
                awayTeam: 'Liberia',
                league: 'Costa Rica Liga',
                region: 'Costa Rica',
                startTime: new Date(baseTime + 6 * 60 * 60 * 1000).toISOString(),
                eventId: '12348c',
                sport: 'S',
                odds: { home: 1.90, draw: 3.25, away: 3.85 },
                normalizedKey: this.createMatchKey('CS Herediano', 'Liberia', new Date(baseTime + 6 * 60 * 60 * 1000).toISOString())
            }
        ];
        
        this.footballMatches = mockMatches;
        console.log('✅ Loaded mock football data with odds comparison');
    }

    createMatchKey(homeTeam, awayTeam, startTime) {
        // Advanced team name normalization for better matching
        const normalizeTeam = (team) => {
            let normalized = team.toLowerCase().trim();
            
            // Remove common prefixes and suffixes
            const prefixesToRemove = [
                'cs ', 'cf ', 'fc ', 'ac ', 'sc ', 'cd ', 'ca ', 'club ', 'real ', 'atletico ', 'athletic ',
                'deportivo ', 'sporting ', 'union ', 'asociacion ', 'sociedad ', 'club deportivo ',
                'futbol club ', 'football club ', 'soccer club ', 'deportes ', 'ad ', 'ud ', 'sd '
            ];
            
            const suffixesToRemove = [
                ' fc', ' cf', ' ac', ' sc', ' cd', ' ca', ' united', ' utd', ' city', ' town',
                ' rovers', ' wanderers', ' athletic', ' atletico', ' deportivo', ' sporting',
                ' club', ' team', ' football', ' soccer', ' futbol', ' deportes'
            ];
            
            // Remove prefixes
            for (const prefix of prefixesToRemove) {
                if (normalized.startsWith(prefix)) {
                    normalized = normalized.substring(prefix.length);
                    break; // Only remove one prefix
                }
            }
            
            // Remove suffixes
            for (const suffix of suffixesToRemove) {
                if (normalized.endsWith(suffix)) {
                    normalized = normalized.substring(0, normalized.length - suffix.length);
                    break; // Only remove one suffix
                }
            }
            
            // Handle common abbreviations and variations
            const abbreviations = {
                // Common team name variations
                'manchester united': 'manutd',
                'manchester city': 'mancity',
                'real madrid': 'realmadrid',
                'atletico madrid': 'atleticomadrid',
                'bayern munich': 'bayernmunich',
                'borussia dortmund': 'borussiadortmund',
                'paris saint germain': 'psg',
                'paris st germain': 'psg',
                'tottenham hotspur': 'tottenham',
                'west ham united': 'westham',
                'newcastle united': 'newcastle',
                'brighton hove albion': 'brighton',
                'crystal palace': 'crystalpalace',
                
                // Handle M. prefix (like M.Liberia)
                'm.': '',
                'm ': '',
                
                // Handle common location variations
                'san jose': 'sanjose',
                'santa fe': 'santafe',
                'los angeles': 'losangeles',
                'new york': 'newyork',
                'las vegas': 'lasvegas'
            };
            
            // Apply abbreviations
            for (const [full, abbrev] of Object.entries(abbreviations)) {
                if (normalized.includes(full)) {
                    normalized = normalized.replace(full, abbrev);
                }
            }
            
            // Remove all remaining spaces and special characters
            normalized = normalized
                .replace(/\s+/g, '') // Remove all spaces
                .replace(/[^\w]/g, '') // Remove special characters (dots, hyphens, etc.)
                .replace(/\d+/g, ''); // Remove numbers
            
            // Handle very short names (less than 3 chars) - might be abbreviations
            if (normalized.length < 3 && team.length > normalized.length) {
                // Keep original if normalization made it too short
                normalized = team.toLowerCase().replace(/[^\w]/g, '').replace(/\s+/g, '');
            }
            
            return normalized;
        };
        
        const home = normalizeTeam(homeTeam);
        const away = normalizeTeam(awayTeam);
        const date = startTime ? new Date(startTime).toDateString() : 'unknown';
        
        console.log(`🔍 Team normalization: "${homeTeam}" -> "${home}", "${awayTeam}" -> "${away}"`);
        
        // Create consistent key regardless of team order
        const teams = [home, away].sort();
        const matchKey = `${teams[0]}_vs_${teams[1]}_${date}`;
        
        console.log(`🔑 Match key: ${matchKey}`);
        return matchKey;
    }
    
    groupMatchesByKey() {
        const grouped = {};
        
        this.footballMatches.forEach(match => {
            const key = match.normalizedKey;
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(match);
        });
        
        return grouped;
    }
    
    showError() {
        const error = document.getElementById('error');
        error.style.display = 'block';
        setTimeout(() => {
            error.style.display = 'none';
        }, 5000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FootballMatchesApp();
});