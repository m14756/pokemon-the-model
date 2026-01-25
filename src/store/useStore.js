import { create } from 'zustand';
import { getAllCards, deleteCard as dbDeleteCard, dbRowsToCards, resyncCard as dbResyncCard, dbRowToCard } from '../api/database';
import { isSupabaseConfigured } from '../api/supabase';

const useStore = create((set, get) => ({
  // Cards collection
  cards: [],
  
  // UI state
  isLoading: false,
  isInitialized: false,
  uploadProgress: 0,
  error: null,
  
  // Search and filter
  searchQuery: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  filters: {
    set: null,
    rarity: null,
    // NM Price filters
    minNmPrice: null,
    maxNmPrice: null,
    // PSA 10 Price filters (was minPrice/maxPrice)
    minPrice: null,
    maxPrice: null,
    // PSA 10 Rate filters
    minPsa10Rate: null,
    maxPsa10Rate: null,
    // Price Multiple filters
    minPriceMultiple: null,
    maxPriceMultiple: null,
    // Grading Score filters
    minGradingScore: null,
    maxGradingScore: null,
    // Missing data filter
    missingPopulation: false,
    // Not found filter (cards with no pricing data)
    notFound: false,
  },
  
  // Pagination
  pageSize: 20, // 10, 20, 50, 100, or 'all'
  currentPage: 1,
  
  // Selected card for detail view
  selectedCardId: null,
  
  // Database status
  isDbConfigured: isSupabaseConfigured(),
  
  // Actions
  initializeCards: async () => {
    if (!isSupabaseConfigured()) {
      set({ isInitialized: true });
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      const dbRows = await getAllCards();
      const cards = dbRowsToCards(dbRows);
      set({ cards, isLoading: false, isInitialized: true });
    } catch (error) {
      console.error('Failed to load cards:', error);
      set({ error: error.message, isLoading: false, isInitialized: true });
    }
  },
  
  setCards: (cards) => set({ cards, currentPage: 1 }),
  
  addCards: (newCards) => set((state) => ({
    cards: [...newCards, ...state.cards], // New cards at top
    currentPage: 1
  })),
  
  updateCard: (id, updates) => set((state) => ({
    cards: state.cards.map(card => 
      card.id === id ? { ...card, ...updates } : card
    )
  })),
  
  removeCard: async (id) => {
    const state = get();
    
    // Optimistically remove from UI
    set({
      cards: state.cards.filter(card => card.id !== id)
    });
    
    // Delete from database
    if (isSupabaseConfigured()) {
      try {
        await dbDeleteCard(id);
      } catch (error) {
        // Revert on error
        console.error('Failed to delete card:', error);
        set({ cards: state.cards, error: 'Failed to delete card' });
      }
    }
  },
  
  // Re-sync a card with updated name/set/number
  resyncCard: async (id, name, setName, number, options = { preservePopulation: true, priceTrackerId: null }) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }
    
    try {
      // Call database function to re-sync
      const updatedDbRow = await dbResyncCard(id, name, setName, number, options);
      
      // Transform to frontend format
      const updatedCard = dbRowToCard(updatedDbRow);
      
      // Update in local state
      set((state) => ({
        cards: state.cards.map(card => 
          card.id === id ? updatedCard : card
        )
      }));
      
      return updatedCard;
    } catch (error) {
      console.error('Failed to resync card:', error);
      throw error;
    }
  },
  
  clearCards: () => set({ cards: [], error: null, currentPage: 1 }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),
  
  setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),
  
  setSortBy: (sortBy) => set({ sortBy }),
  
  setSortOrder: (sortOrder) => set({ sortOrder }),
  
  toggleSortOrder: () => set((state) => ({
    sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc'
  })),
  
  setFilter: (filterName, value) => set((state) => ({
    filters: { ...state.filters, [filterName]: value },
    currentPage: 1 // Reset to first page when filter changes
  })),
  
  clearFilters: () => set({
    filters: {
      set: null,
      rarity: null,
      minNmPrice: null,
      maxNmPrice: null,
      minPrice: null,
      maxPrice: null,
      minPsa10Rate: null,
      maxPsa10Rate: null,
      minPriceMultiple: null,
      maxPriceMultiple: null,
      minGradingScore: null,
      maxGradingScore: null,
      missingPopulation: false,
      notFound: false,
    },
    currentPage: 1
  }),
  
  // Pagination actions
  setPageSize: (size) => set({ pageSize: size, currentPage: 1 }),
  setCurrentPage: (page) => set({ currentPage: page }),
  nextPage: () => set((state) => ({ currentPage: state.currentPage + 1 })),
  prevPage: () => set((state) => ({ currentPage: Math.max(1, state.currentPage - 1) })),
  
  setSelectedCardId: (id) => set({ selectedCardId: id }),
  
  // Computed values
  getFilteredCards: () => {
    const state = get();
    let filtered = [...state.cards];
    
    // Search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(card => 
        card.name.toLowerCase().includes(query) ||
        card.set.toLowerCase().includes(query)
      );
    }
    
    // Set filter
    if (state.filters.set) {
      filtered = filtered.filter(card => card.set === state.filters.set);
    }
    
    // Rarity filter
    if (state.filters.rarity) {
      filtered = filtered.filter(card => card.rarity === state.filters.rarity);
    }
    
    // NM Price filters
    if (state.filters.minNmPrice !== null) {
      filtered = filtered.filter(card => 
        card.pricing?.nearMint >= state.filters.minNmPrice
      );
    }
    if (state.filters.maxNmPrice !== null) {
      filtered = filtered.filter(card => 
        card.pricing?.nearMint <= state.filters.maxNmPrice
      );
    }
    
    // PSA 10 Price filters (existing - was minPrice/maxPrice)
    if (state.filters.minPrice !== null) {
      filtered = filtered.filter(card => 
        card.pricing?.psa10 >= state.filters.minPrice
      );
    }
    if (state.filters.maxPrice !== null) {
      filtered = filtered.filter(card => 
        card.pricing?.psa10 <= state.filters.maxPrice
      );
    }
    
    // PSA 10 Rate filters
    if (state.filters.minPsa10Rate !== null) {
      filtered = filtered.filter(card => 
        card.population?.psa10Rate >= state.filters.minPsa10Rate
      );
    }
    if (state.filters.maxPsa10Rate !== null) {
      filtered = filtered.filter(card => 
        card.population?.psa10Rate <= state.filters.maxPsa10Rate
      );
    }
    
    // Price Multiple filters
    if (state.filters.minPriceMultiple !== null) {
      filtered = filtered.filter(card => 
        card.pricing?.priceMultiple >= state.filters.minPriceMultiple
      );
    }
    if (state.filters.maxPriceMultiple !== null) {
      filtered = filtered.filter(card => 
        card.pricing?.priceMultiple <= state.filters.maxPriceMultiple
      );
    }
    
    // Grading Score filters
    if (state.filters.minGradingScore !== null) {
      filtered = filtered.filter(card => 
        card.gradingScore?.score >= state.filters.minGradingScore
      );
    }
    if (state.filters.maxGradingScore !== null) {
      filtered = filtered.filter(card => 
        card.gradingScore?.score <= state.filters.maxGradingScore
      );
    }
    
    // Missing population filter
    if (state.filters.missingPopulation) {
      filtered = filtered.filter(card => 
        !card.population?.total || !card.population?.psa10
      );
    }
    
    // Not found filter (cards with no pricing data)
    if (state.filters.notFound) {
      filtered = filtered.filter(card => 
        card.status === 'not_found' || 
        (!card.pricing?.nearMint && !card.pricing?.psa9 && !card.pricing?.psa10)
      );
    }
    
    // Sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (state.sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'set':
          aVal = a.set.toLowerCase();
          bVal = b.set.toLowerCase();
          break;
        case 'nearMint':
          aVal = a.pricing?.nearMint ?? 0;
          bVal = b.pricing?.nearMint ?? 0;
          break;
        case 'psa9':
          aVal = a.pricing?.psa9 ?? 0;
          bVal = b.pricing?.psa9 ?? 0;
          break;
        case 'psa10':
          aVal = a.pricing?.psa10 ?? 0;
          bVal = b.pricing?.psa10 ?? 0;
          break;
        case 'psa10Rate':
          aVal = a.population?.psa10Rate ?? 0;
          bVal = b.population?.psa10Rate ?? 0;
          break;
        case 'priceMultiple':
          aVal = a.pricing?.priceMultiple ?? 0;
          bVal = b.pricing?.priceMultiple ?? 0;
          break;
        case 'totalPop':
          aVal = a.population?.total ?? 0;
          bVal = b.population?.total ?? 0;
          break;
        case 'gradingScore':
          aVal = a.gradingScore?.score ?? 0;
          bVal = b.gradingScore?.score ?? 0;
          break;
        case 'createdAt':
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        default:
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      }
      
      if (typeof aVal === 'string') {
        return state.sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return state.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    return filtered;
  },
  
  // Get paginated cards
  getPaginatedCards: () => {
    const state = get();
    const filtered = state.getFilteredCards();
    
    if (state.pageSize === 'all') {
      return filtered;
    }
    
    const start = (state.currentPage - 1) * state.pageSize;
    const end = start + state.pageSize;
    return filtered.slice(start, end);
  },
  
  // Get total pages
  getTotalPages: () => {
    const state = get();
    const filtered = state.getFilteredCards();
    
    if (state.pageSize === 'all') {
      return 1;
    }
    
    return Math.ceil(filtered.length / state.pageSize);
  },
  
  getSelectedCard: () => {
    const state = get();
    return state.cards.find(card => card.id === state.selectedCardId) || null;
  },
  
  getCollectionStats: () => {
    const state = get();
    const cards = state.cards.filter(c => c.status === 'success');
    
    if (cards.length === 0) {
      return {
        totalCards: 0,
        totalNMValue: 0,
        totalPSA9Value: 0,
        totalPSA10Value: 0,
        avgPsa10Rate: 0,
        avgPriceMultiple: 0,
        notFoundCount: 0,
        missingPopCount: 0,
      };
    }
    
    const totalNMValue = cards.reduce((sum, c) => sum + (c.pricing?.nearMint || 0), 0);
    const totalPSA9Value = cards.reduce((sum, c) => sum + (c.pricing?.psa9 || 0), 0);
    const totalPSA10Value = cards.reduce((sum, c) => sum + (c.pricing?.psa10 || 0), 0);
    
    const cardsWithPsa10Rate = cards.filter(c => c.population?.psa10Rate != null);
    const avgPsa10Rate = cardsWithPsa10Rate.length > 0
      ? cardsWithPsa10Rate.reduce((sum, c) => sum + c.population.psa10Rate, 0) / cardsWithPsa10Rate.length
      : 0;
    
    const cardsWithMultiple = cards.filter(c => c.pricing?.priceMultiple != null);
    const avgPriceMultiple = cardsWithMultiple.length > 0
      ? cardsWithMultiple.reduce((sum, c) => sum + c.pricing.priceMultiple, 0) / cardsWithMultiple.length
      : 0;
    
    // Count cards with no pricing data (not found)
    const notFoundCount = state.cards.filter(c => 
      c.status === 'not_found' ||
      (!c.pricing?.nearMint && !c.pricing?.psa9 && !c.pricing?.psa10)
    ).length;
    
    // Count cards missing population data
    const missingPopCount = state.cards.filter(c => 
      !c.population?.total || !c.population?.psa10
    ).length;
    
    return {
      totalCards: cards.length,
      totalNMValue,
      totalPSA9Value,
      totalPSA10Value,
      avgPsa10Rate,
      avgPriceMultiple,
      notFoundCount,
      missingPopCount,
    };
  },
  
  getUniqueSets: () => {
    const state = get();
    return [...new Set(state.cards.map(c => c.set))].sort();
  },
  
  getUniqueRarities: () => {
    const state = get();
    return [...new Set(state.cards.map(c => c.rarity).filter(Boolean))].sort();
  },
}));

export default useStore;
