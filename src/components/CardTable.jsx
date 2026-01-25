import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronUp, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search, 
  Filter, 
  X,
  ArrowUpDown,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Trash2,
  Clock,
  Loader2,
  CheckSquare,
  Square
} from 'lucide-react';
import useStore from '../store/useStore';
import { formatCurrency, formatPercent, formatMultiple, formatNumber, getPsa10RateCategory } from '../utils/helpers';
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

const PAGE_SIZE_OPTIONS = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
  { value: 'all', label: 'All' },
];

const CardTable = () => {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  
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
  
  // Check if a card has missing population
  const hasMissingPopulation = (card) => !card.population?.total || !card.population?.psa10;
  
  const handleSort = (column) => {
    if (sortBy === column) {
      toggleSortOrder();
    } else {
      setSortBy(column);
    }
  };
  
  const handleCardClick = (card) => {
    setSelectedCardId(card.id);
    navigate(`/card/${card.id}`);
  };
  
  const handleDeleteCard = async (e, card) => {
    e.stopPropagation(); // Prevent row click
    if (window.confirm(`Delete "${card.name}" from your collection?`)) {
      await removeCard(card.id);
      // Remove from selected if it was selected
      setSelectedCards(prev => {
        const next = new Set(prev);
        next.delete(card.id);
        return next;
      });
    }
  };
  
  // Mass selection handlers
  const handleSelectCard = (e, cardId) => {
    e.stopPropagation();
    setSelectedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };
  
  const handleSelectAll = () => {
    if (selectedCards.size === paginatedCards.length && paginatedCards.every(c => selectedCards.has(c.id))) {
      // Deselect all on current page
      setSelectedCards(prev => {
        const next = new Set(prev);
        paginatedCards.forEach(c => next.delete(c.id));
        return next;
      });
    } else {
      // Select all on current page
      setSelectedCards(prev => {
        const next = new Set(prev);
        paginatedCards.forEach(c => next.add(c.id));
        return next;
      });
    }
  };
  
  const handleSelectAllFiltered = () => {
    // Select ALL filtered cards (not just current page)
    setSelectedCards(new Set(filteredCards.map(c => c.id)));
  };
  
  const handleMassDelete = async () => {
    if (selectedCards.size === 0) return;
    
    const confirmMsg = `Delete ${selectedCards.size} card${selectedCards.size > 1 ? 's' : ''} from your collection?\n\nThis cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;
    
    setIsDeleting(true);
    
    try {
      // Delete all selected cards
      for (const cardId of selectedCards) {
        await removeCard(cardId);
      }
      setSelectedCards(new Set());
    } catch (error) {
      console.error('Error deleting cards:', error);
    } finally {
      setIsDeleting(false);
    }
  };
  
  const clearSelection = () => {
    setSelectedCards(new Set());
  };
  
  // Check if all cards on current page are selected
  const allPageSelected = paginatedCards.length > 0 && paginatedCards.every(c => selectedCards.has(c.id));
  const somePageSelected = paginatedCards.some(c => selectedCards.has(c.id));
  
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
  
  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
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
      </div>
      
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
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
        
        {/* Page Size Selector */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-sm whitespace-nowrap">Show:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="input w-20"
          >
            {PAGE_SIZE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Sort Dropdown */}
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
            {/* Set Filter */}
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
            
            {/* Missing Population Filter */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">
                Data Status
              </label>
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
            </div>
            
            {/* Grading Score Range (NEW) */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">
                Grading Score
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minGradingScore || ''}
                  onChange={(e) => setFilter('minGradingScore', e.target.value ? Number(e.target.value) : null)}
                  className="input"
                  min="0"
                  max="100"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxGradingScore || ''}
                  onChange={(e) => setFilter('maxGradingScore', e.target.value ? Number(e.target.value) : null)}
                  className="input"
                  min="0"
                  max="100"
                />
              </div>
            </div>
            
            {/* PSA 10 Rate Range */}
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
            
            {/* Price Multiple Range (NEW) */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">
                Price Multiple
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min x"
                  value={filters.minPriceMultiple || ''}
                  onChange={(e) => setFilter('minPriceMultiple', e.target.value ? Number(e.target.value) : null)}
                  className="input"
                  min="0"
                  step="0.1"
                />
                <input
                  type="number"
                  placeholder="Max x"
                  value={filters.maxPriceMultiple || ''}
                  onChange={(e) => setFilter('maxPriceMultiple', e.target.value ? Number(e.target.value) : null)}
                  className="input"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
            
            {/* NM Price Range (NEW) */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">
                NM Price
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min $"
                  value={filters.minNmPrice || ''}
                  onChange={(e) => setFilter('minNmPrice', e.target.value ? Number(e.target.value) : null)}
                  className="input"
                  min="0"
                />
                <input
                  type="number"
                  placeholder="Max $"
                  value={filters.maxNmPrice || ''}
                  onChange={(e) => setFilter('maxNmPrice', e.target.value ? Number(e.target.value) : null)}
                  className="input"
                  min="0"
                />
              </div>
            </div>
            
            {/* PSA 10 Price Range */}
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
      
      {/* Results count and Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-slate-500 text-sm">
          Showing {paginatedCards.length} of {filteredCards.length} cards
          {filteredCards.length !== stats.totalCards && ` (${stats.totalCards} total)`}
          {filters.missingPopulation && (
            <span className="text-amber-400 ml-2">
              (filtered to missing population data)
            </span>
          )}
        </p>
        
        {/* Pagination Controls */}
        {pageSize !== 'all' && totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === 1
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-electric-500 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === totalPages
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
      
      {/* Mass Delete Toolbar */}
      {selectedCards.size > 0 && (
        <div className="glass rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 border border-electric-500/50 bg-electric-500/10 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-white font-medium">
              {selectedCards.size} card{selectedCards.size > 1 ? 's' : ''} selected
            </span>
            {pageSize !== 'all' && filteredCards.length > paginatedCards.length && selectedCards.size < filteredCards.length && (
              <button
                onClick={handleSelectAllFiltered}
                className="text-electric-400 hover:text-electric-300 text-sm underline"
              >
                Select all {filteredCards.length} filtered cards
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 text-slate-400 hover:text-white text-sm transition-colors"
            >
              Clear selection
            </button>
            <button
              onClick={handleMassDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete Selected
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {/* Select All Checkbox */}
                <th className="w-10">
                  <button
                    onClick={handleSelectAll}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                    title={allPageSelected ? "Deselect all on page" : "Select all on page"}
                  >
                    {allPageSelected ? (
                      <CheckSquare size={18} className="text-electric-400" />
                    ) : somePageSelected ? (
                      <div className="relative">
                        <Square size={18} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-2 h-2 bg-electric-400 rounded-sm" />
                        </div>
                      </div>
                    ) : (
                      <Square size={18} />
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
                  className={`${card.status === 'error' ? 'opacity-50' : ''} ${hasMissingPopulation(card) ? 'bg-amber-500/5' : ''} ${selectedCards.has(card.id) ? 'bg-electric-500/10' : ''}`}
                >
                  {/* Selection Checkbox */}
                  <td className="w-10">
                    <button
                      onClick={(e) => handleSelectCard(e, card.id)}
                      className="p-1 text-slate-400 hover:text-white transition-colors"
                    >
                      {selectedCards.has(card.id) ? (
                        <CheckSquare size={18} className="text-electric-400" />
                      ) : (
                        <Square size={18} />
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
                      {/* Missing population indicator badge */}
                      {hasMissingPopulation(card) && (
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
                  
                  {/* PSA 10 Rate */}
                  <td className="text-right">
                    <PSABadge rate={card.population?.psa10Rate} />
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
      
      {/* Bottom Pagination (for long lists) */}
      {pageSize !== 'all' && totalPages > 1 && paginatedCards.length > 10 && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === 1
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <ChevronLeft size={18} />
            </button>
            
            <span className="text-slate-400 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === totalPages
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {paginatedCards.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No cards match your search criteria</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 text-electric-400 hover:text-electric-300 text-sm"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ label, value, highlight = false, warning = false, onClick }) => (
  <div 
    className={`glass rounded-xl p-4 ${onClick ? 'cursor-pointer hover:bg-white/10 transition-colors' : ''} ${warning ? 'ring-1 ring-amber-500/50' : ''}`}
    onClick={onClick}
  >
    <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">{label}</p>
    <p className={`font-mono text-lg font-semibold ${
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
