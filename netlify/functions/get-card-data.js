// Netlify serverless function to fetch card data from multiple sources
// - PokémonTCG.io for card info and NM prices
// - PokemonPriceTracker for PSA 9/10 prices

const POKEMON_TCG_API = 'https://api.pokemontcg.io/v2';
const PRICE_TRACKER_API = 'https://www.pokemonpricetracker.com/api';

// Simple in-memory cache (resets on cold starts)
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const getCacheKey = (name, set) => `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${set.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

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

// ============================================
// POKEMON TCG API - Card info and NM prices
// ============================================
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
  
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['X-Api-Key'] = apiKey;
  }
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    console.error(`PokémonTCG API error: ${response.status}`);
    return null;
  }
  
  const data = await response.json();
  
  if (!data.data || data.data.length === 0) {
    return null;
  }
  
  return data.data[0];
};

// ============================================
// POKEMON PRICE TRACKER API - PSA prices
// ============================================
const getPSAPricesFromTracker = async (cardId, name, set) => {
  const apiKey = process.env.POKEMON_PRICE_TRACKER_API_KEY;
  
  // If no API key, return null (will use estimates)
  if (!apiKey) {
    console.log('No PokemonPriceTracker API key, using estimates');
    return { psa9: null, psa10: null };
  }
  
  try {
    // Try to get graded prices using card ID
    const url = `${PRICE_TRACKER_API}/prices?id=${cardId}&includeGraded=true`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`PriceTracker API error: ${response.status}`);
      return { psa9: null, psa10: null };
    }
    
    const data = await response.json();
    
    // Extract PSA prices from response
    if (data && data.graded) {
      return {
        psa9: data.graded.psa9 || null,
        psa10: data.graded.psa10 || null,
        psa8: data.graded.psa8 || null
      };
    }
    
    return { psa9: null, psa10: null };
  } catch (error) {
    console.error('Error fetching PSA prices:', error);
    return { psa9: null, psa10: null };
  }
};

// ============================================
// MAIN HANDLER
// ============================================
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
    
    // 1. Fetch from PokémonTCG.io (card info + NM price)
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
      nearMintPrice = prices.holofoil?.market || 
                      prices.reverseHolofoil?.market ||
                      prices.normal?.market ||
                      prices['1stEditionHolofoil']?.market ||
                      prices['1stEditionNormal']?.market ||
                      null;
    }
    
    // 2. Fetch PSA prices from PokemonPriceTracker
    const psaPrices = await getPSAPricesFromTracker(tcgCard.id, name, set);
    
    // 3. Calculate estimated PSA prices if not available from API
    let psa9Price = psaPrices.psa9;
    let psa10Price = psaPrices.psa10;
    
    // Estimate PSA prices based on typical multipliers if not available
    if (nearMintPrice && !psa9Price) {
      // Typical PSA 9 is 2-4x NM price
      psa9Price = parseFloat((nearMintPrice * (2.5 + Math.random() * 1.5)).toFixed(2));
    }
    
    if (nearMintPrice && !psa10Price) {
      // Typical PSA 10 is 1.5-4x PSA 9 price
      const basePsa9 = psa9Price || nearMintPrice * 3;
      psa10Price = parseFloat((basePsa9 * (1.5 + Math.random() * 2.5)).toFixed(2));
    }
    
    // 4. Build response (population data will be entered manually)
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
        psa9: psa9Price,
        psa10: psa10Price,
        priceMultiple: null,
        lastUpdated: new Date().toISOString(),
        // Flag to indicate if prices are real or estimated
        psa9Source: psaPrices.psa9 ? 'api' : 'estimated',
        psa10Source: psaPrices.psa10 ? 'api' : 'estimated',
      },
      population: {
        total: null,
        psa10: null,
        psa9: null,
        psa8: null,
        psa10Rate: null,
        lastUpdated: null,
        source: null,
      },
    };
    
    // 5. Calculate price multiple
    if (cardData.pricing.psa10 != null && cardData.pricing.nearMint != null && cardData.pricing.nearMint > 0) {
      cardData.pricing.priceMultiple = parseFloat(
        (cardData.pricing.psa10 / cardData.pricing.nearMint).toFixed(1)
      );
    }
    
    // 6. Cache the result
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
