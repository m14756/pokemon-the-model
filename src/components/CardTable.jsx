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
  ChevronLeft,
  ChevronRight,
  Square,
  CheckSquare,
  Minus
} from 'lucide-react';
import useStore from '../store/useStore';
import { deleteCards as dbDeleteCards } from '../api/database';
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

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 'all'];

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
    setCards,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
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
    setSelectedCardId(card.id);
    navigate(`/card/${card.id}`);
  };
  
  const handleDeleteCard = async (e, card) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${card.name}" from your collection?`)) {
      await removeCard(card.id);
      setSelectedCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(card.id);
        return newSet;
      });
    }
  };
  
  // Checkbox selection handlers
  const handleSelectCard = (e, cardId) => {
    e.stopPropagation();
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };
  
  const handleSelectAll = () => {
    if (selectedCards.size === paginatedCards.length) {
      // Deselect all
      setSelectedCards(new Set());
    } else {
      // Select all visible cards
      setSelectedCards(new Set(paginatedCards.map(c => c.id)));
    }
  };
  
  const handleDeleteSelected = async () => {
    if (selectedCards.size === 0) return;
    
    const count = selectedCards.size;
    if (!window.confirm(`Delete ${count} selected card${count > 1 ? 's' : ''}?`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const idsToDelete = Array.from(selectedCards);
      await dbDeleteCards(idsToDelete);
      
      // Update local state
      setCards(cards.filter(c => !selectedCards.has(c.id)));
      setSelectedCards(new Set());
    } catch (error) {
      console.error('Failed to delete cards:', error);
      alert('Failed to delete some cards. Please try again.');
    } finally {
      setIsDeleting(false);
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
  
  // Selection state for header checkbox
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
      
      {/* Mass Delete Bar */}
      {selectedCards.size > 0 && (
        <div className="flex items-center gap-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <span className="text-white text-sm">
            <span className="font-semibold">{selectedCards.size}</span> card{selectedCards.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleDeleteSelected}
            disabled={isDeleting}
            className="btn bg-red-500 hover:bg-red-600 text-white text-sm py-1.5 px-3"
          >
            <Trash2 size={16} />
            {isDeleting ? 'Deleting...' : 'Delete Selected'}
          </button>
          <button
            onClick={() => setSelectedCards(new Set())}
            className="text-slate-400 hover:text-white text-sm"
          >
            Clear Selection
          </button>
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
            
            {/* Data Status Filters */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">
                Data Status
              </label>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setFilter('missingPopulation', !filters.missingPopulation)}
                  className={`w-full px-3 py-1.5 rounded-lg border transition-colors flex items-center justify-center gap-2 text-sm ${
                    filters.missingPopulation 
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' 
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <AlertTriangle size={14} />
                  Missing Pop
                </button>
                <button
                  onClick={() => setFilter('notFound', !filters.notFound)}
                  className={`w-full px-3 py-1.5 rounded-lg border transition-colors flex items-center justify-center gap-2 text-sm ${
                    filters.notFound 
                      ? 'bg-red-500/20 border-red-500/50 text-red-400' 
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <AlertCircle size={14} />
                  Not Found
                </button>
              </div>
            </div>
            
            {/* PSA 10 Rate Range */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">
                PSA 10 Rate (%)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPsa10Rate || ''}
                  onChange={(e) => setFilter('minPsa10Rate', e.target.value ? Number(e.target.value) : null)}
                  className="input"
                  min="0"
                  max="100"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPsa10Rate || ''}
                  onChange={(e) => setFilter('maxPsa10Rate', e.target.value ? Number(e.target.value) : null)}
                  className="input"
                  min="0"
                  max="100"
                />
              </div>
            </div>
            
            {/* PSA 10 Price Range */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">
                PSA 10 Price ($)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice || ''}
                  onChange={(e) => setFilter('minPrice', e.target.value ? Number(e.target.value) : null)}
                  className="input"
                  min="0"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice || ''}
                  onChange={(e) => setFilter('maxPrice', e.target.value ? Number(e.target.value) : null)}
                  className="input"
                  min="0"
                />
              </div>
            </div>
          </div>
          
          {/* Second row of filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* NM Price Range */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">
                NM Price ($)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minNmPrice || ''}
                  onChange={(e) => setFilter('minNmPrice', e.target.value ? Number(e.target.value) : null)}
                  className="input"
                  min="0"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxNmPrice || ''}
                  onChange={(e) => setFilter('maxNmPrice', e.target.value ? Number(e.target.value) : null)}
                  className="input"
                  min="0"
                />
              </div>
            </div>
            
            {/* Price Multiple Range */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">
                Price Multiple (x)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPriceMultiple || ''}
                  onChange={(e) => setFilter('minPriceMultiple', e.target.value ? Number(e.target.value) : null)}
                  className="input"
                  min="0"
                  step="0.1"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPriceMultiple || ''}
                  onChange={(e) => setFilter('maxPriceMultiple', e.target.value ? Number(e.target.value) : null)}
                  className="input"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
            
            {/* Grading Score Range */}
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
            
            {/* Page Size */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">
                Cards Per Page
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="input"
              >
                {PAGE_SIZE_OPTIONS.map(size => (
                  <option key={size} value={size}>
                    {size === 'all' ? 'Show All' : size}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
      
      {/* Results count and pagination info */}
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">
          Showing {paginatedCards.length} of {filteredCards.length} cards
          {filteredCards.length !== stats.totalCards && ` (${stats.totalCards} total)`}
        </p>
        
        {/* Pagination Controls */}
        {pageSize !== 'all' && totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-slate-400 text-sm px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
      
      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {/* Checkbox column */}
                <th className="w-10">
                  <button
                    onClick={handleSelectAll}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                  >
                    {allSelected ? (
                      <CheckSquare size={18} className="text-electric-400" />
                    ) : someSelected ? (
                      <Minus size={18} className="text-electric-400" />
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
                  {/* Checkbox */}
                  <td className="w-10" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleSelectCard(e, card.id)}
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
      
      {/* Bottom Pagination */}
      {pageSize !== 'all' && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
          >
            First
          </button>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-slate-400 text-sm px-4">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
          >
            Last
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
  
  if (score >= 80) {
    colorClass = 'bg-psa-excellent/20 text-psa-excellent';
  } else if (score >= 60) {
    colorClass = 'bg-psa-good/20 text-psa-good';
  } else if (score >= 40) {
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
