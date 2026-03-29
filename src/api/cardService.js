// API configuration
// Force rebuild v2 - 2026-03-29
const API_BASE = '/.netlify/functions';

// Set to false to use real APIs (PokémonTCG.io + PokemonPriceTracker + PSA scraping)
// Set to true only for local development without API keys
const USE_MOCK = false;

// Mock data for demonstration
const MOCK_CARDS = {
  'charizard-base-set': {
    id: 'base1-4',
    name: 'Charizard',
    set: 'Base Set',
    number: '4/102',
    rarity: 'Rare Holo',
    imageUrl: 'https://images.pokemontcg.io/base1/4_hires.png',
    tcgplayerUrl: 'https://www.tcgplayer.com/product/85864',
    pricing: {
      nearMint: 350.00,
      psa9: 850.00,
      psa10: 5500.00,
      priceMultiple: 15.7,
      lastUpdated: new Date().toISOString(),
    },
    population: {
      total: 4521,
      psa10: 127,
      psa9: 892,
      psa8: 1456,
      psa10Rate: 2.81,
      lastUpdated: new Date().toISOString(),
    },
  },
  'blastoise-base-set': {
    id: 'base1-2',
    name: 'Blastoise',
    set: 'Base Set',
    number: '2/102',
    rarity: 'Rare Holo',
    imageUrl: 'https://images.pokemontcg.io/base1/2_hires.png',
    tcgplayerUrl: 'https://www.tcgplayer.com/product/85862',
    pricing: {
      nearMint: 180.00,
      psa9: 420.00,
      psa10: 2800.00,
      priceMultiple: 15.6,
      lastUpdated: new Date().toISOString(),
    },
    population: {
      total: 3892,
      psa10: 156,
      psa9: 745,
      psa8: 1123,
      psa10Rate: 4.01,
      lastUpdated: new Date().toISOString(),
    },
  },
  'venusaur-base-set': {
    id: 'base1-15',
    name: 'Venusaur',
    set: 'Base Set',
    number: '15/102',
    rarity: 'Rare Holo',
    imageUrl: 'https://images.pokemontcg.io/base1/15_hires.png',
    tcgplayerUrl: 'https://www.tcgplayer.com/product/85877',
    pricing: {
      nearMint: 150.00,
      psa9: 380.00,
      psa10: 2200.00,
      priceMultiple: 14.7,
      lastUpdated: new Date().toISOString(),
    },
    population: {
      total: 3245,
      psa10: 189,
      psa9: 678,
      psa8: 987,
      psa10Rate: 5.82,
      lastUpdated: new Date().toISOString(),
    },
  },
  'mewtwo-base-set': {
    id: 'base1-10',
    name: 'Mewtwo',
    set: 'Base Set',
    number: '10/102',
    rarity: 'Rare Holo',
    imageUrl: 'https://images.pokemontcg.io/base1/10_hires.png',
    tcgplayerUrl: 'https://www.tcgplayer.com/product/85870',
    pricing: {
      nearMint: 85.00,
      psa9: 180.00,
      psa10: 950.00,
      priceMultiple: 11.2,
      lastUpdated: new Date().toISOString(),
    },
    population: {
      total: 5678,
      psa10: 423,
      psa9: 1234,
      psa8: 1890,
      psa10Rate: 7.45,
      lastUpdated: new Date().toISOString(),
    },
  },
  'pikachu-jungle': {
    id: 'jungle-60',
    name: 'Pikachu',
    set: 'Jungle',
    number: '60/64',
    rarity: 'Common',
    imageUrl: 'https://images.pokemontcg.io/jungle/60_hires.png',
    tcgplayerUrl: 'https://www.tcgplayer.com/product/86016',
    pricing: {
      nearMint: 8.00,
      psa9: 25.00,
      psa10: 120.00,
      priceMultiple: 15.0,
      lastUpdated: new Date().toISOString(),
    },
    population: {
      total: 8923,
      psa10: 1567,
      psa9: 2345,
      psa8: 2890,
      psa10Rate: 17.56,
      lastUpdated: new Date().toISOString(),
    },
  },
};

// Generate a mock key from card name and set
const getMockKey = (name, set) => {
  return `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${set.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
};

// Generate random mock data for unknown cards
const generateMockData = (card) => {
  const nmPrice = Math.random() * 200 + 5;
  const psa9Price = nmPrice * (2 + Math.random() * 3);
  const psa10Price = psa9Price * (1.5 + Math.random() * 4);
  const totalPop = Math.floor(Math.random() * 5000) + 100;
  const psa10Pop = Math.floor(totalPop * (Math.random() * 0.15 + 0.02));
  
  return {
    id: card.id,
    name: card.name,
    set: card.set,
    number: card.number || 'N/A',
    rarity: ['Common', 'Uncommon', 'Rare', 'Rare Holo'][Math.floor(Math.random() * 4)],
    imageUrl: `https://images.pokemontcg.io/base1/${Math.floor(Math.random() * 102) + 1}_hires.png`,
    tcgplayerUrl: 'https://www.tcgplayer.com',
    pricing: {
      nearMint: parseFloat(nmPrice.toFixed(2)),
      psa9: parseFloat(psa9Price.toFixed(2)),
      psa10: parseFloat(psa10Price.toFixed(2)),
      priceMultiple: parseFloat((psa10Price / nmPrice).toFixed(1)),
      lastUpdated: new Date().toISOString(),
    },
    population: {
      total: totalPop,
      psa10: psa10Pop,
      psa9: Math.floor(totalPop * 0.2),
      psa8: Math.floor(totalPop * 0.3),
      psa10Rate: parseFloat(((psa10Pop / totalPop) * 100).toFixed(2)),
      lastUpdated: new Date().toISOString(),
    },
  };
};

// Fetch card data from API
export const fetchCardData = async (card) => {
  if (USE_MOCK) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
    
    const mockKey = getMockKey(card.name, card.set);
    const mockData = MOCK_CARDS[mockKey];
    
    if (mockData) {
      return { ...mockData, id: card.id };
    }
    
    // Generate random data for unknown cards
    return generateMockData(card);
  }
  
  // Production API call
  try {
    const response = await fetch(`${API_BASE}/get-card-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: card.name,
        set: card.set,
        number: card.number,
        priceTrackerId: card.priceTrackerId || null,
        skipCache: true, // Always get fresh data when resyncing
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return { ...data, id: card.id };
  } catch (error) {
    console.error('Error fetching card data:', error);
    throw error;
  }
};

// Batch fetch multiple cards
export const fetchCardsData = async (cards, onProgress) => {
  const results = [];
  const batchSize = 5; // Process 5 cards at a time
  
  for (let i = 0; i < cards.length; i += batchSize) {
    const batch = cards.slice(i, i + batchSize);
    
    const batchResults = await Promise.allSettled(
      batch.map(card => fetchCardData(card))
    );
    
    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      if (result.status === 'fulfilled') {
        results.push({ ...result.value, status: 'success', error: null });
      } else {
        results.push({
          ...batch[j],
          status: 'error',
          error: result.reason?.message || 'Failed to fetch data',
        });
      }
    }
    
    // Report progress
    if (onProgress) {
      const progress = Math.min(100, Math.round(((i + batchSize) / cards.length) * 100));
      onProgress(progress);
    }
  }
  
  return results;
};

// Search for a single card (for manual search)
export const searchCard = async (query) => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const results = Object.values(MOCK_CARDS).filter(card =>
      card.name.toLowerCase().includes(query.toLowerCase()) ||
      card.set.toLowerCase().includes(query.toLowerCase())
    );
    
    return results;
  }
  
  try {
    const response = await fetch(`${API_BASE}/search-card?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error searching cards:', error);
    throw error;
  }
};
