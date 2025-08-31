const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Serve static files from current directory
app.use(express.static('.'));

// Proxy endpoint for betting APIs
app.get('/api/proxy', async (req, res) => {
    const { url, bookmaker } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    try {
        console.log(`Fetching from ${bookmaker || 'Unknown'}: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`✅ Successfully fetched data from ${bookmaker || 'Unknown'}`);
        
        res.json(data);
        
    } catch (error) {
        console.error(`❌ Error fetching from ${bookmaker || 'Unknown'}:`, error.message);
        res.status(500).json({ 
            error: 'Failed to fetch data', 
            message: error.message,
            bookmaker: bookmaker || 'Unknown'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Proxy server running at http://localhost:${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} to view the football matches app`);
    console.log(`🔗 Proxy endpoint: http://localhost:${PORT}/api/proxy?url=<betting_api_url>&bookmaker=<name>`);
});