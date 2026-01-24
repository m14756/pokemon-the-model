import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2 } from 'lucide-react';
import CardTable from '../components/CardTable';
import useStore from '../store/useStore';

const CollectionPage = () => {
  const navigate = useNavigate();
  const { cards, isLoading, isInitialized } = useStore();
  
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
          
          <button
            onClick={() => navigate('/')}
            className="btn btn-secondary self-start"
          >
            <Upload size={18} />
            New Upload
          </button>
        </div>
        
        {/* Card Table */}
        <CardTable />
      </div>
    </div>
  );
};

export default CollectionPage;
