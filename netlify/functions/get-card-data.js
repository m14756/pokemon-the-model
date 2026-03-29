// Netlify serverless function to fetch card data from multiple sources
// - PokémonTCG.io for card info, images, and NM prices (FREE)
// - PokemonPriceTracker for PSA 9/10 prices (Standard tier $9.99/mo)
// Cache cleared: v2 - 2024-03-29

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

// Map set names to PriceTracker's exact set names
// PriceTracker uses different names for subsets (Trainer Gallery, Galarian Gallery, Classic Collection)
const SET_NAME_MAPPINGS = {
  // Galarian Gallery cards are in a separate set
  'crown zenith galarian gallery': 'Crown Zenith: Galarian Gallery',
  'crown zenith: galarian gallery': 'Crown Zenith: Galarian Gallery',
  // Trainer Gallery subsets
  'silver tempest trainer gallery': 'Silver Tempest: Trainer Gallery',
  'lost origin trainer gallery': 'Lost Origin: Trainer Gallery',
  'astral radiance trainer gallery': 'Astral Radiance: Trainer Gallery',
  'brilliant stars trainer gallery': 'Brilliant Stars: Trainer Gallery',
  // Celebrations Classic Collection
  'celebrations classic collection': 'Celebrations: Classic Collection',
  'celebrations: classic collection': 'Celebrations: Classic Collection',
};

// Clean and map set name for PriceTracker
const cleanSetNameForPriceTracker = (setName) => {
  if (!setName) return '';
  
  const lowerSet = setName.toLowerCase().trim();
  
  // Check for exact mapping first
  if (SET_NAME_MAPPINGS[lowerSet]) {
    return SET_NAME_MAPPINGS[lowerSet];
  }
  
  // For subsets, keep the full name (PriceTracker has them as separate sets)
  // e.g., "Crown Zenith Galarian Gallery" should stay as "Crown Zenith: Galarian Gallery"
  if (lowerSet.includes('galarian gallery')) {
    const baseName = setName.replace(/[:\s]*galarian gallery/i, '').trim();
    return `${baseName}: Galarian Gallery`;
  }
  
  if (lowerSet.includes('trainer gallery')) {
    const baseName = setName.replace(/[:\s]*trainer gallery/i, '').trim();
    return `${baseName}: Trainer Gallery`;
  }
  
  if (lowerSet.includes('classic collection')) {
    const baseName = setName.replace(/[:\s]*classic collection/i, '').trim();
    return `${baseName}: Classic Collection`;
  }
  
  // Return original if no special handling needed
  return setName.trim();
};

const getPSAPricesFromTracker = async (name, set, number) => {
  const apiKey = process.env.POKEMON_PRICE_TRACKER_API_KEY;
  
  // If no API key, return null
  if (!apiKey) {
    console.log('No PokemonPriceTracker API key configured');
    return { psa9: null, psa10: null, nmPrice: null };
  }
  
  // Clean up set name for PriceTracker
  const cleanedSet = cleanSetNameForPriceTracker(set);
  
  try {
    // Build search query per API docs:
    // search=charizard base set  (name + set)
    // search=pikachu 4/102       (name + card number)
    // search=umbreon ex unseen forces  (name + set)
    // 
    // Combine: "Glaceon VSTAR Crown Zenith GG40" or "Umbreon VMAX 215/203 Evolving Skies"
    const cleanNumber = number ? number.split('/')[0] : '';
    
    // Format: "CardName SetName CardNumber"
    let searchQuery = name;
    if (cleanedSet) {
      searchQuery += ` ${cleanedSet}`;
    }
    if (cleanNumber) {
      searchQuery += ` ${cleanNumber}`;
    }
    
    const params = new URLSearchParams({
      search: searchQuery,
      includeEbay: 'true', // Include PSA/CGC/BGS sales data
      limit: '10', // We only need the top matches
    });
    
    const url = `${PRICE_TRACKER_API}/cards?${params.toString()}`;
    console.log('Fetching PSA prices from PriceTracker:', url);
    console.log('Search query:', searchQuery);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('PriceTracker response cards:', data.data?.length || 0);
      
      // Log first card to debug
      if (data.data && data.data.length > 0) {
        console.log('First card:', data.data[0].name, 'set:', data.data[0].setName, 'number:', data.data[0].cardNumber || data.data[0].number);
        console.log('First card ebay data:', JSON.stringify(data.data[0].ebay || 'no ebay field'));
      }
      
      if (data.data && data.data.length > 0) {
        // With the precise search query, the first result should be our card
        // But verify by checking card number if provided
        let card = data.data[0];
        
        if (number && data.data.length > 1) {
          const cleanNumber = number.split('/')[0].toLowerCase().replace(/^0+/, '');
          console.log(`Verifying card number: ${cleanNumber}`);
          
          // Find exact number match
          const exactMatch = data.data.find(c => {
            const cardNum = (c.cardNumber || c.number || '').split('/')[0].toLowerCase().replace(/^0+/, '');
            return cardNum === cleanNumber;
          });
          
          if (exactMatch) {
            card = exactMatch;
            console.log(`Verified exact match: ${card.name} #${card.cardNumber || card.number}`);
          } else {
            console.log(`Warning: No exact number match found, using first result`);
          }
        }
        
        console.log(`Using card: ${card.name} #${card.cardNumber || card.number} from ${card.setName}`);
        return extractPriceTrackerData(card);
      }
    } else if (response.status === 429) {
      console.warn('PriceTracker rate limited (429)');
      return { psa9: null, psa10: null, nmPrice: null, rateLimited: true };
    } else {
      console.warn(`PriceTracker search failed: ${response.status}`);
      const errorText = await response.text().catch(() => 'Could not read response');
      console.log('PriceTracker error response:', errorText.substring(0, 200));
    }
    
    // Fallback: Parse Title API (fuzzy matching)
    console.log('Standard search failed, trying Parse Title API...');
    
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
  // PSA prices are in ebay.salesByGrade.psa9/psa10
  const ebayData = card.ebay?.salesByGrade || {};
  
  const psa9Data = ebayData.psa9;
  const psa10Data = ebayData.psa10;
  
  return {
    psa9: psa9Data?.averagePrice || psa9Data?.medianPrice || psa9Data?.smartMarketPrice?.price || null,
    psa10: psa10Data?.averagePrice || psa10Data?.medianPrice || psa10Data?.smartMarketPrice?.price || null,
    nmPrice: card.prices?.market || card.prices?.mid || card.price || null,
    priceTrackerId: card.id || card.tcgPlayerId || null,
  };
};

// Fallback: Use Parse Title API for fuzzy matching
const tryParseTitleAPI = async (apiKey, name, set, number) => {
  try {
    // Clean the set name for better matching
    const cleanedSet = cleanSetNameForPriceTracker(set);
    
    // Build a title string like eBay listing
    let title = name;
    if (cleanedSet) title += ` ${cleanedSet}`;
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
    
    // Check for matches - but be strict about matching
    if (data.data?.matches && data.data.matches.length > 0) {
      // Look for a match where the card name actually matches what we're looking for
      const searchName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      for (const match of data.data.matches) {
        const matchName = (match.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const matchScore = match.matchScore || 0;
        
        // Check if the card name contains our search name (or vice versa)
        const nameMatches = matchName.includes(searchName) || searchName.includes(matchName);
        
        if (nameMatches && matchScore >= 0.5) {
          console.log(`Parse Title matched: ${match.name} (${(matchScore * 100).toFixed(0)}% score)`);
          // The match object has prices directly, not nested in .card
          return {
            psa9: null, // Parse Title doesn't return PSA prices
            psa10: null,
            nmPrice: match.prices?.market || match.prices?.low || null,
            priceTrackerId: match.tcgPlayerId || null,
          };
        }
      }
      
      console.log(`Parse Title: No matching card name found for "${name}"`);
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
    let name, set, number, skipCache;
    
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      name = body.name;
      set = body.set;
      number = body.number;
      skipCache = body.skipCache || false;
    } else {
      // GET request - parse query params
      name = event.queryStringParameters?.name;
      set = event.queryStringParameters?.set;
      number = event.queryStringParameters?.number;
      skipCache = event.queryStringParameters?.skipCache === 'true';
    }
    
    if (!name || !set) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Name and set are required' }),
      };
    }
    
    // Check cache first (unless skipCache is true)
    const cacheKey = getCacheKey(name, set, number);
    if (!skipCache) {
      const cached = getFromCache(cacheKey);
      if (cached) {
        console.log('Returning cached data for:', name, number);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cached),
        };
      }
    } else {
      console.log('Skipping cache for:', name, number);
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
      console.log(`Price multiple calculated: ${cardData.pricing.psa10} / ${cardData.pricing.nearMint} = ${cardData.pricing.priceMultiple}x`);
    } else {
      console.log(`Price multiple NOT calculated - PSA10: ${cardData.pricing.psa10}, NM: ${cardData.pricing.nearMint}`);
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
