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
export const calculateGradingScore = (card) => {
  const { pricing, population } = card;
  
  if (!pricing?.psa10 || !pricing?.nearMint || !population?.psa10Rate) {
    return { score: null, recommendation: 'N/A', reasoning: 'Insufficient data' };
  }
  
  let score = 0;
  const reasons = [];
  
  // Price Multiple factor (40% weight)
  const multiple = pricing.priceMultiple || 0;
  if (multiple >= 20) {
    score += 40;
    reasons.push(`Exceptional multiple (${multiple.toFixed(1)}x)`);
  } else if (multiple >= 10) {
    score += 32;
    reasons.push(`High multiple (${multiple.toFixed(1)}x)`);
  } else if (multiple >= 5) {
    score += 24;
    reasons.push(`Good multiple (${multiple.toFixed(1)}x)`);
  } else if (multiple >= 2) {
    score += 16;
    reasons.push(`Moderate multiple (${multiple.toFixed(1)}x)`);
  } else {
    score += 8;
    reasons.push(`Low multiple (${multiple.toFixed(1)}x)`);
  }
  
  // PSA 10 Rate factor (30% weight) - lower is better
  const rate = population.psa10Rate;
  if (rate < 1) {
    score += 30;
    reasons.push(`Very rare PSA 10 (${rate.toFixed(1)}%)`);
  } else if (rate < 5) {
    score += 24;
    reasons.push(`Rare PSA 10 (${rate.toFixed(1)}%)`);
  } else if (rate < 10) {
    score += 18;
    reasons.push(`Moderate PSA 10 rate (${rate.toFixed(1)}%)`);
  } else if (rate < 15) {
    score += 12;
    reasons.push(`Common PSA 10 rate (${rate.toFixed(1)}%)`);
  } else {
    score += 6;
    reasons.push(`High PSA 10 rate (${rate.toFixed(1)}%)`);
  }
  
  // PSA 10 Value factor (20% weight)
  const psa10Value = pricing.psa10;
  if (psa10Value >= 1000) {
    score += 20;
    reasons.push(`High PSA 10 value ($${psa10Value.toLocaleString()})`);
  } else if (psa10Value >= 500) {
    score += 16;
    reasons.push(`Good PSA 10 value ($${psa10Value.toLocaleString()})`);
  } else if (psa10Value >= 100) {
    score += 12;
    reasons.push(`Moderate PSA 10 value ($${psa10Value.toLocaleString()})`);
  } else if (psa10Value >= 50) {
    score += 8;
    reasons.push(`Low PSA 10 value ($${psa10Value.toLocaleString()})`);
  } else {
    score += 4;
  }
  
  // Market liquidity factor (10% weight) - based on total population
  const totalPop = population.total || 0;
  if (totalPop >= 1000) {
    score += 10;
  } else if (totalPop >= 500) {
    score += 8;
  } else if (totalPop >= 100) {
    score += 6;
  } else if (totalPop >= 50) {
    score += 4;
  } else {
    score += 2;
  }
  
  // Determine recommendation
  let recommendation;
  if (score >= 90) recommendation = 'EXCELLENT';
  else if (score >= 70) recommendation = 'GOOD';
  else if (score >= 50) recommendation = 'MODERATE';
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
