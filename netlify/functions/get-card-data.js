// Netlify serverless function to fetch card data from multiple sources
// This function combines data from PokémonTCG.io and PokemonPriceTracker

const POKEMON_TCG_API = 'https://api.pokemontcg.io/v2';

// Simple in-memory cache (will reset on cold starts)
// In production, consider using Netlify Blobs or Redis
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const getCacheKey = (name, set) => `${name.toLowerCase()}-${set.toLowerCase()}`;

const getFromCache = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
};

const setCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// Search for a card using PokémonTCG.io API
const searchPokemonTCG = async (name, set, number) => {
  const apiKey = process.env.POKEMON_TCG_API_KEY;
  
  // Build search query
  let query = `name:"${name}"`;
  if (set) {
    query += ` set.name:"${set}"`;
  }
  if (number) {
    query += ` number:"${number.split('/')[0]}"`;
  }
  
  const url = `${POKEMON_TCG_API}/cards?q=${encodeURIComponent(query)}&pageSize=5`;
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (apiKey) {
    headers['X-Api-Key'] = apiKey;
  }
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    throw new Error(`PokémonTCG API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.data || data.data.length === 0) {
    return null;
  }
  
  // Return the best match
  return data.data[0];
};

// Get PSA price data from PokemonPriceTracker (placeholder)
// You'll need to implement this based on their actual API
const getPSAPrices = async (cardId, name, set) => {
  // TODO: Implement actual PokemonPriceTracker API call
  // For now, return estimated prices based on NM price
  
  // This is a placeholder - replace with actual API call
  return {
    psa9: null,
    psa10: null,
  };
};

// Get PSA population data (placeholder for scraping)
// In production, implement actual scraping with rate limiting
const getPSAPopulation = async (name, set, number) => {
  // TODO: Implement PSA population scraping
  // For now, return null (will show N/A in UI)
  
  return {
    total: null,
    psa10: null,
    psa9: null,
    psa8: null,
  };
};

// Calculate derived values
const calculateDerivedValues = (pricing, population) => {
  const result = { ...pricing, ...population };
  
  // Calculate PSA 10 Rate
  if (population.psa10 != null && population.total != null && population.total > 0) {
    result.psa10Rate = (population.psa10 / population.total) * 100;
  }
  
  // Calculate Price Multiple
  if (pricing.psa10 != null && pricing.nearMint != null && pricing.nearMint > 0) {
    result.priceMultiple = pricing.psa10 / pricing.nearMint;
  }
  
  return result;
};

export const handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  try {
    const { name, set, number } = JSON.parse(event.body);
    
    if (!name || !set) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Name and set are required' }),
      };
    }
    
    // Check cache first
    const cacheKey = getCacheKey(name, set);
    const cached = getFromCache(cacheKey);
    if (cached) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cached),
      };
    }
    
    // Fetch from PokémonTCG.io
    const tcgCard = await searchPokemonTCG(name, set, number);
    
    if (!tcgCard) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Card not found' }),
      };
    }
    
    // Extract Near Mint price from TCGPlayer data
    let nearMintPrice = null;
    if (tcgCard.tcgplayer?.prices) {
      const prices = tcgCard.tcgplayer.prices;
      // Try different price categories
      nearMintPrice = prices.holofoil?.market || 
                      prices.reverseHolofoil?.market ||
                      prices.normal?.market ||
                      prices['1stEditionHolofoil']?.market ||
                      null;
    }
    
    // Get PSA prices (placeholder - implement actual API)
    const psaPrices = await getPSAPrices(tcgCard.id, name, set);
    
    // Get PSA population (placeholder - implement actual scraping)
    const psaPopulation = await getPSAPopulation(name, set, number);
    
    // For demo purposes, estimate PSA prices if not available
    // In production, remove this and use actual API data
    const estimatedPsa9 = nearMintPrice ? nearMintPrice * (2 + Math.random() * 2) : null;
    const estimatedPsa10 = estimatedPsa9 ? estimatedPsa9 * (1.5 + Math.random() * 3) : null;
    
    // Build response
    const cardData = {
      id: tcgCard.id,
      name: tcgCard.name,
      set: tcgCard.set?.name || set,
      number: tcgCard.number || number || '',
      rarity: tcgCard.rarity || '',
      imageUrl: tcgCard.images?.large || tcgCard.images?.small || '',
      tcgplayerUrl: tcgCard.tcgplayer?.url || '',
      pricing: {
        nearMint: nearMintPrice,
        psa9: psaPrices.psa9 || (nearMintPrice ? parseFloat(estimatedPsa9.toFixed(2)) : null),
        psa10: psaPrices.psa10 || (nearMintPrice ? parseFloat(estimatedPsa10.toFixed(2)) : null),
        priceMultiple: null,
        lastUpdated: new Date().toISOString(),
      },
      population: {
        total: psaPopulation.total,
        psa10: psaPopulation.psa10,
        psa9: psaPopulation.psa9,
        psa8: psaPopulation.psa8,
        psa10Rate: null,
        lastUpdated: new Date().toISOString(),
      },
    };
    
    // Calculate derived values
    if (cardData.population.psa10 != null && cardData.population.total != null) {
      cardData.population.psa10Rate = parseFloat(
        ((cardData.population.psa10 / cardData.population.total) * 100).toFixed(2)
      );
    }
    
    if (cardData.pricing.psa10 != null && cardData.pricing.nearMint != null) {
      cardData.pricing.priceMultiple = parseFloat(
        (cardData.pricing.psa10 / cardData.pricing.nearMint).toFixed(1)
      );
    }
    
    // Cache the result
    setCache(cacheKey, cardData);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardData),
    };
    
  } catch (error) {
    console.error('Error fetching card data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
