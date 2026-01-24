import { formatPercent, getPsa10RateCategory } from '../utils/helpers';

const PSABadge = ({ rate }) => {
  if (rate == null) {
    return <span className="text-slate-500 text-xs">N/A</span>;
  }
  
  const { category } = getPsa10RateCategory(rate);
  
  const badgeClasses = {
    legendary: 'psa-badge-legendary',
    rare: 'psa-badge-rare',
    good: 'psa-badge-good',
    excellent: 'psa-badge-excellent',
    unknown: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };
  
  return (
    <span className={`psa-badge ${badgeClasses[category]}`}>
      {category === 'legendary' && '🔥 '}
      {formatPercent(rate)}
    </span>
  );
};

export default PSABadge;
