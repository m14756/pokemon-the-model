// Netlify serverless function to fetch card data from multiple sources
// - PokémonTCG.io for card info, images, and NM prices (FREE)
// - PokemonPriceTracker for PSA 9/10 prices (Standard tier $9.99/mo)

const POKEMON_TCG_API = 'https://api.pokemontcg.io/v2';
const PRICE_TRACKER_API = 'https://www.pokemonpricetracker.com/api/v2';

// Simple in-memory cache (resets on cold starts)
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const getCacheKey = (name, set, number) => {
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanSet = set.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanNum = (number || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleanName}-${cleanSet}-${cleanNum}`;
};

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
// POKEMON TCG API - Card info, images, NM prices
// ============================================
const searchPokemonTCG = async (name, set, number) => {
  const apiKey = process.env.POKEMON_TCG_API_KEY;
  
  // Build search query
  let query = `name:"${name}"`;
  if (set) {
    query += ` set.name:"${set}"`;
  }
  if (number) {
    // Handle TG numbers and regular numbers
    const cleanNumber = number.replace(/^TG/i, '').split('/')[0];
    query += ` number:"${number.split('/')[0]}"`;
  }
  
  const url = `${POKEMON_TCG_API}/cards?q=${encodeURIComponent(query)}&pageSize=10`;
  console.log('Searching PokémonTCG.io:', url);
  
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
    console.log('No results from PokémonTCG.io');
    return null;
  }
  
  console.log(`Found ${data.data.length} results from PokémonTCG.io`);
  
  // If we have a number, try to find exact match
  if (number && data.data.length > 1) {
    const exactMatch = data.data.find(card => 
      card.number.toLowerCase() === number.toLowerCase().split('/')[0]
    );
    if (exactMatch) {
      console.log(`Found exact number match: ${exactMatch.number}`);
      return exactMatch;
    }
  }
  
  return data.data[0];
};

// ============================================
// POKEMON PRICE TRACKER API - PSA prices
// ============================================
const getPSAPricesFromTracker = async (name, set, number) => {
  const apiKey = process.env.POKEMON_PRICE_TRACKER_API_KEY;
  
  // If no API key, return null
  if (!apiKey) {
    console.log('No PokemonPriceTracker API key configured');
    return { psa9: null, psa10: null, nmPrice: null };
  }
  
  try {
    // First try: Standard search with name, set, number
    const params = new URLSearchParams({
      name: name,
      set: set,
      includeEbay: 'true', // Request PSA prices (requires Standard tier)
    });
    
    // Add number if available for better matching
    if (number) {
      params.append('number', number.split('/')[0]);
    }
    
    const url = `${PRICE_TRACKER_API}/cards?${params.toString()}`;
    console.log('Fetching PSA prices from PriceTracker:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('PriceTracker response cards:', data.data?.length || 0);
      
      // Log first card's ebay data to debug
      if (data.data && data.data.length > 0) {
        console.log('First card ebay data:', JSON.stringify(data.data[0].ebay || 'no ebay field'));
      }
      
      if (data.data && data.data.length > 0) {
        // Try to find exact number match if multiple results
        let card = data.data[0];
        if (number && data.data.length > 1) {
          const cleanNumber = number.split('/')[0].toLowerCase();
          const exactMatch = data.data.find(c => 
            c.number && c.number.toLowerCase() === cleanNumber
          );
          if (exactMatch) {
            console.log(`Found exact PriceTracker match: ${exactMatch.number}`);
            card = exactMatch;
          }
        }
        
        return extractPriceTrackerData(card);
      }
    }
    
    // Second try: Parse Title API (fuzzy matching fallback)
    console.log('Standard search failed, trying Parse Title API...');
    console.log('PriceTracker response status:', response.status);
    const errorText = await response.text().catch(() => 'Could not read response');
    console.log('PriceTracker error response:', errorText.substring(0, 200));
    
    const parseResult = await tryParseTitleAPI(apiKey, name, set, number);
    if (parseResult) {
      return parseResult;
    }
    
    return { psa9: null, psa10: null, nmPrice: null };
  } catch (error) {
    console.error('Error fetching PSA prices:', error);
    return { psa9: null, psa10: null, nmPrice: null };
  }
};

// Extract pricing data from a PriceTracker card object
const extractPriceTrackerData = (card) => {
  return {
    psa9: card.ebay?.psa9?.avg || card.ebay?.psa9?.lastSold || null,
    psa10: card.ebay?.psa10?.avg || card.ebay?.psa10?.lastSold || null,
    nmPrice: card.prices?.market || card.prices?.mid || card.price || null,
    priceTrackerId: card.id || card.tcgPlayerId || null,
  };
};

// Fallback: Use Parse Title API for fuzzy matching
const tryParseTitleAPI = async (apiKey, name, set, number) => {
  try {
    // Build a title string like eBay listing
    let title = name;
    if (set) title += ` ${set}`;
    if (number) title += ` #${number}`;
    
    console.log('Parse Title API query:', title);
    
    const response = await fetch(`${PRICE_TRACKER_API}/parse-title`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: title,
        options: {
          includeEbay: true,
          maxSuggestions: 3
        }
      })
    });
    
    if (!response.ok) {
      console.log('Parse Title API failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    console.log('Parse Title response:', JSON.stringify(data, null, 2));
    
    // Check for matches
    if (data.matches && data.matches.length > 0) {
      const bestMatch = data.matches[0];
      const confidence = bestMatch.confidence || 0;
      
      // Only use if confidence is reasonable (> 70%)
      if (confidence >= 0.7) {
        console.log(`Parse Title matched: ${bestMatch.card?.name} (${(confidence * 100).toFixed(0)}% confidence)`);
        return extractPriceTrackerData(bestMatch.card);
      } else {
        console.log(`Parse Title low confidence: ${(confidence * 100).toFixed(0)}%`);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Parse Title API error:', error);
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
    let name, set, number;
    
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      name = body.name;
      set = body.set;
      number = body.number;
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
    
    // Check cache first (now includes number in cache key)
    const cacheKey = getCacheKey(name, set, number);
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log('Returning cached data for:', name, number);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cached),
      };
    }
    
    // 1. Fetch from PokémonTCG.io (card info + NM price + image)
    const tcgCard = await searchPokemonTCG(name, set, number);
    
    if (!tcgCard) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Card not found', name, set, number }),
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
    
    // 2. Fetch PSA prices from PokemonPriceTracker (pass number for exact match)
    const priceTrackerData = await getPSAPricesFromTracker(name, set, tcgCard.number || number);
    
    // Use PriceTracker NM price as fallback if TCG.io didn't have one
    if (!nearMintPrice && priceTrackerData.nmPrice) {
      nearMintPrice = priceTrackerData.nmPrice;
      console.log('Using PriceTracker NM price as fallback:', nearMintPrice);
    }
    
    // 3. Build response
    const cardData = {
      id: tcgCard.id,
      priceTrackerId: priceTrackerData.priceTrackerId || null,
      name: tcgCard.name,
      set: tcgCard.set?.name || set,
      number: tcgCard.number || number || '',
      rarity: tcgCard.rarity || '',
      imageUrl: tcgCard.images?.large || tcgCard.images?.small || '',
      tcgplayerUrl: tcgCard.tcgplayer?.url || '',
      pricing: {
        nearMint: nearMintPrice,
        psa9: priceTrackerData.psa9,
        psa10: priceTrackerData.psa10,
        priceMultiple: null,
        lastUpdated: new Date().toISOString(),
        // Track data source
        nmSource: nearMintPrice ? 'api' : null,
        psa9Source: priceTrackerData.psa9 ? 'api' : null,
        psa10Source: priceTrackerData.psa10 ? 'api' : null,
      },
      population: {
        total: null,
        psa10: null,
        psa9: null,
        psa8: null,
        psa10Rate: null,
        lastUpdated: null,
        source: 'manual',
      },
    };
    
    // 4. Calculate price multiple (only if we have both prices)
    if (cardData.pricing.psa10 && cardData.pricing.nearMint && cardData.pricing.nearMint > 0) {
      cardData.pricing.priceMultiple = parseFloat(
        (cardData.pricing.psa10 / cardData.pricing.nearMint).toFixed(1)
      );
    }
    
    // 5. Cache the result
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
