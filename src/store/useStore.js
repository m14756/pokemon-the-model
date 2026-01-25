import { create } from 'zustand';
import { getAllCards, deleteCard as dbDeleteCard, dbRowsToCards } from '../api/database';
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
    minPrice: null,
    maxPrice: null,
    minPsa10Rate: null,
    maxPsa10Rate: null,
    missingPopulation: false,
  },
  
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
  
  setCards: (cards) => set({ cards }),
  
  addCards: (newCards) => set((state) => ({
    cards: [...newCards, ...state.cards] // New cards at top
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
  
  clearCards: () => set({ cards: [], error: null }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setSortBy: (sortBy) => set({ sortBy }),
  
  setSortOrder: (sortOrder) => set({ sortOrder }),
  
  toggleSortOrder: () => set((state) => ({
    sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc'
  })),
  
  setFilter: (filterName, value) => set((state) => ({
    filters: { ...state.filters, [filterName]: value }
  })),
  
  clearFilters: () => set({
    filters: {
      set: null,
      rarity: null,
      minPrice: null,
      maxPrice: null,
      minPsa10Rate: null,
      maxPsa10Rate: null,
      missingPopulation: false,
    }
  }),
  
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
    
    // Price filters
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
    
    // Missing population filter
    if (state.filters.missingPopulation) {
      filtered = filtered.filter(card => 
        !card.population?.total || !card.population?.psa10
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
    
    return {
      totalCards: cards.length,
      totalNMValue,
      totalPSA9Value,
      totalPSA10Value,
      avgPsa10Rate,
      avgPriceMultiple,
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
