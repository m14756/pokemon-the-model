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
  TrendingUp,
  Trash2,
  Clock
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

const CardTable = () => {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  
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
    getCollectionStats,
    getUniqueSets,
    setSelectedCardId,
    removeCard,
  } = useStore();
  
  const cards = getFilteredCards();
  const stats = getCollectionStats();
  const sets = getUniqueSets();
  
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
  
  const hasActiveFilters = Object.values(filters).some(v => v !== null);
  
  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
            
            {/* Price Range */}
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
      
      {/* Results count */}
      <p className="text-slate-500 text-sm">
        Showing {cards.length} of {stats.totalCards} cards
      </p>
      
      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
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
              {cards.map((card) => (
                <tr
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  className={card.status === 'error' ? 'opacity-50' : ''}
                >
                  {/* Image */}
                  <td className="w-16">
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
      
      {/* Empty State */}
      {cards.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No cards match your search criteria</p>
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ label, value, highlight = false }) => (
  <div className="glass rounded-xl p-4">
    <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">{label}</p>
    <p className={`font-mono text-lg font-semibold ${highlight ? 'text-electric-400' : 'text-white'}`}>
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
