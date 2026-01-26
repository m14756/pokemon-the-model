import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, RefreshCw, Clock } from 'lucide-react';
import CardTable from '../components/CardTable';
import useStore from '../store/useStore';

const CollectionPage = () => {
  const navigate = useNavigate();
  const { cards, isLoading, isInitialized, lastSyncTime, isResyncing, resyncProgress, resyncAllCards } = useStore();
  const [resyncResult, setResyncResult] = useState(null);
  
  const handleResyncAll = async () => {
    if (isResyncing) return;
    
    const confirmed = window.confirm(
      `This will refresh prices for all ${cards.length} cards.\n\nThis uses ${cards.length} API calls and may take a few minutes.\n\nContinue?`
    );
    
    if (!confirmed) return;
    
    setResyncResult(null);
    try {
      const result = await resyncAllCards();
      setResyncResult(result);
      setTimeout(() => setResyncResult(null), 5000);
    } catch (error) {
      console.error('Resync failed:', error);
    }
  };
  
  const formatLastSync = (isoString) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };
  
  // Show loading while initializing from database
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-electric-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading collection...</p>
        </div>
      </div>
    );
  }
  
  if (cards.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
            <Upload className="w-10 h-10 text-slate-600" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No Cards Yet</h2>
          <p className="text-slate-400 mb-6">Upload a CSV file to start tracking your collection</p>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary"
          >
            <Upload size={20} />
            Upload Cards
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-electric-500/10 rounded-full blur-[128px]" />
      </div>
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl text-white">
              YOUR <span className="text-gradient">COLLECTION</span>
            </h1>
            <p className="text-slate-400 mt-1">
              Analyze prices, PSA data, and grading opportunities
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleResyncAll}
              disabled={isResyncing}
              className="btn btn-secondary self-start"
            >
              <RefreshCw size={18} className={isResyncing ? 'animate-spin' : ''} />
              {isResyncing ? 'Syncing...' : 'Refresh Prices'}
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn btn-secondary self-start"
            >
              <Upload size={18} />
              New Upload
            </button>
          </div>
        </div>
        
        {/* Resync Progress */}
        {isResyncing && resyncProgress && (
          <div className="mb-6 p-4 rounded-xl bg-electric-500/10 border border-electric-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium">Refreshing prices...</span>
              <span className="text-electric-400">{resyncProgress.current}/{resyncProgress.total}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-electric-500 rounded-full transition-all duration-300"
                style={{ width: `${(resyncProgress.current / resyncProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-slate-400 text-sm">Processing: {resyncProgress.cardName}</p>
          </div>
        )}
        
        {/* Resync Result */}
        {resyncResult && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <p className="text-green-400">
              ✓ Refreshed {resyncResult.successCount} cards
              {resyncResult.failCount > 0 && ` (${resyncResult.failCount} failed)`}
            </p>
          </div>
        )}
        
        {/* Last Sync Time */}
        <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
          <Clock size={14} />
          <span>Last price refresh: {formatLastSync(lastSyncTime)}</span>
        </div>
        
        {/* Card Table */}
        <CardTable />
      </div>
    </div>
  );
};

export default CollectionPage;
