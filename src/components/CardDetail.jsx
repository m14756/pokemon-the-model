import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  ExternalLink, 
  TrendingUp, 
  BarChart3,
  DollarSign,
  Award,
  Target
} from 'lucide-react';
import useStore from '../store/useStore';
import { formatCurrency, formatPercent, formatMultiple, formatNumber, getPsa10RateCategory } from '../utils/helpers';
import PSABadge from './PSABadge';

const CardDetail = () => {
  const navigate = useNavigate();
  const { cardId } = useParams();
  const { cards, setSelectedCardId } = useStore();
  
  const card = cards.find(c => c.id === cardId);
  
  if (!card) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 mb-4">Card not found</p>
        <button onClick={() => navigate('/collection')} className="btn btn-primary">
          Back to Collection
        </button>
      </div>
    );
  }
  
  const { category: rateCategory, label: rateLabel } = getPsa10RateCategory(card.population?.psa10Rate);
  
  const getScoreColor = (score) => {
    if (score >= 90) return 'text-psa-excellent';
    if (score >= 70) return 'text-psa-good';
    if (score >= 50) return 'text-psa-legendary';
    return 'text-psa-rare';
  };
  
  const getScoreLabel = (score) => {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 70) return 'GOOD';
    if (score >= 50) return 'MODERATE';
    return 'LOW';
  };
  
  const getScoreBg = (score) => {
    if (score >= 90) return 'from-psa-excellent/20 to-psa-excellent/5';
    if (score >= 70) return 'from-psa-good/20 to-psa-good/5';
    if (score >= 50) return 'from-psa-legendary/20 to-psa-legendary/5';
    return 'from-psa-rare/20 to-psa-rare/5';
  };
  
  return (
    <div className="max-w-5xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/collection')}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft size={20} />
        Back to Collection
      </button>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Card Image */}
        <div className="lg:col-span-1">
          <div className="glass rounded-2xl p-6 sticky top-24">
            <div className="aspect-[2.5/3.5] rounded-xl overflow-hidden bg-gradient-to-br from-navy-700 to-navy-800 flex items-center justify-center holo-effect">
              {card.imageUrl ? (
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-8xl">🃏</span>
              )}
            </div>
            
            {/* External Links */}
            <div className="flex gap-2 mt-4">
              {card.tcgplayerUrl && (
                <a
                  href={card.tcgplayerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary flex-1 text-sm"
                >
                  <ExternalLink size={16} />
                  TCGPlayer
                </a>
              )}
              <a
                href={`https://www.psacard.com/pop`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary flex-1 text-sm"
              >
                <ExternalLink size={16} />
                PSA Pop
              </a>
            </div>
          </div>
        </div>
        
        {/* Card Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              {card.rarity && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-slate-300">
                  {card.rarity}
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-white mb-1">
              {card.name}
            </h1>
            <p className="text-slate-400 text-lg">
              {card.set} {card.number && `• #${card.number}`}
            </p>
          </div>
          
          {/* Pricing Section */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-electric-400" />
              <h2 className="text-lg font-semibold text-white">Pricing</h2>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <PriceCard 
                label="Near Mint" 
                value={card.pricing?.nearMint} 
              />
              <PriceCard 
                label="PSA 9" 
                value={card.pricing?.psa9} 
              />
              <PriceCard 
                label="PSA 10" 
                value={card.pricing?.psa10} 
                highlight 
              />
            </div>
            
            {/* Price Multiple */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gold-500/10 to-transparent border border-gold-500/20">
              <div>
                <p className="text-slate-400 text-sm">Price Multiple</p>
                <p className="text-xs text-slate-500">PSA 10 / Near Mint</p>
              </div>
              <div className="text-right">
                <p className={`font-mono text-2xl font-bold ${
                  (card.pricing?.priceMultiple || 0) >= 10 ? 'text-gold-400' : 'text-white'
                }`}>
                  {formatMultiple(card.pricing?.priceMultiple)}
                </p>
                {(card.pricing?.priceMultiple || 0) >= 10 && (
                  <p className="text-gold-400 text-xs">High multiple!</p>
                )}
              </div>
            </div>
          </div>
          
          {/* PSA Population Section */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-electric-400" />
              <h2 className="text-lg font-semibold text-white">PSA Population</h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <PopCard 
                label="Total Graded" 
                value={formatNumber(card.population?.total)} 
              />
              <PopCard 
                label="PSA 10" 
                value={formatNumber(card.population?.psa10)} 
                subtext={<PSABadge rate={card.population?.psa10Rate} />}
              />
              <PopCard 
                label="PSA 9" 
                value={formatNumber(card.population?.psa9)} 
              />
              <PopCard 
                label="PSA 8" 
                value={formatNumber(card.population?.psa8)} 
              />
            </div>
            
            {/* PSA 10 Rate Visual */}
            {card.population?.psa10Rate != null && (
              <div className="p-4 rounded-xl bg-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">PSA 10 Rate</span>
                  <PSABadge rate={card.population.psa10Rate} />
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      rateCategory === 'excellent' ? 'bg-psa-excellent' :
                      rateCategory === 'good' ? 'bg-psa-good' :
                      rateCategory === 'rare' ? 'bg-psa-rare' :
                      'bg-psa-legendary'
                    }`}
                    style={{ width: `${Math.min(card.population.psa10Rate, 100)}%` }}
                  />
                </div>
                <p className="text-slate-500 text-xs mt-2">
                  {rateLabel} - {
                    rateCategory === 'excellent' ? 'Easy to achieve PSA 10' :
                    rateCategory === 'good' ? 'Moderate grading difficulty' :
                    rateCategory === 'rare' ? 'Difficult to achieve PSA 10' :
                    'Very rare PSA 10 - premium opportunity!'
                  }
                </p>
              </div>
            )}
          </div>
          
          {/* Grading Opportunity Section */}
          {card.gradingScore?.score != null && (
            <div className={`glass rounded-2xl p-6 bg-gradient-to-br ${getScoreBg(card.gradingScore.score)}`}>
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-electric-400" />
                <h2 className="text-lg font-semibold text-white">Grading Opportunity</h2>
              </div>
              
              <div className="flex items-center gap-6 mb-4">
                {/* Score Circle */}
                <div className="relative">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-white/10"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(card.gradingScore.score / 100) * 251.2} 251.2`}
                      strokeLinecap="round"
                      className={getScoreColor(card.gradingScore.score)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`font-mono text-2xl font-bold ${getScoreColor(card.gradingScore.score)}`}>
                      {card.gradingScore.score}
                    </span>
                  </div>
                </div>
                
                {/* Recommendation */}
                <div>
                  <p className={`font-display text-2xl ${getScoreColor(card.gradingScore.score)}`}>
                    {getScoreLabel(card.gradingScore.score)}
                  </p>
                  <p className="text-slate-400 text-sm">Grading Recommendation</p>
                </div>
              </div>
              
              {/* Reasoning */}
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-slate-400 text-sm mb-1">Analysis</p>
                <p className="text-white">{card.gradingScore.reasoning}</p>
              </div>
            </div>
          )}
          
          {/* Last Updated */}
          {card.pricing?.lastUpdated && (
            <p className="text-slate-500 text-xs text-right">
              Last updated: {new Date(card.pricing.lastUpdated).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Price Card Component
const PriceCard = ({ label, value, highlight = false }) => (
  <div className={`p-4 rounded-xl ${highlight ? 'bg-electric-500/10 border border-electric-500/20' : 'bg-white/5'}`}>
    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">{label}</p>
    <p className={`font-mono text-xl font-semibold ${highlight ? 'text-electric-400' : 'text-white'}`}>
      {formatCurrency(value)}
    </p>
  </div>
);

// Population Card Component
const PopCard = ({ label, value, subtext }) => (
  <div className="p-4 rounded-xl bg-white/5">
    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">{label}</p>
    <p className="font-mono text-xl font-semibold text-white">{value}</p>
    {subtext && <div className="mt-1">{subtext}</div>}
  </div>
);

export default CardDetail;
