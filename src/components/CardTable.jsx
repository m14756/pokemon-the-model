import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Filter, 
  X,
  ArrowUpDown,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Trash2,
  RefreshCw,
  CheckSquare,
  Square,
  Loader2,
  Edit3,
  Save
} from 'lucide-react';
import useStore from '../store/useStore';
import { updateCard as dbUpdateCard } from '../api/database';
import { isSupabaseConfigured } from '../api/supabase';
import { formatCurrency, formatPercent, formatMultiple, formatNumber, getPsa10RateCategory, calculateGradingScore } from '../utils/helpers';
import PSABadge from './PSABadge';

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Added' },
  { value: 'name', label: 'Name' },
  { value: 'set', label: 'Set' },
  { value: 'nearMint', label: 'NM Price' },
  { value: 'psa9', label: 'PSA 9' },
  { value: 'psa10', label: 'PSA 10' },
  { value: 'psa10Rate', label: 'PSA 10 Rate' },
  { value: 'priceMultiple', label: 'Multiple' },
  { value: 'gradingScore', label: 'Grade Score' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 'all'];

const CardTable = () => {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncProgress, setResyncProgress] = useState({ current: 0, total: 0, cardName: '' });
  
  // Population editing state (modal for mobile-friendly)
  const [editingCard, setEditingCard] = useState(null);
  const [editPopTotal, setEditPopTotal] = useState('');
  const [editPopPsa10, setEditPopPsa10] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    toggleSortOrder,
    filters,
    setFilter,
    clearFilters,
    getFilteredCards,
    getPaginatedCards,
    getTotalPages,
    getCollectionStats,
    getUniqueSets,
    setSelectedCardId,
    removeCard,
    updateCard,
    cards,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    nextPage,
    prevPage,
  } = useStore();
  
  const filteredCards = getFilteredCards();
  const paginatedCards = getPaginatedCards();
  const totalPages = getTotalPages();
  const stats = getCollectionStats();
  const sets = getUniqueSets();
  
  // Calculate missing population count
  const missingPopulationCount = cards.filter(c => !c.population?.total || !c.population?.psa10).length;
  
  // Calculate not found count (cards with no pricing data)
  const notFoundCount = cards.filter(c => 
    c.status === 'not_found' || 
    (!c.pricing?.nearMint && !c.pricing?.psa9 && !c.pricing?.psa10)
  ).length;
  
  // Check if a card has missing population
  const hasMissingPopulation = (card) => !card.population?.total || !card.population?.psa10;
  
  // Check if a card is not found
  const isCardNotFound = (card) => 
    card.status === 'not_found' || 
    (!card.pricing?.nearMint && !card.pricing?.psa9 && !card.pricing?.psa10);
  
  const handleSort = (column) => {
    if (sortBy === column) {
      toggleSortOrder();
    } else {
      setSortBy(column);
    }
  };
  
  const handleCardClick = (card) => {
    // Don't navigate if we're editing
    if (editingCard?.id === card.id) return;
    setSelectedCardId(card.id);
    navigate(`/card/${card.id}`);
  };
  
  const handleDeleteCard = async (e, card) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${card.name}" from your collection?`)) {
      await removeCard(card.id);
    }
  };
  
  // Checkbox selection handlers
  const toggleCardSelection = (e, cardId) => {
    e.stopPropagation();
    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      newSelected.add(cardId);
    }
    setSelectedCards(newSelected);
  };
  
  const toggleSelectAll = () => {
    if (selectedCards.size === paginatedCards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(paginatedCards.map(c => c.id)));
    }
  };
  
  const handleDeleteSelected = async () => {
    if (selectedCards.size === 0) return;
    
    const count = selectedCards.size;
    if (!window.confirm(`Delete ${count} selected card${count > 1 ? 's' : ''}?`)) {
      return;
    }
    
    for (const cardId of selectedCards) {
      await removeCard(cardId);
    }
    
    setSelectedCards(new Set());
  };
  
  // Resync selected cards
  const handleResyncSelected = async () => {
    if (selectedCards.size === 0) return;
    
    const count = selectedCards.size;
    if (!window.confirm(`Resync prices for ${count} selected card${count > 1 ? 's' : ''}? This will use ${count} API calls.`)) {
      return;
    }
    
    setIsResyncing(true);
    setResyncProgress({ current: 0, total: count, cardName: '' });
    
    const selectedCardsList = cards.filter(c => selectedCards.has(c.id));
    
    for (let i = 0; i < selectedCardsList.length; i++) {
      const card = selectedCardsList[i];
      setResyncProgress({ current: i + 1, total: count, cardName: card.name });
      
      try {
        const response = await fetch('/.netlify/functions/get-card-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: card.name,
            set: card.set,
            number: card.number,
            priceTrackerId: card.priceTrackerId
          })
        });
        
        if (response.ok) {
          const newData = await response.json();
          
          // Update pricing, preserve population (manual entry)
          updateCard(card.id, {
            pricing: {
              ...card.pricing,
              nearMint: newData.pricing?.nearMint ?? card.pricing?.nearMint,
              psa9: newData.pricing?.psa9 ?? card.pricing?.psa9,
              psa10: newData.pricing?.psa10 ?? card.pricing?.psa10,
              lastUpdated: new Date().toISOString(),
            },
            imageUrl: newData.imageUrl || card.imageUrl,
          });
          
          // Also update in database
          if (isSupabaseConfigured()) {
            try {
              await dbUpdateCard(card.id, {
                price_nm: newData.pricing?.nearMint ?? card.pricing?.nearMint,
                price_psa9: newData.pricing?.psa9 ?? card.pricing?.psa9,
                price_psa10: newData.pricing?.psa10 ?? card.pricing?.psa10,
                image_url: newData.imageUrl || card.imageUrl,
              });
            } catch (dbError) {
              console.error('Failed to update database:', dbError);
            }
          }
        }
      } catch (error) {
        console.error(`Failed to resync ${card.name}:`, error);
      }
      
      if (i < selectedCardsList.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }
    
    setIsResyncing(false);
    setResyncProgress({ current: 0, total: 0, cardName: '' });
    setSelectedCards(new Set());
  };
  
  // Population editing modal
  const handleStartEditPop = (e, card) => {
    e.stopPropagation();
    setEditingCard(card);
    setEditPopTotal(card.population?.total?.toString() || '');
    setEditPopPsa10(card.population?.psa10?.toString() || '');
  };
  
  const handleCancelEditPop = () => {
    setEditingCard(null);
    setEditPopTotal('');
    setEditPopPsa10('');
  };
  
  const handleSavePopulation = async () => {
    if (!editingCard) return;
    
    const popTotal = editPopTotal ? parseInt(editPopTotal, 10) : null;
    const popPsa10 = editPopPsa10 ? parseInt(editPopPsa10, 10) : null;
    
    if (popTotal !== null && popPsa10 !== null && popPsa10 > popTotal) {
      alert('PSA 10 count cannot exceed total population');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const psa10Rate = (popTotal && popPsa10) ? (popPsa10 / popTotal) * 100 : null;
      
      // Calculate new grading score
      const updatedCardData = {
        ...editingCard,
        population: {
          ...editingCard.population,
          total: popTotal,
          psa10: popPsa10,
          psa10Rate: psa10Rate ? parseFloat(psa10Rate.toFixed(2)) : null,
        }
      };
      const newGradingScore = calculateGradingScore(updatedCardData);
      
      // Update database
      if (isSupabaseConfigured()) {
        await dbUpdateCard(editingCard.id, {
          pop_total: popTotal,
          pop_psa10: popPsa10,
          psa10_rate: psa10Rate ? parseFloat(psa10Rate.toFixed(2)) : null,
          grading_score: newGradingScore.score,
          grading_recommendation: newGradingScore.recommendation,
          grading_reasoning: newGradingScore.reasoning,
        });
      }
      
      // Update local state
      updateCard(editingCard.id, {
        population: {
          ...editingCard.population,
          total: popTotal,
          psa10: popPsa10,
          psa10Rate: psa10Rate ? parseFloat(psa10Rate.toFixed(2)) : null,
        },
        gradingScore: newGradingScore,
      });
      
      setEditingCard(null);
      setEditPopTotal('');
      setEditPopPsa10('');
    } catch (error) {
      console.error('Failed to save population:', error);
      alert('Failed to save population data');
    } finally {
      setIsSaving(false);
    }
  };
  
  const SortHeader = ({ column, children, className = '' }) => (
    <th
      className={`cursor-pointer hover:text-white transition-colors select-none ${className}`}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortBy === column ? (
          sortOrder === 'asc' ? (
            <ChevronUp size={14} className="text-electric-400" />
          ) : (
            <ChevronDown size={14} className="text-electric-400" />
          )
        ) : (
          <ArrowUpDown size={12} className="opacity-30" />
        )}
      </div>
    </th>
  );
  
  const hasActiveFilters = Object.values(filters).some(v => v !== null && v !== false);
  const allSelected = paginatedCards.length > 0 && selectedCards.size === paginatedCards.length;
  const someSelected = selectedCards.size > 0 && selectedCards.size < paginatedCards.length;
  
  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard label="Cards" value={stats.totalCards} />
        <StatCard 
          label="NM Value" 
          value={formatCurrency(stats.totalNMValue)} 
          highlight 
        />
        <StatCard 
          label="PSA 9 Value" 
          value={formatCurrency(stats.totalPSA9Value)} 
        />
        <StatCard 
          label="PSA 10 Value" 
          value={formatCurrency(stats.totalPSA10Value)} 
          highlight 
        />
        <StatCard 
          label="Avg PSA 10 Rate" 
          value={formatPercent(stats.avgPsa10Rate)} 
        />
        <StatCard 
          label="Avg Multiple" 
          value={formatMultiple(stats.avgPriceMultiple)} 
        />
        <StatCard 
          label="Missing Pop" 
          value={missingPopulationCount}
          warning={missingPopulationCount > 0}
          onClick={() => {
            setFilter('missingPopulation', !filters.missingPopulation);
            setShowFilters(true);
          }}
        />
        <StatCard 
          label="Not Found" 
          value={notFoundCount}
          error={notFoundCount > 0}
          onClick={() => {
            setFilter('notFound', !filters.notFound);
            setShowFilters(true);
          }}
        />
      </div>
      
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input w-40"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                Sort: {opt.label}
              </option>
            ))}
          </select>
          
          <button
            onClick={toggleSortOrder}
            className="btn btn-secondary px-3"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${hasActiveFilters ? 'btn-primary' : 'btn-secondary'} px-3`}
          >
            <Filter size={20} />
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-white absolute -top-1 -right-1" />
            )}
          </button>
        </div>
      </div>
      
      {/* Bulk Selection Actions */}
      {selectedCards.size > 0 && (
        <div className="flex items-center gap-4 p-3 glass rounded-xl animate-fade-in">
          <span className="text-slate-300">
            <span className="font-semibold">{selectedCards.size}</span> card{selectedCards.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleResyncSelected}
              disabled={isResyncing}
              className="btn btn-secondary text-sm flex items-center gap-2"
            >
              {isResyncing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Resyncing... ({resyncProgress.current}/{resyncProgress.total})
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Resync Selected
                </>
              )}
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={isResyncing}
              className="btn btn-secondary text-sm text-red-400 hover:text-red-300 flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedCards(new Set())}
              className="btn btn-secondary text-sm"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}
      
      {/* Resync Progress Bar */}
      {isResyncing && (
        <div className="glass rounded-xl p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">
              Resyncing: {resyncProgress.cardName}
            </span>
            <span className="text-sm text-slate-400">
              {resyncProgress.current} / {resyncProgress.total}
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-electric-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(resyncProgress.current / resyncProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Filters Panel */}
      {showFilters && (
        <div className="glass rounded-xl p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
              >
                <X size={14} />
                Clear all
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">
                Set
              </label>
              <select
                value={filters.set || ''}
                onChange={(e) => setFilter('set', e.target.value || null)}
                className="input"
              >
                <option value="">All Sets</option>
                {sets.map(set => (
                  <option key={set} value={set}>{set}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">
                Data Status
              </label>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setFilter('missingPopulation', !filters.missingPopulation)}
                  className={`w-full px-4 py-2 rounded-xl border transition-colors flex items-center justify-center gap-2 ${
                    filters.missingPopulation 
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' 
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <AlertTriangle size={16} />
                  Missing Population
                  {filters.missingPopulation && (
                    <span className="ml-1">({missingPopulationCount})</span>
                  )}
                </button>
                <button
                  onClick={() => setFilter('notFound', !filters.notFound)}
                  className={`w-full px-4 py-2 rounded-xl border transition-colors flex items-center justify-center gap-2 ${
                    filters.notFound 
                      ? 'bg-red-500/20 border-red-500/50 text-red-400' 
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <AlertCircle size={16} />
                  Not Found
                  {filters.notFound && (
                    <span className="ml-1">({notFoundCount})</span>
                  )}
                </button>
              </div>
            </div>
            
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">
                PSA 10 Rate
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min %"
                  value={filters.minPsa10Rate || ''}
                  onChange={(e) => setFilter('minPsa10Rate', e.target.value ? Number(e.target.value) : null)}
                  className="input"
                  min="0"
                  max="100"
                />
                <input
                  type="number"
                  placeholder="Max %"
                  value={filters.maxPsa10Rate || ''}
                  onChange={(e) => setFilter('maxPsa10Rate', e.target.value ? Number(e.target.value) : null)}
                  className="input"
                  min="0"
                  max="100"
                />
              </div>
            </div>
            
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">
                PSA 10 Price
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min $"
                  value={filters.minPrice || ''}
                  onChange={(e) => setFilter('minPrice', e.target.value ? Number(e.target.value) : null)}
                  className="input"
                  min="0"
                />
                <input
                  type="number"
                  placeholder="Max $"
                  value={filters.maxPrice || ''}
                  onChange={(e) => setFilter('maxPrice', e.target.value ? Number(e.target.value) : null)}
                  className="input"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Results count and pagination controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-slate-500 text-sm">
          Showing {paginatedCards.length} of {filteredCards.length} cards
          {filters.missingPopulation && (
            <span className="text-amber-400 ml-2">
              (filtered to missing population data)
            </span>
          )}
        </p>
        
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-sm">Show:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="input w-20 text-sm py-1"
          >
            {PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>
                {size === 'all' ? 'All' : size}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">
                  <button
                    onClick={toggleSelectAll}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    title={allSelected ? 'Deselect all' : 'Select all on page'}
                  >
                    {allSelected ? (
                      <CheckSquare size={18} className="text-electric-400" />
                    ) : someSelected ? (
                      <CheckSquare size={18} className="text-slate-500" />
                    ) : (
                      <Square size={18} className="text-slate-500" />
                    )}
                  </button>
                </th>
                <th className="w-16"></th>
                <SortHeader column="name">Card</SortHeader>
                <SortHeader column="set">Set</SortHeader>
                <SortHeader column="nearMint" className="text-right">NM</SortHeader>
                <SortHeader column="psa9" className="text-right">PSA 9</SortHeader>
                <SortHeader column="psa10" className="text-right">PSA 10</SortHeader>
                <SortHeader column="psa10Rate" className="text-right">Rate</SortHeader>
                <SortHeader column="priceMultiple" className="text-right">Multiple</SortHeader>
                <SortHeader column="gradingScore" className="text-right">Score</SortHeader>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedCards.map((card) => (
                <tr
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  className={`${card.status === 'error' ? 'opacity-50' : ''} ${isCardNotFound(card) ? 'bg-red-500/5' : hasMissingPopulation(card) ? 'bg-amber-500/5' : ''}`}
                >
                  {/* Selection Checkbox */}
                  <td className="w-10" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => toggleCardSelection(e, card.id)}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                    >
                      {selectedCards.has(card.id) ? (
                        <CheckSquare size={18} className="text-electric-400" />
                      ) : (
                        <Square size={18} className="text-slate-500" />
                      )}
                    </button>
                  </td>
                  
                  {/* Image */}
                  <td className="w-16">
                    <div className="relative">
                      {card.imageUrl ? (
                        <img
                          src={card.imageUrl}
                          alt={card.name}
                          className="w-12 h-16 object-contain rounded"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-12 h-16 bg-white/5 rounded flex items-center justify-center">
                          <span className="text-2xl">🃏</span>
                        </div>
                      )}
                      {isCardNotFound(card) ? (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center" title="Card not found - click to fix">
                          <AlertCircle size={10} className="text-white" />
                        </div>
                      ) : hasMissingPopulation(card) && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center" title="Missing population data">
                          <AlertTriangle size={10} className="text-white" />
                        </div>
                      )}
                    </div>
                  </td>
                  
                  {/* Name & Number */}
                  <td>
                    <div>
                      <p className="text-white font-medium">{card.name}</p>
                      {card.number && (
                        <p className="text-slate-500 text-xs">#{card.number}</p>
                      )}
                    </div>
                  </td>
                  
                  {/* Set */}
                  <td className="text-slate-400">{card.set}</td>
                  
                  {/* NM Price */}
                  <td className="text-right font-mono text-slate-300">
                    {formatCurrency(card.pricing?.nearMint)}
                  </td>
                  
                  {/* PSA 9 */}
                  <td className="text-right font-mono text-slate-300">
                    {formatCurrency(card.pricing?.psa9)}
                  </td>
                  
                  {/* PSA 10 */}
                  <td className="text-right font-mono text-white font-semibold">
                    {formatCurrency(card.pricing?.psa10)}
                  </td>
                  
                  {/* PSA 10 Rate - Click to edit */}
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div 
                      className="flex items-center gap-1 justify-end cursor-pointer group"
                      onClick={(e) => handleStartEditPop(e, card)}
                      title="Click to edit population data"
                    >
                      <PSABadge rate={card.population?.psa10Rate} />
                      <Edit3 size={12} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                  
                  {/* Price Multiple */}
                  <td className="text-right">
                    {card.pricing?.priceMultiple != null ? (
                      <span className={`font-mono font-semibold ${
                        card.pricing.priceMultiple >= 10 
                          ? 'text-gold-400' 
                          : 'text-slate-300'
                      }`}>
                        {formatMultiple(card.pricing.priceMultiple)}
                      </span>
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )}
                  </td>
                  
                  {/* Grading Score */}
                  <td className="text-right">
                    {card.gradingScore?.score != null ? (
                      <GradingScoreBadge score={card.gradingScore.score} />
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )}
                  </td>
                  
                  {/* Delete Button */}
                  <td className="text-right">
                    <button
                      onClick={(e) => handleDeleteCard(e, card)}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete card"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination Controls */}
      {pageSize !== 'all' && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className="btn btn-secondary px-3 py-2 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-slate-400 px-4">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className="btn btn-secondary px-3 py-2 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
      
      {/* Empty State */}
      {filteredCards.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No cards match your search criteria</p>
        </div>
      )}
      
      {/* Population Edit Modal */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={handleCancelEditPop}>
          <div 
            className="bg-navy-800 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-1">Edit Population Data</h3>
            <p className="text-slate-400 text-sm mb-4">{editingCard.name}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs uppercase tracking-wide mb-2">
                  Total Population
                </label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={editPopTotal}
                  onChange={(e) => setEditPopTotal(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-lg placeholder-slate-500 focus:outline-none focus:border-electric-500"
                  min="0"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-slate-400 text-xs uppercase tracking-wide mb-2">
                  PSA 10 Count
                </label>
                <input
                  type="number"
                  placeholder="e.g. 3500"
                  value={editPopPsa10}
                  onChange={(e) => setEditPopPsa10(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-lg placeholder-slate-500 focus:outline-none focus:border-electric-500"
                  min="0"
                />
              </div>
              
              {editPopTotal && editPopPsa10 && (
                <div className="p-3 rounded-lg bg-electric-500/10 border border-electric-500/20">
                  <p className="text-slate-400 text-sm">
                    Calculated Rate:{' '}
                    <span className="text-electric-400 font-semibold">
                      {((parseInt(editPopPsa10, 10) / parseInt(editPopTotal, 10)) * 100).toFixed(1)}%
                    </span>
                  </p>
                </div>
              )}
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCancelEditPop}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePopulation}
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 rounded-xl bg-electric-500 text-white hover:bg-electric-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ label, value, highlight = false, warning = false, error = false, onClick }) => (
  <div 
    className={`glass rounded-xl p-4 ${onClick ? 'cursor-pointer hover:bg-white/10 transition-colors' : ''} ${warning ? 'ring-1 ring-amber-500/50' : ''} ${error ? 'ring-1 ring-red-500/50' : ''}`}
    onClick={onClick}
  >
    <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">{label}</p>
    <p className={`font-mono text-lg font-semibold ${
      error ? 'text-red-400' :
      warning ? 'text-amber-400' : 
      highlight ? 'text-electric-400' : 'text-white'
    }`}>
      {value}
    </p>
  </div>
);

// Grading Score Badge
const GradingScoreBadge = ({ score }) => {
  let colorClass = 'bg-slate-500/20 text-slate-400';
  
  if (score >= 90) {
    colorClass = 'bg-psa-excellent/20 text-psa-excellent';
  } else if (score >= 70) {
    colorClass = 'bg-psa-good/20 text-psa-good';
  } else if (score >= 50) {
    colorClass = 'bg-psa-legendary/20 text-psa-legendary';
  } else {
    colorClass = 'bg-psa-rare/20 text-psa-rare';
  }
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
      <TrendingUp size={12} />
      {score}
    </span>
  );
};

export default CardTable;
