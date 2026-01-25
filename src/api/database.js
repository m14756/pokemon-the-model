import { supabase, isSupabaseConfigured } from './supabase';
import { fetchCardData } from './cardService';
import { calculateGradingScore } from '../utils/helpers';

// ============================================
// DATABASE OPERATIONS
// ============================================

/**
 * Fetch all cards from the database
 */
export const getAllCards = async () => {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, returning empty array');
    return [];
  }

  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching cards:', error);
    throw error;
  }

  return data || [];
};

/**
 * Add a single card to the database
 */
export const addCard = async (card) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('cards')
    .insert([card])
    .select()
    .single();

  if (error) {
    console.error('Error adding card:', error);
    throw error;
  }

  return data;
};

/**
 * Add multiple cards to the database
 */
export const addCards = async (cards) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('cards')
    .insert(cards)
    .select();

  if (error) {
    console.error('Error adding cards:', error);
    throw error;
  }

  return data || [];
};

/**
 * Update a card in the database
 */
export const updateCard = async (id, updates) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('cards')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating card:', error);
    throw error;
  }

  return data;
};

/**
 * Delete a card from the database
 */
export const deleteCard = async (id) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting card:', error);
    throw error;
  }

  return true;
};

/**
 * Delete multiple cards from the database
 */
export const deleteCards = async (ids) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabase
    .from('cards')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('Error deleting cards:', error);
    throw error;
  }

  return true;
};

/**
 * Delete all cards from the database
 */
export const deleteAllCards = async () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabase
    .from('cards')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (workaround)

  if (error) {
    console.error('Error deleting all cards:', error);
    throw error;
  }

  return true;
};

// ============================================
// CARD PROCESSING
// ============================================

/**
 * Process parsed CSV cards - enrich with API data and save to database
 * Processes ONE card at a time to avoid timeouts
 */
export const processAndSaveCards = async (parsedCards, onProgress) => {
  const results = [];
  const total = parsedCards.length;

  for (let i = 0; i < total; i++) {
    const card = parsedCards[i];
    
    // Update progress with card name
    if (onProgress) {
      const percent = Math.round(((i + 1) / total) * 100);
      onProgress(percent, `Processing ${i + 1}/${total}: ${card.name}`);
    }
    
    try {
      const enrichedData = await fetchCardData(card);
      const gradingScore = calculateGradingScore(enrichedData);
      
      const cardToSave = {
        name: enrichedData.name,
        set_name: enrichedData.set,
        card_number: enrichedData.number || null,
        rarity: enrichedData.rarity || null,
        image_url: enrichedData.imageUrl || null,
        tcgplayer_url: enrichedData.tcgplayerUrl || null,
        price_nm: enrichedData.pricing?.nearMint || null,
        price_psa9: enrichedData.pricing?.psa9 || null,
        price_psa10: enrichedData.pricing?.psa10 || null,
        price_multiple: enrichedData.pricing?.priceMultiple || null,
        pop_total: enrichedData.population?.total || null,
        pop_psa10: enrichedData.population?.psa10 || null,
        pop_psa9: enrichedData.population?.psa9 || null,
        pop_psa8: enrichedData.population?.psa8 || null,
        psa10_rate: enrichedData.population?.psa10Rate || null,
        grading_score: gradingScore.score,
        grading_recommendation: gradingScore.recommendation,
        grading_reasoning: gradingScore.reasoning,
        status: enrichedData.notFound ? 'not_found' : 'success',
      };
      
      // Save to database immediately
      if (isSupabaseConfigured()) {
        try {
          const savedCard = await addCard(cardToSave);
          results.push(savedCard);
        } catch (dbError) {
          console.error(`Error saving ${card.name}:`, dbError);
          results.push({ ...cardToSave, _notSaved: true });
        }
      } else {
        results.push(cardToSave);
      }
    } catch (error) {
      console.error(`Error processing ${card.name}:`, error);
      // Save as error
      const errorCard = {
        name: card.name,
        set_name: card.set,
        card_number: card.number || null,
        status: 'error',
        error_message: error.message,
      };
      
      if (isSupabaseConfigured()) {
        try {
          const savedCard = await addCard(errorCard);
          results.push(savedCard);
        } catch (dbError) {
          results.push({ ...errorCard, _notSaved: true });
        }
      } else {
        results.push(errorCard);
      }
    }
  }

  return results;
};

/**
 * Re-sync a card with updated name/set/number - fetches fresh data from API
 * @param {string} id - Card UUID
 * @param {string} name - Card name to search
 * @param {string} set - Set name to search
 * @param {string} number - Card number to search
 * @param {object} options - Options for re-sync
 * @param {boolean} options.preservePopulation - If true, keep existing population data
 */
export const resyncCard = async (id, name, set, number, options = { preservePopulation: true, priceTrackerId: null }) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  // First, get the current card data (to preserve population if needed)
  const { data: currentCard, error: fetchError } = await supabase
    .from('cards')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Error fetching current card:', fetchError);
    throw fetchError;
  }

  // Fetch fresh data from API (with optional priceTrackerId for exact matching)
  const enrichedData = await fetchCardData({ 
    name, 
    set, 
    number, 
    priceTrackerId: options.priceTrackerId 
  });
  
  // Check if card was found
  if (enrichedData.notFound) {
    throw new Error('Card not found in API. Try adjusting the name or set.');
  }
  
  // Calculate grading score with potentially preserved population
  const populationForScore = options.preservePopulation && currentCard.pop_total
    ? {
        total: currentCard.pop_total,
        psa10: currentCard.pop_psa10,
        psa9: currentCard.pop_psa9,
        psa8: currentCard.pop_psa8,
        psa10Rate: currentCard.psa10_rate,
      }
    : enrichedData.population;

  const cardForGrading = {
    ...enrichedData,
    population: populationForScore,
  };
  
  const gradingScore = calculateGradingScore(cardForGrading);

  // Build update object
  const updates = {
    name: enrichedData.name,
    set_name: enrichedData.set,
    card_number: enrichedData.number || null,
    rarity: enrichedData.rarity || null,
    image_url: enrichedData.imageUrl || null,
    tcgplayer_url: enrichedData.tcgplayerUrl || null,
    price_nm: enrichedData.pricing?.nearMint || null,
    price_psa9: enrichedData.pricing?.psa9 || null,
    price_psa10: enrichedData.pricing?.psa10 || null,
    price_multiple: enrichedData.pricing?.priceMultiple || null,
    grading_score: gradingScore.score,
    grading_recommendation: gradingScore.recommendation,
    grading_reasoning: gradingScore.reasoning,
    status: 'success',
    error_message: null,
  };

  // Preserve or overwrite population based on option
  if (!options.preservePopulation) {
    updates.pop_total = enrichedData.population?.total || null;
    updates.pop_psa10 = enrichedData.population?.psa10 || null;
    updates.pop_psa9 = enrichedData.population?.psa9 || null;
    updates.pop_psa8 = enrichedData.population?.psa8 || null;
    updates.psa10_rate = enrichedData.population?.psa10Rate || null;
  }

  // Update in database
  const { data, error } = await supabase
    .from('cards')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating card:', error);
    throw error;
  }

  return data;
};

/**
 * Transform database row to frontend card format
 */
export const dbRowToCard = (row) => ({
  id: row.id,
  name: row.name,
  set: row.set_name,
  number: row.card_number || '',
  rarity: row.rarity || '',
  imageUrl: row.image_url || '',
  tcgplayerUrl: row.tcgplayer_url || '',
  pricing: {
    nearMint: row.price_nm,
    psa9: row.price_psa9,
    psa10: row.price_psa10,
    priceMultiple: row.price_multiple,
    lastUpdated: row.updated_at,
  },
  population: {
    total: row.pop_total,
    psa10: row.pop_psa10,
    psa9: row.pop_psa9,
    psa8: row.pop_psa8,
    psa10Rate: row.psa10_rate,
    lastUpdated: row.updated_at,
  },
  gradingScore: {
    score: row.grading_score,
    recommendation: row.grading_recommendation || 'N/A',
    reasoning: row.grading_reasoning || '',
  },
  status: row.status || 'success',
  error: row.error_message || null,
  createdAt: row.created_at,
});

/**
 * Transform multiple database rows to frontend format
 */
export const dbRowsToCards = (rows) => rows.map(dbRowToCard);
