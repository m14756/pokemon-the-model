import { useState, useCallback } from 'react';
import { Upload, FileText, Download, AlertCircle, CheckCircle, Loader2, BarChart3, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import useStore from '../store/useStore';
import { processAndSaveCards, dbRowsToCards } from '../api/database';
import { isSupabaseConfigured } from '../api/supabase';
import { generateSampleCSV, downloadFile } from '../utils/helpers';

const FileUpload = () => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [parsedCards, setParsedCards] = useState([]);
  const [progressMessage, setProgressMessage] = useState('');
  
  const { 
    addCards,
    setLoading, 
    isLoading, 
    uploadProgress, 
    setUploadProgress,
    setError,
    cards,
    isDbConfigured,
  } = useStore();
  
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const parseCSVFile = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(results.errors[0].message));
            return;
          }
          
          // Find the columns
          const headers = results.meta.fields.map(f => f.toLowerCase());
          const nameCol = results.meta.fields.find(f => 
            f.toLowerCase().includes('name') || f.toLowerCase().includes('card')
          );
          const setCol = results.meta.fields.find(f => 
            f.toLowerCase().includes('set') || f.toLowerCase().includes('expansion')
          );
          const numberCol = results.meta.fields.find(f => 
            f.toLowerCase().includes('number') || f.toLowerCase().includes('num') || f.toLowerCase() === '#'
          );
          
          if (!nameCol) {
            reject(new Error('CSV must have a "Card Name" or "Name" column'));
            return;
          }
          if (!setCol) {
            reject(new Error('CSV must have a "Set Name" or "Set" column'));
            return;
          }
          
          const cards = results.data
            .filter(row => row[nameCol] && row[setCol])
            .map((row, index) => ({
              id: `card-${index}-${Date.now()}`,
              name: row[nameCol].trim(),
              set: row[setCol].trim(),
              number: numberCol ? row[numberCol]?.trim() || '' : '',
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
            }));
          
          if (cards.length === 0) {
            reject(new Error('No valid card data found in CSV'));
            return;
          }
          
          resolve(cards);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  };
  
  const handleFile = async (selectedFile) => {
    setParseError(null);
    setParsedCards([]);
    
    if (!selectedFile) return;
    
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    const isValidType = validTypes.includes(selectedFile.type) || 
                        selectedFile.name.endsWith('.csv');
    
    if (!isValidType) {
      setParseError('Please upload a CSV file');
      return;
    }
    
    if (selectedFile.size > 5 * 1024 * 1024) {
      setParseError('File size must be under 5MB');
      return;
    }
    
    setFile(selectedFile);
    
    try {
      const cards = await parseCSVFile(selectedFile);
      
      if (cards.length > 1000) {
        setParseError('Maximum 1,000 cards per upload');
        return;
      }
      
      setParsedCards(cards);
    } catch (error) {
      setParseError(error.message);
    }
  };
  
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    handleFile(droppedFile);
  }, []);
  
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    handleFile(selectedFile);
  };
  
  const handleProcessCards = async () => {
    if (parsedCards.length === 0) return;
    
    setLoading(true);
    setUploadProgress(0);
    setProgressMessage('Starting...');
    setError(null);
    
    try {
      // Process and save cards to database (client-side - no timeout!)
      const savedCards = await processAndSaveCards(parsedCards, (percent, message) => {
        setUploadProgress(percent);
        if (message) setProgressMessage(message);
      });
      
      // Transform to frontend format and add to store
      const frontendCards = dbRowsToCards(savedCards);
      addCards(frontendCards);
      
      setLoading(false);
      setProgressMessage('');
      navigate('/collection');
    } catch (error) {
      setError(error.message);
      setLoading(false);
      setProgressMessage('');
    }
  };
  
  const handleDownloadTemplate = () => {
    const csv = generateSampleCSV();
    downloadFile(csv, 'pokemon-cards-template.csv');
  };
  
  const resetUpload = () => {
    setFile(null);
    setParsedCards([]);
    setParseError(null);
  };
  
  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="font-display text-4xl sm:text-5xl text-white mb-4">
          ANALYZE YOUR <span className="text-gradient">LIST</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-lg mx-auto">
          Upload your Pokémon card list to instantly get Near Mint prices, PSA graded values, and population data.
          {cards.length > 0 && (
            <> Currently tracking <span className="text-electric-400 font-semibold">{cards.length}</span> cards.</>
          )}
        </p>
        {!isDbConfigured && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
            <AlertCircle size={16} />
            Demo mode - database not configured
          </div>
        )}
      </div>
      
      {/* Upload Zone */}
      {!file ? (
        <div
          className={`drop-zone ${isDragging ? 'active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-electric-500/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-electric-400" />
            </div>
            <div>
              <p className="text-white font-semibold mb-1">
                Drop your CSV file here
              </p>
              <p className="text-slate-500 text-sm">
                or click to browse (max 1,000 cards, 5MB)
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-6">
          {/* File Info */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-electric-500/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-electric-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{file.name}</p>
              <p className="text-slate-500 text-sm">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            {!isLoading && (
              <button
                onClick={resetUpload}
                className="text-slate-400 hover:text-white text-sm"
              >
                Change
              </button>
            )}
          </div>
          
          {/* Parse Result */}
          {parseError ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-6">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{parseError}</p>
            </div>
          ) : parsedCards.length > 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20 mb-6">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-green-400 text-sm">
                Found <span className="font-semibold">{parsedCards.length}</span> cards ready to process
              </p>
            </div>
          ) : null}
          
          {/* Progress Bar */}
          {isLoading && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm truncate max-w-[70%]">
                  {progressMessage || 'Processing cards...'}
                </span>
                <span className="text-white text-sm font-medium">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-electric-500 to-electric-400 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-slate-500 text-xs mt-2">
                This may take a few minutes for large collections. Don't close this page.
              </p>
            </div>
          )}
          
          {/* Action Button */}
          {!parseError && parsedCards.length > 0 && (
            <button
              onClick={handleProcessCards}
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : cards.length > 0 ? (
                <>
                  <Plus className="w-5 h-5" />
                  Add {parsedCards.length} Cards to Collection
                </>
              ) : (
                <>
                  <BarChart3 className="w-5 h-5" />
                  Get Prices & Data
                </>
              )}
            </button>
          )}
        </div>
      )}
      
      {/* Template Download */}
      <div className="mt-8 text-center">
        <p className="text-slate-500 text-sm mb-3">
          Need a template? Download our sample CSV format.
        </p>
        <button
          onClick={handleDownloadTemplate}
          className="btn btn-ghost text-sm"
        >
          <Download className="w-4 h-4" />
          Download Template
        </button>
      </div>
      
      {/* Format Info */}
      <div className="mt-12 glass rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4">CSV Format Requirements</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-electric-500/20 text-electric-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
              1
            </div>
            <div>
              <p className="text-white font-medium">Card Name</p>
              <p className="text-slate-500">Required. The name of the card (e.g., "Charizard")</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-electric-500/20 text-electric-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
              2
            </div>
            <div>
              <p className="text-white font-medium">Set Name</p>
              <p className="text-slate-500">Required. The set name (e.g., "Base Set")</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-white/10 text-slate-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
              3
            </div>
            <div>
              <p className="text-white font-medium">Card Number</p>
              <p className="text-slate-500">Optional. Improves matching (e.g., "4/102")</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
