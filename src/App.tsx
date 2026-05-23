import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Terminal, 
  Hash, 
  User, 
  MessageSquare, 
  Database, 
  Mail, 
  Sparkles, 
  Cpu, 
  Copy, 
  Check, 
  Download, 
  Search, 
  Trash2, 
  History, 
  BookOpen, 
  AlertTriangle, 
  Info, 
  ShieldCheck, 
  FileCode, 
  ExternalLink,
  ChevronRight,
  RefreshCw,
  HelpCircle,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SAMPLE_DATASETS } from './data';
import { ExtractedId, ParseHistoryItem } from './types';

// Type mapping helper for styling badges and highlights
const TYPE_CONFIG = {
  user: {
    label: 'User Profile / Handle',
    icon: User,
    color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/20',
    highlightBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25',
    pill: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
  },
  channel: {
    label: 'Channel / Chat Target',
    icon: MessageSquare,
    color: 'text-amber-400 bg-amber-950/40 border-amber-500/20',
    highlightBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25',
    pill: 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
  },
  database_resource: {
    label: 'Database ID / Primary Key',
    icon: Database,
    color: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/20',
    highlightBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25',
    pill: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
  },
  email: {
    label: 'Electronic Mail Address',
    icon: Mail,
    color: 'text-violet-400 bg-violet-950/40 border-violet-500/20',
    highlightBg: 'bg-violet-500/15 border-violet-500/30 text-violet-300 hover:bg-violet-500/25',
    pill: 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
  },
  other: {
    label: 'System Code / Hash',
    icon: Hash,
    color: 'text-zinc-400 bg-zinc-900 border-zinc-800',
    highlightBg: 'bg-zinc-500/15 border-zinc-500/30 text-zinc-300 hover:bg-zinc-500/25',
    pill: 'bg-zinc-800 text-zinc-300 border border-zinc-700'
  }
};

export default function App() {
  // Input parameters
  const [inputText, setInputText] = useState<string>('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['user', 'channel', 'database_resource', 'email', 'other']);
  const [customPattern, setCustomPattern] = useState<string>('');
  
  // App state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [results, setResults] = useState<ExtractedId[]>([]);
  const [isLatestMock, setIsLatestMock] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Status check (Gemini readiness)
  const [isGeminiReady, setIsGeminiReady] = useState<boolean>(true);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);
  const [showConfigHelp, setShowConfigHelp] = useState<boolean>(false);

  // Search/Filters inside the results panel
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'table' | 'highlight' | 'history'>('table');

  // Copy feedbacks
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // Local persistence for previous extractions
  const [historyItems, setHistoryItems] = useState<ParseHistoryItem[]>([]);

  // Sample upload simulation target
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch health check on mount
  useEffect(() => {
    checkBackendHealth();
    loadLocalHistory();
  }, []);

  const checkBackendHealth = async () => {
    setHealthLoading(true);
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const data = await response.json();
        setIsGeminiReady(!!data.isGeminiReady);
      } else {
        setIsGeminiReady(false);
      }
    } catch (e) {
      console.warn('Unable to query live API health, falling back to secure sandbox assumptions:', e);
      setIsGeminiReady(false);
    } finally {
      setHealthLoading(false);
    }
  };

  const loadLocalHistory = () => {
    try {
      const saved = localStorage.getItem('getids_history_log');
      if (saved) {
        setHistoryItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load local history logs:', e);
    }
  };

  const saveToHistory = (text: string, count: number, parsedIds: ExtractedId[], isMock: boolean) => {
    try {
      const snippet = text.trim().substring(0, 100) + (text.length > 100 ? '...' : '');
      const newHistoryItem: ParseHistoryItem = {
        id: 'hist-' + Date.now(),
        timestamp: new Date().toLocaleString(),
        title: `Extraction (${count} IDs isolated)`,
        inputSnippet: snippet,
        rawText: text,
        count,
        results: parsedIds,
        isMock
      };
      const updated = [newHistoryItem, ...historyItems].slice(0, 15); // cap at 15 logs
      setHistoryItems(updated);
      localStorage.setItem('getids_history_log', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to commit results log back to localStorage:', e);
    }
  };

  const handleClearHistory = () => {
    setHistoryItems([]);
    localStorage.removeItem('getids_history_log');
  };

  const handleRestoreHistory = (item: ParseHistoryItem) => {
    setInputText(item.rawText);
    setResults(item.results);
    setIsLatestMock(item.isMock);
    setActiveTab('table');
    // Scroll smoothly to results area
    document.getElementById('workspace-results')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Toggle extraction selection types
  const handleTypeToggle = (type: string) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter(t => t !== type));
      }
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  // Clear inputs
  const handleClearInput = () => {
    setInputText('');
    setResults([]);
  };

  // Upload logs trigger
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const resultText = event.target?.result;
      if (typeof resultText === 'string') {
        setInputText(resultText);
      }
    };
    reader.readAsText(file);
  };

  // Execute extraction API calling Gemini
  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setLoadingStep('Initializing parser context...');

    // Progress feel transitions for premium user experience
    const progressSteps = [
      'Tokenizing raw logs stream...',
      'Synthesizing cognitive extraction hashes...',
      'Isolating user coordinate vectors...',
      'Assembling matching JSON structures...'
    ];

    let currentStepIndex = 0;
    const intervalTimer = setInterval(() => {
      if (currentStepIndex < progressSteps.length) {
        setLoadingStep(progressSteps[currentStepIndex]);
        currentStepIndex++;
      }
    }, 450);

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          types: selectedTypes,
          customPattern: customPattern.length > 0 ? customPattern : undefined
        })
      });

      clearInterval(intervalTimer);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const resData = await response.json();
      setResults(resData.results || []);
      setIsLatestMock(!!resData.isMock);
      if (resData.errorMsg) {
        setErrorMsg(resData.errorMsg);
      }

      // Record to persisted log run histories
      saveToHistory(inputText, (resData.results || []).length, resData.results || [], !!resData.isMock);
      
      // Auto transition tab view to visual output
      setActiveTab('table');

    } catch (err: any) {
      clearInterval(intervalTimer);
      console.error(err);
      setErrorMsg(err.message || 'System connectivity failure occurred while parsing with Gemini.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy handlers
  const handleCopySingle = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedId(val);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleCopyAll = () => {
    const listToCopy = filteredResults.map(r => r.id).join('\n');
    navigator.clipboard.writeText(listToCopy);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Downloader utilities
  const handleDownloadJSON = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `getids-extraction-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    const headers = 'ID,Type,Category,Context,Confidence,Description\n';
    const rows = results.map(r => 
      `"${r.id.replace(/"/g, '""')}","${r.type}","${r.category.replace(/"/g, '""')}","${r.context.replace(/"/g, '""')}","${r.confidence}","${r.description.replace(/"/g, '""')}"`
    ).join('\n');
    const dataBlob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `getids-extraction-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter and search computation
  const filteredResults = useMemo(() => {
    return results.filter(item => {
      const matchQuery = 
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchType = typeFilter === 'all' || item.type === typeFilter;
      return matchQuery && matchType;
    });
  }, [results, searchQuery, typeFilter]);

  // Dynamic raw text highlighting generator
  const highlightContent = useMemo(() => {
    if (!inputText || results.length === 0) return <p className="text-zinc-500 italic text-sm">Awaiting extraction matches to map triggers...</p>;

    let elementArray: React.ReactNode[] = [];
    let textSeeker = inputText;
    
    // Sort results by id length descending to avoid short substring replacement breaking longer matches
    const sortedResults = [...results].sort((a, b) => b.id.length - a.id.length);
    
    // Build Regex that matches any of the extracted IDs
    try {
      if (sortedResults.length === 0) return textSeeker;

      // Escape regex special chars
      const escapedIds = sortedResults.map(r => r.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const combinedRegex = new RegExp(`(${escapedIds.join('|')})`, 'g');

      const parts = inputText.split(combinedRegex);
      return parts.map((part, index) => {
        const matchingIdObj = results.find(r => r.id === part);
        if (matchingIdObj) {
          const cfg = TYPE_CONFIG[matchingIdObj.type] || TYPE_CONFIG.other;
          return (
            <span
              key={index}
              className={`inline-block px-1 rounded text-xs select-all font-mono font-medium border cursor-help transition-all duration-150 ${cfg.highlightBg}`}
              title={`${matchingIdObj.category}: ${matchingIdObj.description} (Confidence: ${Math.round(matchingIdObj.confidence * 100)}%)`}
            >
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      });

    } catch (e: any) {
      console.warn('Highlight compilation error:', e.message);
      return <pre className="text-xs font-mono text-zinc-400 select-all whitespace-pre-wrap">{inputText}</pre>;
    }
  }, [inputText, results]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-indigo-500/30 selection:text-white flex flex-col justify-between">
      
      {/* 1. MAIN GLOBAL GRID CONTAINER */}
      <div>
        <header className="border-b border-white/10 bg-neutral-900/40 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* LOGO */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-indigo-800 p-[1.5px] shadow-lg shadow-indigo-500/10">
                <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight font-display flex items-center gap-1.5">
                  GetIds <span className="text-[10px] uppercase bg-indigo-500/20 text-indigo-300 font-mono tracking-widest px-1.5 py-0.5 rounded font-black">GenAI v3.5</span>
                </h1>
                <p className="text-[10px] text-zinc-400 font-medium">Automated Dev & Security ID Extractor</p>
              </div>
            </div>

            {/* LIVE INDICATOR / CONFIG HELP */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => checkBackendHealth()}
                className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-zinc-400 hover:text-white"
                title="Refresh health check status"
              >
                <RefreshCw className={`w-4 h-4 ${healthLoading ? 'animate-spin text-indigo-400' : ''}`} />
              </button>

              {healthLoading ? (
                <div className="text-xs text-zinc-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
                  Verifying server state...
                </div>
              ) : isGeminiReady ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Gemini active
                </div>
              ) : (
                <button
                  onClick={() => setShowConfigHelp(true)}
                  className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 rounded-full text-xs font-medium transition-all"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  Local Regex Sandbox Mode
                </button>
              )}
            </div>

          </div>
        </header>

        {/* 2. WARNING / SYSTEM STATE NOTIFICATIONS */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
          <AnimatePresence>
            {!isGeminiReady && !healthLoading && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg shrink-0 mt-0.5 text-amber-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-amber-300">Sandbox Extraction Demo Active</h4>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Worry-free simulation mode is currently running because your <span className="text-amber-200 font-bold font-mono">GEMINI_API_KEY</span> index is not defined. We have deployed our offline high-fidelity regex parsing pipeline so that you can fully test the extraction utility inside the sandbox wrapper. 
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  <button 
                    onClick={() => setShowConfigHelp(true)}
                    className="w-full md:w-auto px-3.5 py-1.5 text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-xl transition-colors shrink-0"
                  >
                    Setup API Key
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. WORKSPACE ACTIONS GRID */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* L. INPUTS COLUMN */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-mono tracking-widest text-zinc-400 font-bold flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" /> Raw Input logstream
                </span>
                
                {/* File Upload Proxy button */}
                <div className="flex items-center gap-2">
                  <input 
                    type="file" 
                    id="log-file-loader" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden" 
                    accept=".txt,.log,.json,.yaml,.sql"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] uppercase font-mono tracking-wider px-2 py-1 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded border border-white/10 transition-colors"
                  >
                    Import Log File
                  </button>
                  {inputText && (
                    <button
                      type="button"
                      onClick={handleClearInput}
                      className="text-[10px] uppercase font-mono text-rose-400 hover:text-rose-300 px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 rounded border border-rose-500/20 transition-all"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Text Area */}
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste raw server logs, Docker compose configurations, AWS telemetry records, customer database JSON exports, or system dumps..."
                  className="w-full h-72 sm:h-80 bg-black/60 border border-white/10 focus:border-indigo-500/50 rounded-xl p-3.5 text-xs text-zinc-300 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500/30 leading-relaxed placeholder:text-zinc-600 transition-all select-text selectable"
                />
                
                {/* Character/Length Tracker */}
                <div className="absolute bottom-2.5 right-3 text-[10px] font-mono text-zinc-500 bg-[#050505] px-1.5 py-0.5 rounded border border-white/5">
                  {inputText.length.toLocaleString()} chars
                </div>
              </div>

              {/* PRE-BUILT DATASET PILLS */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">
                  Select sample interactive template feeds:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SAMPLE_DATASETS.map((set, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setInputText(set.text)}
                      className="text-left p-2.5 rounded-xl bg-black/40 hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all text-xs flex items-start gap-2 group cursor-pointer"
                    >
                      <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:bg-indigo-500/20 shrink-0">
                        {idx === 0 && <Terminal className="w-3.5 h-3.5" />}
                        {idx === 1 && <FileCode className="w-3.5 h-3.5" />}
                        {idx === 2 && <MessageSquare className="w-3.5 h-3.5" />}
                        {idx === 3 && <Database className="w-3.5 h-3.5" />}
                      </div>
                      <div className="overflow-hidden">
                        <span className="font-semibold text-zinc-200 text-[11px] block truncate group-hover:text-indigo-400">{set.name}</span>
                        <span className="text-[9px] font-mono text-zinc-500">{set.type}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* EXTRACTION CONFIGURATION TOGGLES */}
              <div className="border-t border-white/5 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-mono font-bold tracking-widest text-zinc-400">Target classifications:</span>
                  <span className="text-[10px] font-mono text-zinc-500">{selectedTypes.length} Active</span>
                </div>
                
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(TYPE_CONFIG).map(([typeKey, cfg]) => {
                    const isSelected = selectedTypes.includes(typeKey);
                    const IconComp = cfg.icon;
                    return (
                      <button
                        key={typeKey}
                        type="button"
                        onClick={() => handleTypeToggle(typeKey)}
                        className={`px-3 py-1.5 rounded-lg border transition-all duration-150 flex items-center gap-1.5 select-none cursor-pointer text-xs ${
                          isSelected 
                            ? `${cfg.pill} font-medium` 
                            : 'bg-black/30 border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/15'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                        <span className="capitalize">{typeKey.replace('_', ' ')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CUSTOM MATCH PATTERN REGEX */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-zinc-400 flex items-center justify-between">
                  <span>Custom Regex Parameter <span className="text-zinc-600">(Optional)</span></span>
                  <span className="text-[9px] text-[#00ffc8] font-mono">Dynamic Pattern Hook</span>
                </label>
                <input
                  type="text"
                  value={customPattern}
                  onChange={(e) => setCustomPattern(e.target.value)}
                  placeholder="e.g. key_\\w{12,32} or stripe_\\w+"
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-[#00ffc8] font-mono focus:outline-none focus:border-indigo-500/50 leading-relaxed placeholder:text-zinc-700"
                />
              </div>

              {/* ACTION CALL TO ACTION */}
              <button
                type="button"
                onClick={handleExtract}
                disabled={isProcessing || !inputText.trim()}
                className={`w-full py-4 px-4 rounded-xl font-bold font-display text-sm tracking-wide transition-all select-none cursor-pointer flex items-center justify-center gap-2 relative overflow-hidden ${
                  !inputText.trim() 
                    ? 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-xl shadow-indigo-600/10 border border-indigo-500/30'
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2 text-indigo-200">
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>{loadingStep || 'Generating structured vectors...'}</span>
                  </div>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <span>Cognitive Parse with {isGeminiReady ? 'Gemini 3.5' : 'Regex Local Match'}</span>
                  </>
                )}
              </button>

            </div>

          </div>

          {/* R. OUTPUTS INTERACTION PANEL */}
          <div className="lg:col-span-12 xl:col-span-7 space-y-6" id="workspace-results">
            
            <div className="bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-h-[500px] flex flex-col justify-between">
              
              <div>
                {/* BUTTON TAB TONES */}
                <div className="border-b border-white/10 bg-neutral-900/60 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 self-start sm:self-auto select-none">
                    <button
                      type="button"
                      onClick={() => setActiveTab('table')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'table' 
                          ? 'bg-indigo-600 text-white shadow font-medium' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      Extracted Data ({filteredResults.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('highlight')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'highlight' 
                          ? 'bg-indigo-600 text-white shadow font-medium' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Matches Highlight Map
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'history' 
                          ? 'bg-indigo-600 text-white shadow font-medium' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                      Past Runs ({historyItems.length})
                    </button>
                  </div>

                  {/* Bulk Extracted Download Suite */}
                  {results.length > 0 && activeTab !== 'history' && (
                    <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
                      <button
                        onClick={handleCopyAll}
                        className="py-1 px-2.5 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-[11px] font-mono transition-all inline-flex items-center gap-1.5 text-indigo-300 cursor-pointer"
                      >
                        {copiedAll ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedAll ? 'Copied' : 'Copy All'}
                      </button>
                      <button
                        onClick={handleDownloadJSON}
                        className="py-1 px-2.5 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-[11px] font-mono transition-all inline-flex items-center gap-1 px-2.5 cursor-pointer text-zinc-300"
                      >
                        <Download className="w-3 h-3" /> JSON
                      </button>
                      <button
                        onClick={handleDownloadCSV}
                        className="py-1 px-2.5 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-[11px] font-mono transition-all inline-flex items-center gap-1 px-2.5 cursor-pointer text-zinc-300"
                      >
                        <Download className="w-3 h-3" /> CSV
                      </button>
                    </div>
                  )}
                </div>

                {/* TAB WINDOW 1: EXTRACED INTERACTIVE SPREADSHEET TABLE */}
                {activeTab === 'table' && (
                  <div className="p-4 sm:p-6 space-y-4">
                    {/* Error message block */}
                    {errorMsg && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2 leading-relaxed">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    {results.length > 0 ? (
                      <div className="space-y-4">
                        
                        {/* Summary & Search input in outputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 select-text">
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Search within isolated IDs..."
                              className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500 font-mono">Classifier:</span>
                            <select
                              value={typeFilter}
                              onChange={(e) => setTypeFilter(e.target.value)}
                              className="bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-zinc-300 font-mono focus:outline-none focus:border-indigo-500/50 grow"
                            >
                              <option value="all">All Categorizations</option>
                              <option value="user">User Identifiers</option>
                              <option value="channel">Channel Coordinates</option>
                              <option value="database_resource">Database Resources</option>
                              <option value="email">Electronic Mails</option>
                              <option value="other">Unclassified Codes</option>
                            </select>
                          </div>
                        </div>

                        {/* TABLE CONTENT */}
                        <div className="overflow-x-auto border border-white/5 rounded-xl bg-black/40">
                          <table className="w-full text-left border-collapse min-w-[650px]">
                            <thead>
                              <tr className="border-b border-white/10 text-[10px] uppercase font-mono tracking-widest text-zinc-500 bg-black/60">
                                <th className="p-3">ID Coordinate</th>
                                <th className="p-3">Classification</th>
                                <th className="p-3">Context</th>
                                <th className="p-3">Utility / Description</th>
                                <th className="p-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs text-zinc-300 font-sans select-text selectable">
                              {filteredResults.length > 0 ? (
                                filteredResults.map((item, idx) => {
                                  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
                                  const IconComponent = cfg.icon;
                                  return (
                                    <tr key={idx} className="hover:bg-white/5 transition-all">
                                      {/* Literal ID */}
                                      <td className="p-3 font-mono font-black text-white text-xs whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                          <span className="bg-indigo-500/10 text-indigo-400 p-1 rounded">
                                            <IconComponent className="w-3.5 h-3.5" />
                                          </span>
                                          <span className="max-w-[160px] truncate block" title={item.id}>{item.id}</span>
                                        </div>
                                      </td>
                                      
                                      {/* Classification Type Badge */}
                                      <td className="p-3 whitespace-nowrap">
                                        <div className="flex flex-col gap-0.5">
                                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono leading-none border uppercase tracking-wider ${cfg.color}`}>
                                            {item.type.replace('_', ' ')}
                                          </span>
                                          <span className="text-[10px] text-zinc-500 block truncate max-w-[120px]">{item.category}</span>
                                        </div>
                                      </td>

                                      {/* Context Log lines */}
                                      <td className="p-3 text-zinc-400 font-mono text-[10px] italic leading-tight max-w-[180px] truncate" title={item.context}>
                                        {item.context}
                                      </td>

                                      {/* Smart AI guessing description */}
                                      <td className="p-3 text-zinc-400 text-[11px] leading-normal max-w-[220px] truncate" title={item.description}>
                                        {item.description}
                                      </td>

                                      {/* Column action Copy button */}
                                      <td className="p-3 text-right whitespace-nowrap">
                                        <button
                                          type="button"
                                          onClick={() => handleCopySingle(item.id)}
                                          className="p-1.5 hover:bg-neutral-800 rounded-lg text-zinc-400 hover:text-white transition-all inline-flex items-center gap-1 select-none cursor-pointer border border-transparent hover:border-white/5"
                                        >
                                          {copiedId === item.id ? (
                                            <>
                                              <Check className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                                              <span className="text-[9px] font-mono text-emerald-400">Copied</span>
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3.5 h-3.5" />
                                              <span className="text-[9px] font-mono opacity-0 group-hover:opacity-100">Copy</span>
                                            </>
                                          )}
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={5} className="p-8 text-center text-zinc-500">
                                    No isolated IDs match your specific filters. Try expanding target classifications or searching.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                      </div>
                    ) : (
                      /* Empty state layout */
                      <div className="py-24 px-6 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-inner">
                          <Terminal className="w-7 h-7 animate-pulse" />
                        </div>
                        <div className="max-w-md space-y-1 select-text">
                          <h4 className="font-bold text-zinc-200">Awaiting Logstream Workspace Feed</h4>
                          <p className="text-xs text-zinc-500 leading-relaxed">
                            Initialize extraction by choosing any dev/system dataset templates on the left or paste raw parameters, then click the cognitive scan CTA to initialize parse sequences.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB WINDOW 2: RAW HIGHLIGHT VISUAL DECODER */}
                {activeTab === 'highlight' && (
                  <div className="p-4 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-xs uppercase font-mono text-zinc-400 tracking-wider font-bold">Raw source preview tracing annotations</span>
                      <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 select-none">Hover highlighted terms to see AI metadata</span>
                    </div>

                    <div className="p-4 sm:p-5 bg-neutral-950 border border-white/10 rounded-xl leading-relaxed text-sm select-text selectable min-h-[350px] overflow-y-auto max-h-[500px]">
                      {highlightContent}
                    </div>
                  </div>
                )}

                {/* TAB WINDOW 3: LOCAL LOGS HISTORY STORE */}
                {activeTab === 'history' && (
                  <div className="p-4 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 select-text">
                      <span className="text-xs uppercase font-mono text-zinc-400 tracking-wider font-bold">Past parse log results ({historyItems.length})</span>
                      {historyItems.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearHistory}
                          className="text-[10px] uppercase font-mono text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-500/10 rounded border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                        >
                          Clear All Runs
                        </button>
                      )}
                    </div>

                    {historyItems.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 max-h-[420px] overflow-y-auto">
                        {historyItems.map((item, idx) => (
                          <div 
                            key={item.id}
                            className="p-4 rounded-xl bg-black/40 border border-white/5 hover:border-white/15 transition-all text-left flex justify-between items-center gap-4 group hover:bg-neutral-900/40"
                          >
                            <div className="space-y-1 text-xs overflow-hidden select-text">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-zinc-200 block truncate group-hover:text-indigo-400">{item.title}</span>
                                <span className="text-[9px] font-mono text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 shrink-0">{item.timestamp}</span>
                              </div>
                              <p className="text-[11px] font-mono text-zinc-400 italic truncate max-w-sm sm:max-w-md">{item.inputSnippet}</p>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 pt-0.5">
                                <span className={item.isMock ? 'text-amber-500 font-bold' : 'text-emerald-500'}>
                                  {item.isMock ? 'Local Engine Run' : 'Gemini AI Run'}
                                </span>
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => handleRestoreHistory(item)}
                              className="px-3 py-1.5 bg-indigo-500/15 group-hover:bg-indigo-600 text-indigo-400 group-hover:text-white rounded-lg text-xs font-semibold hover:scale-[1.03] transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 border border-indigo-500/20 font-sans"
                            >
                              Restore <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
                        <History className="w-8 h-8 text-neutral-600 animate-pulse" />
                        <p className="text-xs text-zinc-500 italic">No past logs captured inside the browser's storage cache yet.</p>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* FOOTER BAR WITH BULK STATS */}
              {results.length > 0 && activeTab !== 'history' && (
                <div className="border-t border-white/10 p-3 sm:p-4 bg-black/50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-mono rounded-b-2xl select-text">
                  <div className="border-r border-white/10 py-1">
                    <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Total Matches</span>
                    <span className="text-lg font-bold text-indigo-400">{results.length}</span>
                  </div>
                  <div className="border-r border-white/10 sm:border-r py-1">
                    <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">High Confidence</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {results.filter(r => r.confidence >= 0.8).length}
                    </span>
                  </div>
                  <div className="border-r border-white/10 sm:border-r py-1">
                    <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Unique Categories</span>
                    <span className="text-lg font-bold text-cyan-400">
                      {new Set(results.map(r => r.category)).size}
                    </span>
                  </div>
                  <div className="py-1">
                    <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Engine Process</span>
                    <span className="text-[11px] font-bold text-zinc-300 block pt-1 uppercase">
                      {isLatestMock ? 'Offline Regex' : 'Live Gemini'}
                    </span>
                  </div>
                </div>
              )}

            </div>

          </div>

        </main>

        {/* 4. UTILITY CAPABILITY FEATURES BLOCK (BENTO GRID STYLE) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 border-t border-white/10 mt-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold font-display tracking-tight">Parser Capabilities & System Overview</h3>
              <p className="text-xs text-zinc-500">GetIds leverages cognitive LLMs alongside heuristic algorithms to map unorganized resources.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-5 space-y-2 select-text">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-sm text-zinc-200">Zero-Retention Security</h5>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Raw log and config parsing occurs ephemerally during requests. We hold no unencrypted diagnostic logs, and your source text remains isolated and safe.
              </p>
            </div>

            <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-5 space-y-2 select-text">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit">
                <Database className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-sm text-zinc-200">Complex DB IDs Matching</h5>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Isolate MongoDB ObjectIds, AWS Cloud Resources (ARNs), SQL UUID chains, Stripe entities (cus_*, sub_*, txn_*), and custom system parameters.
              </p>
            </div>

            <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-5 space-y-2 select-text">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl w-fit">
                <User className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-sm text-zinc-200">Profile & Mail Extraction</h5>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Identify Discord identifiers, Telegram coordinates, GitHub profile coordinates, email structures, and digital account names with surroundings context matching.
              </p>
            </div>

            <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-5 space-y-2 select-text">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl w-fit">
                <FileCode className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-sm text-zinc-200">Custom Regex Integrations</h5>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Provide custom target regex statements directly via our input parameters. Gemini will cross-reference pattern maps dynamically alongside LLM cognitive heuristics.
              </p>
            </div>

          </div>
        </section>

      </div>

      {/* FOOTER LEGAL BANNER */}
      <footer className="border-t border-white/10 bg-neutral-950 py-6 text-center select-text">
        <div className="max-w-7xl mx-auto px-4 text-xs text-zinc-600 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <p>© 2026 GetIds Corporation. Built and compiled with Gemini AI live. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-zinc-400 transition-colors">Privacy Shield</span>
            <span className="hover:text-zinc-400 transition-colors">Dev Terms of Service</span>
            <span className="hover:text-zinc-400 transition-colors">Developer Console</span>
          </div>
        </div>
      </footer>

      {/* AI CONFIGURATION MODAL (EDUCATIONAL BANNER HELPER) */}
      <AnimatePresence>
        {showConfigHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-neutral-900 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl relative select-text"
            >
              
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl shrink-0 mt-1">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display tracking-tight text-white flex items-center gap-1.5">
                    Configure Gemini AI Extraction
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mt-1">
                    GetIds relies on the Google <span className="text-white font-bold">Gemini-3.5-flash</span> cognitive model to parse, label, write smart explanations, and output structured JSON formats with extreme reliability.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-black/60 border border-white/5 rounded-xl space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px] border-b border-white/5 pb-1 select-all">
                  <span className="text-zinc-400">Environment Secret Required:</span>
                  <span className="text-indigo-400 font-bold">GEMINI_API_KEY</span>
                </div>
                <div className="space-y-1.5 leading-relaxed text-zinc-400 text-[11px]">
                  <p className="text-white font-bold">How to configure inside AI Studio:</p>
                  <p>1. Open the application <span className="text-white">Settings</span> menu at the top or bottom panel.</p>
                  <p>2. Locate the <span className="text-white">Secrets</span> panel.</p>
                  <p>3. Set a new environment secret named <span className="font-bold text-[#00ffc8]">GEMINI_API_KEY</span> and paste your valid Gemini API Key as its value.</p>
                </div>
              </div>

              <p className="text-xs text-zinc-500 leading-relaxed bg-zinc-950 p-3 rounded-lg border border-white/5 italic">
                💡 <span className="text-zinc-400">Note:</span> If you are testing within a secure local container, you may safely populate your <span className="font-mono text-zinc-300">.env</span> file with <span className="font-mono text-zinc-300">GEMINI_API_KEY=YOUR_KEY</span>. The server boots cleanly with high quality Regex logic if the key is missing so you are never blocked.
              </p>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowConfigHelp(false)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow transition-all cursor-pointer"
                >
                  Confirm & Close
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
