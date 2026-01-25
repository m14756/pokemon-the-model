// Format currency
export const formatCurrency = (value) => {
  if (value == null || isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Format percentage
export const formatPercent = (value, decimals = 1) => {
  if (value == null || isNaN(value)) return 'N/A';
  return `${value.toFixed(decimals)}%`;
};

// Format multiple (e.g., "8.5x")
export const formatMultiple = (value) => {
  if (value == null || isNaN(value)) return 'N/A';
  return `${value.toFixed(1)}x`;
};

// Format large numbers with commas
export const formatNumber = (value) => {
  if (value == null || isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-US').format(value);
};

// Calculate PSA 10 Rate
export const calculatePsa10Rate = (psa10Count, totalCount) => {
  if (!psa10Count || !totalCount || totalCount === 0) return null;
  return (psa10Count / totalCount) * 100;
};

// Calculate Price Multiple
export const calculatePriceMultiple = (psa10Price, nearMintPrice) => {
  if (!psa10Price || !nearMintPrice || nearMintPrice === 0) return null;
  return psa10Price / nearMintPrice;
};

// Get PSA 10 Rate category and color
export const getPsa10RateCategory = (rate) => {
  if (rate == null) return { category: 'unknown', color: 'gray', label: 'N/A' };
  if (rate < 1) return { category: 'legendary', color: 'orange', label: 'Legendary' };
  if (rate < 5) return { category: 'rare', color: 'red', label: 'Rare' };
  if (rate < 15) return { category: 'good', color: 'yellow', label: 'Moderate' };
  return { category: 'excellent', color: 'green', label: 'Common' };
};

// Calculate grading opportunity score (0-100)
// Based on two factors:
// 1. Price Multiple (50%) - How much more valuable is PSA 10 vs raw?
// 2. PSA 10 Rate (50%) - How rare/difficult is it to get a PSA 10?
export const calculateGradingScore = (card) => {
  const { pricing, population } = card;
  
  // Need price multiple and PSA 10 rate to calculate
  if (!pricing?.psa10 || !pricing?.nearMint || !population?.psa10Rate) {
    return { score: null, recommendation: 'N/A', reasoning: 'Insufficient data' };
  }
  
  let score = 0;
  const reasons = [];
  
  // Price Multiple factor (50% weight)
  // Higher multiple = better grading opportunity
  const multiple = pricing.priceMultiple || 0;
  if (multiple >= 20) {
    score += 50;
    reasons.push(`Exceptional ${multiple.toFixed(1)}x multiple`);
  } else if (multiple >= 10) {
    score += 40;
    reasons.push(`High ${multiple.toFixed(1)}x multiple`);
  } else if (multiple >= 5) {
    score += 30;
    reasons.push(`Good ${multiple.toFixed(1)}x multiple`);
  } else if (multiple >= 3) {
    score += 20;
    reasons.push(`Moderate ${multiple.toFixed(1)}x multiple`);
  } else if (multiple >= 2) {
    score += 10;
    reasons.push(`Low ${multiple.toFixed(1)}x multiple`);
  } else {
    score += 5;
    reasons.push(`Minimal ${multiple.toFixed(1)}x multiple`);
  }
  
  // PSA 10 Rate factor (50% weight) - lower is better
  // Lower rate = harder to get PSA 10 = more valuable when achieved
  const rate = population.psa10Rate;
  if (rate < 5) {
    score += 50;
    reasons.push(`rare ${rate.toFixed(1)}% PSA 10 rate`);
  } else if (rate < 15) {
    score += 40;
    reasons.push(`low ${rate.toFixed(1)}% PSA 10 rate`);
  } else if (rate < 30) {
    score += 30;
    reasons.push(`moderate ${rate.toFixed(1)}% PSA 10 rate`);
  } else if (rate < 50) {
    score += 20;
    reasons.push(`common ${rate.toFixed(1)}% PSA 10 rate`);
  } else if (rate < 70) {
    score += 10;
    reasons.push(`high ${rate.toFixed(1)}% PSA 10 rate`);
  } else {
    score += 5;
    reasons.push(`very high ${rate.toFixed(1)}% PSA 10 rate`);
  }
  
  // Determine recommendation
  let recommendation;
  if (score >= 80) recommendation = 'EXCELLENT';
  else if (score >= 60) recommendation = 'GOOD';
  else if (score >= 40) recommendation = 'MODERATE';
  else recommendation = 'LOW';
  
  return {
    score,
    recommendation,
    reasoning: reasons.join(' + '),
  };
};

// Parse CSV content
export const parseCSV = (content) => {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }
  
  // Parse header
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  // Find column indices
  const nameIndex = header.findIndex(h => 
    h.includes('name') || h.includes('card')
  );
  const setIndex = header.findIndex(h => 
    h.includes('set') || h.includes('expansion')
  );
  const numberIndex = header.findIndex(h => 
    h.includes('number') || h.includes('num') || h.includes('#')
  );
  
  if (nameIndex === -1) {
    throw new Error('CSV must have a "Card Name" or "Name" column');
  }
  if (setIndex === -1) {
    throw new Error('CSV must have a "Set Name" or "Set" column');
  }
  
  // Parse data rows
  const cards = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle quoted values with commas
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const name = values[nameIndex];
    const set = values[setIndex];
    const number = numberIndex !== -1 ? values[numberIndex] : null;
    
    if (name && set) {
      cards.push({
        id: `${i}-${Date.now()}`,
        name,
        set,
        number: number || '',
        rarity: '',
        imageUrl: '',
        tcgplayerUrl: '',
        pricing: {
          nearMint: null,
          psa9: null,
          psa10: null,
          priceMultiple: null,
          lastUpdated: null,
        },
        population: {
          total: null,
          psa10: null,
          psa9: null,
          psa8: null,
          psa10Rate: null,
          lastUpdated: null,
        },
        gradingScore: {
          score: null,
          recommendation: 'N/A',
          reasoning: 'Loading...',
        },
        status: 'pending',
        error: null,
      });
    }
  }
  
  if (cards.length === 0) {
    throw new Error('No valid card data found in CSV');
  }
  
  return cards;
};

// Generate sample CSV for download
export const generateSampleCSV = () => {
  const header = 'Card Name,Set Name,Card Number';
  const rows = [
    'Charizard,Base Set,4/102',
    'Pikachu,Jungle,60/64',
    'Blastoise,Base Set,2/102',
    'Venusaur,Base Set,15/102',
    'Mewtwo,Base Set,10/102',
  ];
  return [header, ...rows].join('\n');
};

// Download helper
export const downloadFile = (content, filename, type = 'text/csv') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Debounce function
export const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// Truncate text
export const truncate = (text, maxLength = 20) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};
