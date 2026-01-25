// Client-side card data fetcher
// Calls PokémonTCG.io API directly from the browser - no timeout limits!

const POKEMON_TCG_API = 'https://api.pokemontcg.io/v2';

// Your API key - it's okay to expose this, it's free and just for rate limits
const API_KEY = import.meta.env.VITE_POKEMON_TCG_API_KEY || '';

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
// POKEMON TCG API SEARCH
// ============================================
const searchPokemonTCG = async (name, number) => {
  // Build search query
  let query = `name:"${name}"`;
  if (number) {
    query += ` number:"${number}"`;
  }
  
  const url = `${POKEMON_TCG_API}/cards?q=${encodeURIComponent(query)}&pageSize=1`;
  
  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) {
    headers['X-Api-Key'] = API_KEY;
  }
  
  try {
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
  } catch (error) {
    console.error(`Search error for ${name}:`, error.message);
    return null;
  }
};

// ============================================
// SEARCH WITH FALLBACK
// ============================================
const searchWithFallback = async (name, number) => {
  const cleanedNumber = cleanCardNumber(number);
  
  // Attempt 1: Name + Number
  if (cleanedNumber) {
    console.log(`Searching: "${name}" + number:"${cleanedNumber}"`);
    const result = await searchPokemonTCG(name, cleanedNumber);
    if (result) {
      console.log(`✓ Found "${name}" with number`);
      return result;
    }
  }
  
  // Attempt 2: Name only
  console.log(`Searching: "${name}" only`);
  const result = await searchPokemonTCG(name, null);
  if (result) {
    console.log(`✓ Found "${name}" by name only`);
    return result;
  }
  
  console.log(`✗ Not found: "${name}"`);
  return null;
};

// ============================================
// FETCH SINGLE CARD DATA
// ============================================
export const fetchCardData = async (name, set, number) => {
  const tcgCard = await searchWithFallback(name, number);
  
  if (!tcgCard) {
    // Return not-found placeholder
    return {
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
  }
  
  // Extract Near Mint price
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
  
  // Estimate PSA prices based on NM price
  let psa9Price = null;
  let psa10Price = null;
  
  if (nearMintPrice) {
    psa9Price = parseFloat((nearMintPrice * 3).toFixed(2));
    psa10Price = parseFloat((psa9Price * 2.5).toFixed(2));
  }
  
  return {
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
      priceMultiple: nearMintPrice && psa10Price ? parseFloat((psa10Price / nearMintPrice).toFixed(1)) : null,
      lastUpdated: new Date().toISOString(),
      psa9Source: 'estimated',
      psa10Source: 'estimated',
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
    notFound: false,
  };
};

// ============================================
// PROCESS MULTIPLE CARDS WITH PROGRESS
// ============================================
export const processCards = async (cards, onProgress) => {
  const results = [];
  const total = cards.length;
  
  for (let i = 0; i < total; i++) {
    const card = cards[i];
    
    try {
      const cardData = await fetchCardData(card.name, card.set, card.number);
      results.push({
        ...card,
        ...cardData,
        status: cardData.notFound ? 'not_found' : 'complete',
      });
    } catch (error) {
      console.error(`Error processing ${card.name}:`, error);
      results.push({
        ...card,
        status: 'error',
        error: error.message,
      });
    }
    
    // Report progress
    if (onProgress) {
      const percent = Math.round(((i + 1) / total) * 100);
      onProgress(percent, i + 1, total, card.name);
    }
    
    // Small delay to avoid rate limiting (100ms between requests)
    if (i < total - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
};
