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
 */
export const processAndSaveCards = async (parsedCards, onProgress) => {
  const results = [];
  const batchSize = 10; // Process 10 cards at a time

  for (let i = 0; i < parsedCards.length; i += batchSize) {
    const batch = parsedCards.slice(i, i + batchSize);

    // Fetch enriched data for each card
    const enrichedBatch = await Promise.allSettled(
      batch.map(async (card) => {
        try {
          const enrichedData = await fetchCardData(card);
          const gradingScore = calculateGradingScore(enrichedData);
          
          return {
            // Don't include the temporary id - let Supabase generate UUID
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
            status: 'success',
          };
        } catch (error) {
          return {
            name: card.name,
            set_name: card.set,
            card_number: card.number || null,
            rarity: null,
            image_url: null,
            tcgplayer_url: null,
            price_nm: null,
            price_psa9: null,
            price_psa10: null,
            price_multiple: null,
            pop_total: null,
            pop_psa10: null,
            pop_psa9: null,
            pop_psa8: null,
            psa10_rate: null,
            grading_score: null,
            grading_recommendation: 'N/A',
            grading_reasoning: 'Failed to fetch data',
            status: 'error',
            error_message: error.message,
          };
        }
      })
    );

    // Extract successful results
    const cardsToSave = enrichedBatch
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    // Save to database
    if (cardsToSave.length > 0 && isSupabaseConfigured()) {
      try {
        const savedCards = await addCards(cardsToSave);
        results.push(...savedCards);
      } catch (error) {
        console.error('Error saving batch to database:', error);
        // Still add to results but mark as not saved
        results.push(...cardsToSave.map(c => ({ ...c, _notSaved: true })));
      }
    } else {
      results.push(...cardsToSave);
    }

    // Report progress
    if (onProgress) {
      const progress = Math.min(100, Math.round(((i + batchSize) / parsedCards.length) * 100));
      onProgress(progress);
    }
  }

  return results;
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
