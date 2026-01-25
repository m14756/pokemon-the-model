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
// CARD NUMBER CLEANING
// ============================================
const cleanCardNumber = (number) => {
  if (!number) return null;
  
  let cleaned = number.toString().trim();
  
  // Remove # symbol
  cleaned = cleaned.replace(/^#/, '');
  
  // Take part before slash (e.g., "76/108" -> "76", "GG67/GG70" -> "GG67")
  if (cleaned.includes('/')) {
    cleaned = cleaned.split('/')[0];
  }
  
  // Strip leading zeros ONLY if purely numeric (not "GG67", "TG20", "SWSH062")
  if (/^\d+$/.test(cleaned)) {
    cleaned = parseInt(cleaned, 10).toString();
  }
  
  return cleaned || null;
};

// ============================================
// SET NAME CLEANING
// ============================================
const getSetVariations = (set) => {
  if (!set) return [];
  
  const variations = [set];
  
  // If set has a colon, also try the base set (e.g., "Celebrations: Classic Collection" -> "Celebrations")
  if (set.includes(':')) {
    variations.push(set.split(':')[0].trim());
  }
  
  // If set has "Gallery" or "Galarian Gallery", also try without it
  if (set.toLowerCase().includes('gallery')) {
    variations.push(set.replace(/\s*(galarian\s+)?gallery/i, '').trim());
  }
  
  // Handle common set name variations
  const setMappings = {
    '151': ['151', 'Pokémon TCG: 151', 'Pokemon TCG: 151', 'Scarlet & Violet—151', 'Scarlet & Violet-151'],
    'scarlet & violet': ['Scarlet & Violet', 'Scarlet and Violet'],
    'sword & shield': ['Sword & Shield', 'Sword and Shield'],
    'pokémon go': ['Pokémon GO', 'Pokemon GO', 'Pokemon Go'],
    'pokemon go': ['Pokémon GO', 'Pokemon GO', 'Pokemon Go'],
    'svp black star promos': ['SVP Black Star Promos', 'Scarlet & Violet Black Star Promos', 'SV Black Star Promos', 'SVP Promos'],
    'champion\'s path': ['Champion\'s Path', 'Champions Path'],
    'celebrations': ['Celebrations', 'Celebrations: Classic Collection'],
    'crown zenith': ['Crown Zenith', 'Crown Zenith Galarian Gallery'],
    'destined rivals': ['Destined Rivals'],
    'surging sparks': ['Surging Sparks'],
    'stellar crown': ['Stellar Crown'],
    'twilight masquerade': ['Twilight Masquerade'],
    'temporal forces': ['Temporal Forces'],
    'paradox rift': ['Paradox Rift'],
    'paldea evolved': ['Paldea Evolved'],
    'paldean fates': ['Paldean Fates'],
    'shrouded fable': ['Shrouded Fable'],
    'prismatic evolutions': ['Prismatic Evolutions'],
  };
  
  const lowerSet = set.toLowerCase();
  if (setMappings[lowerSet]) {
    variations.push(...setMappings[lowerSet]);
  }
  
  // Also try with "Base" removed if present
  if (set.toLowerCase().includes('base')) {
    variations.push(set.replace(/\s*base\s*/i, ' ').trim());
  }
  
  // Try adding/removing "Pokémon TCG:" prefix
  if (!set.toLowerCase().startsWith('pokémon tcg') && !set.toLowerCase().startsWith('pokemon tcg')) {
    variations.push(`Pokémon TCG: ${set}`);
  }
  
  return [...new Set(variations)]; // Remove duplicates
};

// ============================================
// POKEMON TCG API - Card info and NM prices
// ============================================
const searchPokemonTCG = async (name, set, number, timeout = 5000) => {
  const apiKey = process.env.POKEMON_TCG_API_KEY;
  
  // Build search query
  let query = `name:"${name}"`;
  if (set) {
    query += ` set.name:"${set}"`;
  }
  if (number) {
    query += ` number:"${number}"`;
  }
  
  const url = `${POKEMON_TCG_API}/cards?q=${encodeURIComponent(query)}&pageSize=5`;
  
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['X-Api-Key'] = apiKey;
  }
  
  // Add timeout using AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`PokémonTCG API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return null;
    }
    
    return data.data[0];
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.log(`Search timed out for: ${name}`);
    }
    return null;
  }
};

// ============================================
// FALLBACK SEARCH STRATEGY
// ============================================
const searchWithFallback = async (name, set, number) => {
  const cleanedNumber = cleanCardNumber(number);
  const setVariations = getSetVariations(set);
  
  // Attempt 1: Name + Set + Number (most precise)
  if (cleanedNumber && set) {
    console.log(`Attempt 1: "${name}" + "${set}" + "${cleanedNumber}"`);
    const result = await searchPokemonTCG(name, set, cleanedNumber);
    if (result) {
      console.log(`✓ Found "${name}" on attempt 1 (name+set+number)`);
      return result;
    }
  }
  
  // Attempt 2: Name + Set variations (no number)
  for (const setVariation of setVariations) {
    console.log(`Attempt 2: "${name}" + "${setVariation}" (no number)`);
    const result = await searchPokemonTCG(name, setVariation, null);
    if (result) {
      console.log(`✓ Found "${name}" on attempt 2 (name+set: "${setVariation}")`);
      return result;
    }
  }
  
  // Attempt 3: Name + Number only (no set) - for when set name doesn't match
  if (cleanedNumber) {
    console.log(`Attempt 3: "${name}" + number "${cleanedNumber}" (no set)`);
    const result = await searchPokemonTCG(name, null, cleanedNumber);
    if (result) {
      console.log(`✓ Found "${name}" on attempt 3 (name+number only)`);
      return result;
    }
  }
  
  // Attempt 4: Name only (last resort)
  console.log(`Attempt 4: "${name}" only`);
  const result = await searchPokemonTCG(name, null, null);
  if (result) {
    console.log(`✓ Found "${name}" on attempt 4 (name only)`);
    return result;
  }
  
  console.log(`✗ All attempts failed for "${name}"`);
  return null;
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
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
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
    if (error.name === 'AbortError') {
      console.log('PriceTracker API timed out');
    } else {
      console.error('Error fetching PSA prices:', error);
    }
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
      console.log(`Cache hit for "${name}"`);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cached),
      };
    }
    
    // 1. Search with fallback strategy
    console.log(`\n=== Searching for: "${name}" | "${set}" | "${number}" ===`);
    const tcgCard = await searchWithFallback(name, set, number);
    
    if (!tcgCard) {
      console.log(`Card not found: "${name}" - returning partial data`);
      // Return partial data so the card still gets saved with "not found" status
      const notFoundData = {
        id: null,
        name: name,
        set: set,
        number: cleanCardNumber(number) || '',
        rarity: '',
        imageUrl: '',
        tcgplayerUrl: '',
        pricing: {
          nearMint: null,
          psa9: null,
          psa10: null,
          priceMultiple: null,
          lastUpdated: new Date().toISOString(),
          psa9Source: null,
          psa10Source: null,
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
        notFound: true,
      };
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notFoundData),
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
      number: tcgCard.number || cleanCardNumber(number) || '',
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
    
    console.log(`✓ Successfully processed "${cardData.name}" from "${cardData.set}"`);
    
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
