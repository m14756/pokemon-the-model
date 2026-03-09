// Netlify serverless function to fetch card data from PokemonPriceTracker API
// Free tier: NM prices only
// Standard tier ($9.99/mo): NM + PSA 9/10 prices from eBay

const PRICE_TRACKER_API = 'https://www.pokemonpricetracker.com/api/v2';

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

// Helper to get best image URL from response
const getBestImageUrl = (card) => {
  return card.imageCdnUrl800 || 
         card.imageCdnUrl400 || 
         card.imageCdnUrl200 || 
         card.imageUrl || 
         null;
};

// ============================================
// POKEMON PRICE TRACKER API
// ============================================
const fetchFromPriceTracker = async (name, set, number) => {
  const apiKey = process.env.POKEMON_PRICE_TRACKER_API_KEY;
  
  if (!apiKey) {
    console.error('No PokemonPriceTracker API key configured');
    return null;
  }
  
  try {
    // Build query params
    const params = new URLSearchParams({
      name: name,
      set: set,
      includeEbay: 'true', // Request PSA prices (requires Standard tier)
    });
    
    if (number) {
      params.append('number', number.split('/')[0]);
    }
    
    const url = `${PRICE_TRACKER_API}/cards?${params.toString()}`;
    console.log('Fetching from PriceTracker:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`PriceTracker API error: ${response.status}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return null;
    }
    
    const data = await response.json();
    console.log('PriceTracker response:', JSON.stringify(data, null, 2));
    
    // Handle response - could be single card or array
    if (data.data) {
      return Array.isArray(data.data) ? data.data[0] : data.data;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching from PriceTracker:', error);
    return null;
  }
};

// ============================================
// MAIN HANDLER
// ============================================
exports.handler = async (event) => {
  // Allow GET for testing, POST for actual use
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  try {
    let name, set, number, priceTrackerId;
    
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      name = body.name;
      set = body.set;
      number = body.number;
      priceTrackerId = body.priceTrackerId;
    } else {
      // GET request - parse query params
      name = event.queryStringParameters?.name;
      set = event.queryStringParameters?.set;
      number = event.queryStringParameters?.number;
    }
    
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
      console.log('Returning cached data for:', name);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cached),
      };
    }
    
    // Fetch from PokemonPriceTracker
    const card = await fetchFromPriceTracker(name, set, number);
    
    if (!card) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Card not found', name, set }),
      };
    }
    
    // Extract pricing data
    const nearMintPrice = card.prices?.market || 
                          card.prices?.mid || 
                          card.price || 
                          null;
    
    // PSA prices from eBay data (requires Standard tier)
    // Returns null if not available (free tier or no sales data)
    const psa9Price = card.ebay?.psa9?.avg || 
                      card.ebay?.psa9?.lastSold || 
                      null;
    
    const psa10Price = card.ebay?.psa10?.avg || 
                       card.ebay?.psa10?.lastSold || 
                       null;
    
    // Build response
    const cardData = {
      id: card.id || card.tcgPlayerId || null,
      priceTrackerId: card.id || null,
      tcgPlayerId: card.tcgPlayerId || null,
      name: card.name || name,
      set: card.setName || card.set || set,
      number: card.number || number || '',
      rarity: card.rarity || '',
      imageUrl: getBestImageUrl(card),
      tcgplayerUrl: card.tcgplayerUrl || card.url || '',
      pricing: {
        nearMint: nearMintPrice,
        psa9: psa9Price,
        psa10: psa10Price,
        priceMultiple: null, // Calculated below
        lastUpdated: new Date().toISOString(),
        // Track data source
        nmSource: nearMintPrice ? 'api' : null,
        psa9Source: psa9Price ? 'api' : null,
        psa10Source: psa10Price ? 'api' : null,
      },
      // Population data - manual entry only (requires Business tier or manual lookup)
      population: {
        total: null,
        psa10: null,
        psa9: null,
        psa8: null,
        psa10Rate: null, // This is the "gem rate"
        lastUpdated: null,
        source: 'manual', // Always manual for now
      },
    };
    
    // Calculate price multiple (PSA 10 / NM)
    if (cardData.pricing.psa10 && cardData.pricing.nearMint && cardData.pricing.nearMint > 0) {
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
    console.error('Error in get-card-data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
