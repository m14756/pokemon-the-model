# Pokémon - The Model 🎴⚡

A Progressive Web App (PWA) for tracking and valuing your Pokémon card collection with real-time pricing, PSA grades, and grading opportunity analysis.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- 📤 **CSV Upload** - Bulk import your card collection
- 💰 **Real-time Pricing** - Near Mint, PSA 9, and PSA 10 prices
- 📊 **PSA Population Data** - See how rare PSA 10 grades are
- 🎯 **Grading Score** - AI-powered grading opportunity analysis
- 📱 **PWA Support** - Install on iOS/Android for native-like experience
- 🔍 **Search & Filter** - Find cards quickly in your collection
- 📈 **Collection Stats** - Total values, averages, and insights

## Calculated Metrics

### PSA 10 Rate
Shows the percentage of total graded cards that achieved PSA 10:
- 🟢 **>15%** - Common (easy to grade)
- 🟡 **5-15%** - Moderate difficulty
- 🔴 **<5%** - Rare PSA 10
- 🔥 **<1%** - Legendary rarity

### Price Multiple
How many times more valuable a PSA 10 is compared to Near Mint:
```
Price Multiple = PSA 10 Price / Near Mint Price
```

### Grading Opportunity Score (0-100)
Combines multiple factors to recommend which cards to grade:
- Price Multiple (40% weight)
- PSA 10 Rate - lower is better (30% weight)
- PSA 10 Value (20% weight)
- Market Liquidity (10% weight)

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Routing**: React Router v6
- **CSV Parsing**: PapaParse
- **Backend**: Netlify Functions
- **Hosting**: Netlify

## Data Sources

| Data | Source |
|------|--------|
| Card Info & NM Prices | [PokémonTCG.io](https://pokemontcg.io/) |
| PSA Graded Prices | [PokemonPriceTracker](https://pokemonpricetracker.com/) |
| PSA Population | [PSA Card](https://www.psacard.com/pop) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/pokemon-the-model.git
cd pokemon-the-model

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

### Environment Variables

```env
# Get from https://dev.pokemontcg.io/
POKEMON_TCG_API_KEY=your_api_key

# Optional - for PSA pricing API
POKEMON_PRICE_TRACKER_API_KEY=your_api_key
```

### CSV Format

Your CSV should have these columns:

| Column | Required | Example |
|--------|----------|---------|
| Card Name | ✅ | Charizard |
| Set Name | ✅ | Base Set |
| Card Number | ❌ | 4/102 |

Example:
```csv
Card Name,Set Name,Card Number
Charizard,Base Set,4/102
Blastoise,Base Set,2/102
Pikachu,Jungle,60/64
```

## Deployment

### Netlify (Recommended)

1. Push to GitHub
2. Connect repo to Netlify
3. Add environment variables in Netlify dashboard
4. Deploy!

```bash
# Or deploy manually
npm run build
netlify deploy --prod
```

## Project Structure

```
pokemon-the-model/
├── src/
│   ├── api/           # API services
│   ├── components/    # React components
│   ├── hooks/         # Custom hooks
│   ├── pages/         # Page components
│   ├── store/         # Zustand store
│   ├── utils/         # Helper functions
│   ├── App.jsx
│   └── main.jsx
├── netlify/
│   └── functions/     # Serverless functions
├── public/            # Static assets
└── index.html
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [PokémonTCG.io](https://pokemontcg.io/) for the card database API
- [PSA](https://www.psacard.com/) for population data
- [Tailwind CSS](https://tailwindcss.com/) for styling

---

Built with ❤️ for Pokémon collectors everywhere.
