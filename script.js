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
                            region: 'Unknown Region', // Not provided in this API structure
                            startTime: startTime,
                            eventId: match.id,
                            sport: match.sport || 'S',
                            matchCode: match.matchCode
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
        
        // Sort matches by start time
        this.footballMatches.sort((a, b) => {
            const timeA = new Date(a.startTime || 0);
            const timeB = new Date(b.startTime || 0);
            return timeA - timeB;
        });
        
        container.innerHTML = this.footballMatches.map(match => 
            this.createMatchCard(match)
        ).join('');
    }
    
    createMatchCard(match) {
        const startTime = match.startTime ? 
            new Date(match.startTime).toLocaleString() : 
            'Time TBD';
            
        return `
            <div class="match-card">
                <div class="match-header">
                    <span class="bookmaker">${match.bookmaker}</span>
                    <span class="match-time">${startTime}</span>
                </div>
                <div class="teams">
                    <div class="team-name">${match.homeTeam || 'Home Team'}</div>
                    <div class="vs">VS</div>
                    <div class="team-name">${match.awayTeam || 'Away Team'}</div>
                </div>
                <div class="league">${match.league || 'Unknown League'}</div>
                ${match.region ? `<div class="region">${match.region}</div>` : ''}
            </div>
        `;
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
        // Mock data for testing when APIs are not accessible
        const mockMatches = [
            {
                id: 'mock-1',
                bookmaker: 'MaxBet',
                homeTeam: 'Manchester United',
                awayTeam: 'Liverpool',
                league: 'Premier League',
                region: 'England',
                startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                eventId: '12345',
                sport: 'S'
            },
            {
                id: 'mock-2',
                bookmaker: 'Oktagon',
                homeTeam: 'Real Madrid',
                awayTeam: 'Barcelona',
                league: 'La Liga',
                region: 'Spain',
                startTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
                eventId: '12346',
                sport: 'S'
            },
            {
                id: 'mock-3',
                bookmaker: 'MerkurXTip',
                homeTeam: 'Bayern Munich',
                awayTeam: 'Borussia Dortmund',
                league: 'Bundesliga',
                region: 'Germany',
                startTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
                eventId: '12347',
                sport: 'S'
            },
            {
                id: 'mock-4',
                bookmaker: 'Betole',
                homeTeam: 'Juventus',
                awayTeam: 'AC Milan',
                league: 'Serie A',
                region: 'Italy',
                startTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
                eventId: '12348',
                sport: 'S'
            }
        ];
        
        this.footballMatches = mockMatches;
        console.log('✅ Loaded mock football data');
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