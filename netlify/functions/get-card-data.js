// Netlify serverless function to fetch card data
// Uses PokémonPriceTracker API - faster, has real PSA prices from eBay sales

const PRICE_TRACKER_API = 'https://www.pokemonpricetracker.com/api/v2';
const PSA_API = 'https://www.pokemonpricetracker.com/api/psa';

// ============================================
// CARD NUMBER CLEANING
// ============================================
const cleanCardNumber = (number) => {
  if (!number) return null;
  
  let cleaned = number.toString().trim();
  cleaned = cleaned.replace(/^#/, '');
  
  if (cleaned.includes('/')) {
    cleaned = cleaned.split('/')[0];
  }
  
  // Keep alphanumeric prefixes like TG, GG, SV
  // But strip leading zeros from pure numbers
  if (/^\d+$/.test(cleaned)) {
    cleaned = parseInt(cleaned, 10).toString();
  }
  
  return cleaned || null;
};

// ============================================
// CLEAN CARD NAME - Remove variant descriptions
// ============================================
const cleanCardName = (name) => {
  if (!name) return '';
  
  // Remove common variant suffixes in parentheses
  let cleaned = name
    .replace(/\s*\(Alternate Full Art\)/gi, '')
    .replace(/\s*\(Full Art\)/gi, '')
    .replace(/\s*\(Secret\)/gi, '')
    .replace(/\s*\(Alternate Art Secret\)/gi, '')
    .replace(/\s*\(Secert\)/gi, '') // typo variant
    .replace(/\s*\(Secret Rare\)/gi, '')
    .replace(/\s*\(Promo\)/gi, '')
    .replace(/\s*-.*Sales history.*$/gi, '') // Remove notes like "- Sales history is sketch"
    .trim();
  
  return cleaned;
};

// ============================================
// FETCH PSA POPULATION DATA
// Endpoint: GET /api/v2/population?tcgPlayerId={id}
// REQUIRES BUSINESS TIER ($99/mo) - disabled to save API calls
// ============================================
const fetchPopulation = async (tcgPlayerId) => {
  // Population data requires Business subscription ($99/mo)
  // Returning null to avoid wasting API calls on 403 errors
  return null;
};

// ============================================
// GET BEST IMAGE URL
// API provides multiple sizes: imageCdnUrl200, imageCdnUrl400, imageCdnUrl800
// ============================================
const getBestImageUrl = (card) => {
  // Prefer highest resolution available
  return card.imageCdnUrl800 
    || card.imageCdnUrl400 
    || card.imageCdnUrl200 
    || card.imageCdnUrl
    || card.imageUrl 
    || card.image 
    || card.images?.large 
    || card.images?.small 
    || '';
};

// ============================================
// SEARCH BY PRICETRACKER ID (most reliable)
// ============================================
const searchByPriceTrackerId = async (priceTrackerId) => {
  const apiKey = process.env.POKEMON_PRICE_TRACKER_API_KEY;
  
  if (!apiKey || !priceTrackerId) {
    return null;
  }
  
  // Use tcgPlayerId with includeBoth for full data
  const url = `${PRICE_TRACKER_API}/cards?tcgPlayerId=${priceTrackerId}&includeBoth=true`;
  
  console.log(`Searching by TCGPlayer ID: ${priceTrackerId}`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`PriceTracker API error: ${response.status} - ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`Response data keys: ${Object.keys(data)}`);
    console.log(`Data.data length: ${data.data?.length || 0}`);
    
    if (!data.data || data.data.length === 0) {
      console.log(`No results for ID: ${priceTrackerId}`);
      return null;
    }
    
    console.log(`✓ Found by ID: "${data.data[0].name}"`);
    console.log(`  All fields: ${JSON.stringify(Object.keys(data.data[0]))}`);
    console.log(`  tcgPlayerId: ${data.data[0].tcgPlayerId}`);
    console.log(`  Image fields: image=${data.data[0].image}, imageUrl=${data.data[0].imageUrl}, images=${JSON.stringify(data.data[0].images)}`);
    return data.data[0];
    
  } catch (error) {
    console.error(`Search by ID error: ${error.message}`);
    return null;
  }
};

// ============================================
// POKEMON PRICE TRACKER API SEARCH
// ============================================
const searchPriceTracker = async (name, set, number) => {
  const apiKey = process.env.POKEMON_PRICE_TRACKER_API_KEY;
  
  if (!apiKey) {
    console.error('POKEMON_PRICE_TRACKER_API_KEY not set');
    return null;
  }
  
  // Clean the card name
  const cleanedName = cleanCardName(name);
  const cleanedNumber = cleanCardNumber(number);
  
  // Build search query - use card name and set
  let searchQuery = cleanedName;
  
  // Build URL with search params
  const params = new URLSearchParams({
    search: searchQuery,
    limit: '10',
  });
  
  // Add set name if provided
  if (set) {
    params.append('setName', set);
  }
  
  const url = `${PRICE_TRACKER_API}/cards?${params.toString()}`;
  
  console.log(`Searching PriceTracker: "${cleanedName}" in "${set}" #${cleanedNumber}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`PriceTracker API error: ${response.status}`);
      const text = await response.text();
      console.error('Response:', text);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      console.log(`No results for "${cleanedName}" in "${set}"`);
      return null;
    }
    
    // If we have a card number, try to match it
    if (cleanedNumber) {
      const exactMatch = data.data.find(card => {
        const cardNum = cleanCardNumber(card.number);
        return cardNum === cleanedNumber;
      });
      
      if (exactMatch) {
        console.log(`✓ Found exact match: "${exactMatch.name}" #${exactMatch.number}`);
        console.log(`  All fields: ${JSON.stringify(Object.keys(exactMatch))}`);
        console.log(`  tcgPlayerId: ${exactMatch.tcgPlayerId}`);
        console.log(`  Image fields: image=${exactMatch.image}, imageUrl=${exactMatch.imageUrl}, images=${JSON.stringify(exactMatch.images)}`);
        return exactMatch;
      }
    }
    
    // Return first result if no exact number match
    console.log(`✓ Found: "${data.data[0].name}" (first result)`);
    console.log(`  All fields: ${JSON.stringify(Object.keys(data.data[0]))}`);
    console.log(`  tcgPlayerId: ${data.data[0].tcgPlayerId}`);
    console.log(`  Image fields: image=${data.data[0].image}, imageUrl=${data.data[0].imageUrl}, images=${JSON.stringify(data.data[0].images)}`);
    return data.data[0];
    
  } catch (error) {
    console.error(`Search error: ${error.message}`);
    return null;
  }
};

// ============================================
// FALLBACK: Try without set name
// ============================================
const searchWithFallback = async (name, set, number) => {
  // Try with set name first
  let result = await searchPriceTracker(name, set, number);
  if (result) return result;
  
  // Fallback: search without set name
  console.log(`Fallback: searching without set name`);
  result = await searchPriceTracker(name, null, number);
  if (result) return result;
  
  return null;
};

// ============================================
// MAIN HANDLER
// ============================================
export const handler = async (event) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
  
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  try {
    const { name, set, number, priceTrackerId } = JSON.parse(event.body);
    
    if (!name || !set) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Name and set are required' }),
      };
    }
    
    console.log(`\n=== Processing: "${name}" | "${set}" | "${number}" | ID: ${priceTrackerId || 'none'} ===`);
    
    // If PriceTracker ID provided, use it directly (most reliable)
    let card = null;
    if (priceTrackerId) {
      card = await searchByPriceTrackerId(priceTrackerId);
    }
    
    // Fall back to name/set search if no ID or ID not found
    if (!card) {
      card = await searchWithFallback(name, set, number);
    }
    
    if (!card) {
      console.log(`✗ Not found: "${name}"`);
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
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
          },
          notFound: true,
        }),
      };
    }
    
    // Extract prices from PriceTracker response
    const nearMintPrice = card.prices?.market || card.prices?.mid || null;
    
    // Extract real PSA prices from eBay data (only use real data, no estimates)
    const psa9Price = card.ebay?.psa9?.avg || card.ebay?.psa9?.lastSold || null;
    const psa10Price = card.ebay?.psa10?.avg || card.ebay?.psa10?.lastSold || null;
    
    // Calculate price multiple only if we have real PSA 10 price
    let priceMultiple = null;
    if (psa10Price && nearMintPrice && nearMintPrice > 0) {
      priceMultiple = parseFloat((psa10Price / nearMintPrice).toFixed(1));
    }
    
    // Get card IDs - we need tcgPlayerId for population lookup
    const cardId = card.id || null;
    const tcgPlayerId = card.tcgPlayerId || card.tcgplayerId || card.tcgplayer_id || null;
    
    console.log(`Card IDs - id: ${cardId}, tcgPlayerId: ${tcgPlayerId}`);
    
    // Try to get population data from card response first, then fetch separately if needed
    let populationData = {
      total: card.population?.total || card.population?.totalPopulation || null,
      psa10: card.population?.psa10 || card.population?.g10 || null,
      psa9: card.population?.psa9 || card.population?.g9 || null,
      psa8: card.population?.psa8 || card.population?.g8 || null,
      psa10Rate: card.population?.psa10Rate || card.population?.gemRate || null,
    };
    
    // If no population in card response, try fetching from population endpoint using tcgPlayerId
    if (!populationData.total && tcgPlayerId) {
      const fetchedPop = await fetchPopulation(tcgPlayerId);
      if (fetchedPop) {
        populationData = fetchedPop;
      }
    }
    
    // Calculate PSA 10 rate if we have the data but not the rate
    let psa10Rate = populationData.psa10Rate;
    if (!psa10Rate && populationData.total && populationData.psa10 && populationData.total > 0) {
      psa10Rate = parseFloat(((populationData.psa10 / populationData.total) * 100).toFixed(2));
    }
    
    const cardData = {
      id: cardId,
      tcgPlayerId: tcgPlayerId,
      name: card.name,
      set: card.setName || card.set || set,
      number: card.number || cleanCardNumber(number) || '',
      rarity: card.rarity || '',
      imageUrl: getBestImageUrl(card),
      tcgplayerUrl: card.tcgplayerUrl || card.url || card.tcgPlayerUrl || '',
      pricing: {
        nearMint: nearMintPrice,
        psa9: psa9Price,
        psa10: psa10Price,
        priceMultiple: priceMultiple,
        lastUpdated: new Date().toISOString(),
        psa9Source: psa9Price ? 'ebay' : null,
        psa10Source: psa10Price ? 'ebay' : null,
      },
      population: {
        total: populationData.total,
        psa10: populationData.psa10,
        psa9: populationData.psa9,
        psa8: populationData.psa8,
        psa10Rate: psa10Rate,
      },
      notFound: false,
    };
    
    console.log(`✓ Done: "${cardData.name}" | NM: $${nearMintPrice} | PSA10: $${psa10Price || 'N/A'} | Pop: ${populationData.total || 'N/A'}`);
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(cardData),
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
