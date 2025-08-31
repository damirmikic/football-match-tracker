# ⚽ Football Matches Tracker

A modern web application that fetches and displays live football matches from multiple betting APIs.

## 🚀 Features

- **Multi-API Integration**: Fetches data from 4 major betting sites (MaxBet, MerkurXTip, Oktagon, Betole)
- **Real-time Data**: Live football match information with automatic refresh
- **CORS Bypass**: Built-in proxy server to handle cross-origin requests
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Mock Data Toggle**: Switch between live and test data for development
- **Statistics Dashboard**: Shows total matches, active bookmakers, and leagues
- **Error Handling**: Graceful fallbacks and error recovery

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js, Express.js
- **APIs**: RESTful betting APIs
- **Styling**: Modern CSS with gradients and animations

## 📦 Installation

### Quick Start (Mock Data)
1. Open `index.html` in your browser
2. Click "Use Mock Data" to see sample matches
3. No setup required!

### Full Setup (Live Data)
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the proxy server:
   ```bash
   npm start
   ```

3. Open `http://localhost:3000` in your browser

## 🔧 Configuration

The app fetches data from these APIs:
- MaxBet: `https://maxbet.rs/restapi/offer/en/init`
- MerkurXTip: `https://www.merkurxtip.rs/restapi/offer/en/init`
- Oktagon: `https://oktagonbet.com/restapi/offer/en/init`
- Betole: `https://betole.com/restapi/offer/en/init`

## 📁 Project Structure

```
football-matches-tracker/
├── index.html          # Main web application
├── styles.css          # Responsive styling
├── script.js           # Core application logic
├── proxy-server.js     # Node.js CORS proxy
├── package.json        # Dependencies
└── README.md          # This file
```

## 🎯 How It Works

1. **Data Fetching**: Tries local proxy first, then external CORS proxies
2. **Filtering**: Extracts only football matches (`sport: "S"`)
3. **Display**: Shows matches in responsive card layout
4. **Statistics**: Real-time stats on matches and bookmakers

## 🔄 API Response Structure

The betting APIs return data in this format:
```json
{
  "esMatches": [
    {
      "id": 123456,
      "home": "Team A",
      "away": "Team B",
      "sport": "S",
      "leagueName": "Premier League",
      "kickOffTime": 1756677600000
    }
  ]
}
```

## 🚀 Deployment

### Local Development
```bash
npm start
```

### Production
1. Deploy the proxy server to your preferred hosting platform
2. Update API endpoints in `script.js` if needed
3. Serve static files (HTML, CSS, JS) from any web server

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT License - feel free to use this project for any purpose.

## 🔗 Live Demo

Open `index.html` in your browser or visit the deployed version.

---

Built with ❤️ for football fans and developers