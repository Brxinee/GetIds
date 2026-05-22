/// <reference types="vite/client" />
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  Layers, 
  Lock, 
  Shield, 
  Search, 
  Filter, 
  ArrowUpRight, 
  HelpCircle, 
  Send, 
  Check, 
  FileText, 
  RefreshCw, 
  Sliders, 
  Eye, 
  Clipboard, 
  UserCheck, 
  Menu, 
  X, 
  ChevronDown, 
  AlertCircle, 
  Calendar, 
  ChevronRight,
  ExternalLink,
  MessageCircle,
  TrendingUp,
  Inbox,
  LockKeyhole,
  Info,
  SlidersHorizontal,
  Upload,
  User,
  Database,
  CheckSquare,
  DollarSign
} from 'lucide-react';

import { 
  ListingItem, 
  SellerSubmission, 
  DealItem, 
  PlatformType, 
  RarityType, 
  ListingStatusType, 
  DealStatusType,
  PriceDisplayType
} from './types';

import { 
  dbFetchListings, 
  dbSaveListing, 
  dbSaveSubmission, 
  dbFetchSubmissions, 
  dbFetchDeals, 
  dbSaveDeal, 
  isSupabaseConnected 
} from './lib/supabase';

import { 
  INITIAL_INV_SEEDS, 
  INITIAL_SUBMISSIONS_SEEDS, 
  INITIAL_DEALS_SEEDS, 
  FAQ_SEEDS, 
  ADMIN_PHONE 
} from './lib/constants';

import { 
  generateWhatsAppLink, 
  buildBuyerMessage, 
  buildSellerMessage, 
  buildRequestMessage 
} from './lib/messages';

import ListingCard, { formatINR, getDisplayPriceAndCTA } from './components/ListingCard';
import CloudflareTurnstile from './components/CloudflareTurnstile';

export default function App() {
  // Navigation active route
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileMenu, setMobileMenu] = useState<boolean>(false);

  // Connection Indicator
  const [supabaseActive, setSupabaseActive] = useState<boolean>(false);

  // Core Data Lists (Hydrating with local fallback / Supabase)
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [submissions, setSubmissions] = useState<SellerSubmission[]>([]);
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  // Broker configuration
  const [brokeragePct, setBrokeragePct] = useState<number>(() => {
    const saved = localStorage.getItem('ids_brokerage_pct');
    return saved ? parseInt(saved, 10) : 25;
  });

  // Commission Search Target Hunt list
  const [huntRequests, setHuntRequests] = useState<any[]>(() => {
    const saved = localStorage.getItem('ids_hunt_requests');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse hunt requests, resetting', e);
        return [];
      }
    }
    return [];
  });

  // Hydration loop
  useEffect(() => {
    async function loadData() {
      setDataLoading(true);
      const isConnected = isSupabaseConnected();
      setSupabaseActive(isConnected);

      const dbListings = await dbFetchListings(INITIAL_INV_SEEDS);
      const dbSubs = await dbFetchSubmissions(INITIAL_SUBMISSIONS_SEEDS);
      const dbDeals = await dbFetchDeals(INITIAL_DEALS_SEEDS);

      setListings(dbListings);
      setSubmissions(dbSubs);
      setDeals(dbDeals);
      setDataLoading(false);
    }
    loadData();
  }, []);

  // Sync state modifications dynamically to db & localStorage
  const syncListings = async (newListings: ListingItem[]) => {
    setListings(newListings);
    localStorage.setItem('ids_listings', JSON.stringify(newListings));
    if (supabaseActive) {
      for (const item of newListings) {
        await dbSaveListing(item);
      }
    }
  };

  const syncSubmissions = async (newSubs: SellerSubmission[]) => {
    setSubmissions(newSubs);
    localStorage.setItem('ids_submissions', JSON.stringify(newSubs));
    if (supabaseActive) {
      for (const item of newSubs) {
        await dbSaveSubmission(item);
      }
    }
  };

  const syncDeals = async (newDeals: DealItem[]) => {
    setDeals(newDeals);
    localStorage.setItem('ids_deals', JSON.stringify(newDeals));
    if (supabaseActive) {
      for (const item of newDeals) {
        await dbSaveDeal(item);
      }
    }
  };

  // Sync hunt requests locally
  useEffect(() => {
    localStorage.setItem('ids_hunt_requests', JSON.stringify(huntRequests));
  }, [huntRequests]);

  // Sync brokerage changes locally
  useEffect(() => {
    localStorage.setItem('ids_brokerage_pct', brokeragePct.toString());
  }, [brokeragePct]);

  // Browse inventory filter states
  const [search, setSearch] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [budgetFilter, setBudgetFilter] = useState<string>('all');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('price-desc');

  // Submit Listing wizard states
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [sellUsername, setSellUsername] = useState<string>('');
  const [sellPlatform, setSellPlatform] = useState<PlatformType>('instagram');
  const [sellCategory, setSellCategory] = useState<string>('');
  const [sellAskingPrice, setSellAskingPrice] = useState<string>('');
  const [sellMinPrice, setSellMinPrice] = useState<string>('');
  const [sellSellerName, setSellSellerName] = useState<string>('');
  const [sellWhatsapp, setSellWhatsapp] = useState<string>('');
  const [sellDeclaration, setSellDeclaration] = useState<boolean>(false);
  
  // Seller File Upload States
  const [sellerProofName, setSellerProofName] = useState<string>('');
  const [sellerProofData, setSellerProofData] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Specific acquisition request states
  const [reqUsername, setReqUsername] = useState<string>('');
  const [reqPlatform, setReqPlatform] = useState<PlatformType>('instagram');
  const [reqBudget, setReqBudget] = useState<string>('');
  const [reqUrgency, setReqUrgency] = useState<string>('Medium');
  const [reqAlternatives, setReqAlternatives] = useState<string>('');
  const [reqWhatsapp, setReqWhatsapp] = useState<string>('');

  // Detailed Modal start secure deal state
  const [dealModalOpen, setDealModalOpen] = useState<boolean>(false);
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>('');
  const [buyerOffer, setBuyerOffer] = useState<string>('');
  const [buyerUrgency, setBuyerUrgency] = useState<string>('Standard Pace');
  const [buyerNotes, setBuyerNotes] = useState<string>('');
  const [turnstileVerified, setTurnstileVerified] = useState<boolean>(false);

  // Admin access validation state
  const [adminAuth, setAdminAuth] = useState<boolean>(() => {
    return sessionStorage.getItem('ids_admin_authenticated') === 'true';
  });
  const [adminPass, setAdminPass] = useState<string>('');

  // FAQ accordion active indices
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Interactive Checklist verification states (Admin approval queue)
  const [checklistSubId, setChecklistSubId] = useState<string | null>(null);
  const [ownershipChecked, setOwnershipChecked] = useState<boolean>(false);
  const [historyChecked, setHistoryChecked] = useState<boolean>(false);
  const [riskChecked, setRiskChecked] = useState<boolean>(false);
  const [verifierNotes, setVerifierNotes] = useState<string>('');
  const [selectedDisplayStrategy, setSelectedDisplayStrategy] = useState<PriceDisplayType>('MAKE_OFFER');

  // Auto scroll to top on tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab, selectedId]);

  // Duplicate checker function
  const checkDuplicateListing = (username: string, platform: string): boolean => {
    const formatted = username.trim().replace('@', '').toLowerCase();
    // Check against live listings
    const matchLive = listings.some(l => 
      l.username.toLowerCase() === formatted && 
      l.platform === platform && 
      l.listingStatus === 'live'
    );
    // Check against pending submissions
    const matchSub = submissions.some(s => 
      s.username.toLowerCase() === formatted && 
      s.platform === platform && 
      s.status === 'pending'
    );
    return matchLive || matchSub;
  };

  // Drag & drop seller upload logic
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processProofFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processProofFile(files[0]);
    }
  };

  const processProofFile = (file: File) => {
    // Check size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("Verification File too large (Maximum allowed size: 5MB)");
      return;
    }
    // Check extension
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert("Unsupported File Format. Please upload a PNG, JPG screenshot, or PDF document.");
      return;
    }

    setSellerProofName(file.name);
    
    // Convert to Base64 preview
    const reader = new FileReader();
    reader.onload = () => {
      setSellerProofData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Form submission: Seller Multi-Step Wizard
  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellDeclaration || !sellUsername || !sellAskingPrice || !sellSellerName) return;

    // Check pre-emptive duplicate handle listing block
    if (checkDuplicateListing(sellUsername, sellPlatform)) {
      alert(`Duplicate Registry Blocked: A listing for @${sellUsername.replace('@', '')} already exists in our active registry or approval queue.`);
      return;
    }

    const subId = 'sub-' + Date.now();
    const newSub: SellerSubmission = {
      id: subId,
      username: sellUsername.trim().replace('@', ''),
      platform: sellPlatform,
      category: sellCategory || 'General Digital Asset',
      askingPrice: parseFloat(sellAskingPrice),
      minPrice: sellMinPrice ? parseFloat(sellMinPrice) : undefined,
      sellerName: sellSellerName,
      whatsapp: sellWhatsapp,
      ownershipConfirmed: true,
      status: 'pending',
      uploadProofName: sellerProofName || undefined,
      uploadProofData: sellerProofData || undefined
    };

    // 1. Save data BEFORE WhatsApp open to satisfy "save forms before WhatsApp redirect"!
    const updated = [newSub, ...submissions];
    await syncSubmissions(updated);

    // 2. Open Whatsapp Communication template
    const msg = buildSellerMessage({
      username: sellUsername,
      platform: sellPlatform,
      category: sellCategory || 'General Digital Asset',
      askingPrice: parseFloat(sellAskingPrice),
      minPrice: sellMinPrice ? parseFloat(sellMinPrice) : undefined,
      sellerName: sellSellerName,
      brokerageRate: brokeragePct
    });
    window.open(generateWhatsAppLink(msg), '_blank');

    // Reset wizard states
    setWizardStep(1);
    setSellUsername('');
    setSellCategory('');
    setSellAskingPrice('');
    setSellMinPrice('');
    setSellSellerName('');
    setSellWhatsapp('');
    setSellDeclaration(false);
    setSellerProofName('');
    setSellerProofData('');

    alert('Submission locked in. Your asset is now queued in our seller verification desks. Our senior brokers will verify parameters on WhatsApp shortly.');
    setActiveTab('home');
  };

  // Form Submission: Specific custom handle acquisition hunt
  const handleAcquisitionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqUsername || !reqBudget || !reqWhatsapp) return;

    const newRequest = {
      id: 'hunt-' + Date.now(),
      desiredUsername: reqUsername.trim().replace('@', ''),
      platform: reqPlatform,
      budget: parseFloat(reqBudget),
      urgency: reqUrgency,
      alternatives: reqAlternatives,
      whatsapp: reqWhatsapp,
      timestamp: new Date().toISOString()
    };

    // 1. Save form persistently BEFORE WhatsApp opening redirect
    const updated = [newRequest, ...huntRequests];
    setHuntRequests(updated);

    // 2. Open WhatsApp link
    const msg = buildRequestMessage({
      desiredUsername: reqUsername,
      platform: reqPlatform,
      budget: parseFloat(reqBudget),
      urgency: reqUrgency,
      alternatives: reqAlternatives,
      whatsapp: reqWhatsapp
    });
    window.open(generateWhatsAppLink(msg), '_blank');

    // Reset form parameters
    setReqUsername('');
    setReqBudget('');
    setReqAlternatives('');
    setReqWhatsapp('');
    setReqUrgency('Medium');

    alert('Your hunting parameters are registered. Checking WhatsApp redirection to establish private deal rooms.');
  };

  // Form Submission: Start secure escrow deal from detail page
  const handleStartDealForm = async (e: React.FormEvent, listingItem: ListingItem) => {
    e.preventDefault();
    if (!turnstileVerified || !buyerName || !buyerOffer) return;

    const dealId = 'deal-' + Date.now();
    const agreedAmount = parseFloat(buyerOffer);
    
    // Dynamic commission matching Admin brokerage % setting
    const commFee = agreedAmount * (brokeragePct / 100);
    const sellerReceive = agreedAmount * (1 - brokeragePct / 100);

    const newDeal: DealItem = {
      id: dealId,
      username: listingItem.username,
      platform: listingItem.platform,
      agreedPrice: agreedAmount,
      brokerageFee: commFee,
      payout: sellerReceive,
      status: 'NEW',
      buyerName: buyerName,
      whatsapp: buyerPhone
    };

    // 1. Save form parameters BEFORE WhatsApp redirect
    const updated = [newDeal, ...deals];
    await syncDeals(updated);

    // 2. Open WhatsApp Communication link
    const displayInfo = getDisplayPriceAndCTA(listingItem);
    const contactMsg = buildBuyerMessage({
      username: listingItem.username,
      platform: listingItem.platform,
      displayPrice: displayInfo.displayPrice,
      offer: agreedAmount,
      urgency: buyerUrgency,
      name: buyerName,
      notes: buyerNotes
    });
    window.open(generateWhatsAppLink(contactMsg), '_blank');

    // Close and reset states
    setDealModalOpen(false);
    setBuyerName('');
    setBuyerPhone('');
    setBuyerOffer('');
    setBuyerNotes('');
    setTurnstileVerified(false);

    alert(`Success, ${buyerName}! Your escrow negotiation is registered. Our broker team has reserved @${listingItem.username}. Monitor active status updates inside the Supervisor Panel.`);
  };

  // Private Admin Access Validation
  const handleAdminAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Access passkey checking with secret context fallback
    const targetKey = import.meta.env?.VITE_ADMIN_ACCESS_KEY || 'adminpass';
    if (adminPass === targetKey) {
      setAdminAuth(true);
      sessionStorage.setItem('ids_admin_authenticated', 'true');
      setAdminPass('');
    } else {
      alert('Security Authentication Failed. Please verify the desk credentials codes.');
    }
  };

  const handleAdminDeauth = () => {
    setAdminAuth(false);
    sessionStorage.removeItem('ids_admin_authenticated');
  };

  // Seller approve with interactive checklist parameters
  const handleApproveSubmissionClick = (subId: string) => {
    setChecklistSubId(subId);
    // Reset inputs
    setOwnershipChecked(false);
    setHistoryChecked(false);
    setRiskChecked(false);
    setVerifierNotes('');
    setSelectedDisplayStrategy('MAKE_OFFER');
  };

  const handleApproveVettingExecute = async (sub: SellerSubmission) => {
    if (!ownershipChecked || !historyChecked || !riskChecked) {
      alert("Vetting Protocol Warning: All verification audit steps must be executed and checked prior to public listing approval.");
      return;
    }

    // Pre-emptive check duplicate handle listings
    if (checkDuplicateListing(sub.username, sub.platform)) {
      alert(`Duplicate Registry Conflict: @${sub.username} already live inside Registry.`);
      return;
    }

    // 1. Construct approved ListingItem with custom strategies of pricing representation
    const newListing: ListingItem = {
      id: sub.id,
      username: sub.username,
      platform: sub.platform,
      category: sub.category,
      askingPrice: sub.askingPrice,
      minPrice: sub.minPrice,
      rarityScore: sub.askingPrice > 200000 ? 'Grail' : sub.askingPrice > 100000 ? 'Legendary' : 'Rare',
      verificationStatus: true,
      listingStatus: 'live',
      featured: false,
      brokerNotes: verifierNotes || `Rigorously vetted submission by specialist staff. Ownership checked successfully.`,
      priceDisplayType: selectedDisplayStrategy,
      estimatedRangeMin: selectedDisplayStrategy === 'BROKER_VALUATION_RANGE' ? Math.round(sub.askingPrice * 0.8) : undefined,
      estimatedRangeMax: selectedDisplayStrategy === 'BROKER_VALUATION_RANGE' ? Math.round(sub.askingPrice * 1.2) : undefined,
      categoryDescriptor: selectedDisplayStrategy === 'CATEGORY_VALUE' ? `${sub.category} Digital Asset` : undefined,
      rarityTags: selectedDisplayStrategy === 'RARITY_SCORE' ? ['ULTRA RARE', 'OG HANDLE', 'VERIFIED SOURCE'] : undefined
    };

    // Save list shifts
    const updatedListings = [newListing, ...listings];
    await syncListings(updatedListings);

    // Remove submission
    const remainingSubs = submissions.filter(s => s.id !== sub.id);
    await syncSubmissions(remainingSubs);

    // Reset checks
    setChecklistSubId(null);
    alert(`Success: Approved brokerage listing for @${sub.username}! This ID is now live in the registries.`);
  };

  const handleRejectSubmissionExecute = async (subId: string) => {
    if (confirm("Reject this listing submission entirely and purge all uploaded screengrabs and data archives safely?")) {
      const remainingSubs = submissions.filter(s => s.id !== subId);
      await syncSubmissions(remainingSubs);
      setChecklistSubId(null);
      alert("Submission purged securely from administrative registries.");
    }
  };

  // Pipeline workflow deal progress triggers
  const advanceDealStatus = async (dealId: string, nextStatus: DealStatusType) => {
    const updatedDeals = deals.map(d => d.id === dealId ? { ...d, status: nextStatus } : d);
    await syncDeals(updatedDeals);
  };

  const deleteDealFromPanel = async (dealId: string) => {
    if (confirm("Archive this escrow transaction ledger historically?")) {
      const remainingDeals = deals.filter(d => d.id !== dealId);
      await syncDeals(remainingDeals);
    }
  };

  // Listings compile filters
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      if (item.listingStatus !== 'live') return false;

      const matchedQuery = item.username.toLowerCase().includes(search.toLowerCase()) || 
                           item.category.toLowerCase().includes(search.toLowerCase());
      
      const matchedPlatform = platformFilter === 'all' || item.platform === platformFilter;
      const matchedRarity = rarityFilter === 'all' || item.rarityScore === rarityFilter;
      
      let matchedPriceStatus = true;
      if (budgetFilter === 'under-k') {
        matchedPriceStatus = item.askingPrice < 50000;
      } else if (budgetFilter === 'k-k') {
        matchedPriceStatus = item.askingPrice >= 50000 && item.askingPrice <= 150000;
      } else if (budgetFilter === 'over-k') {
        matchedPriceStatus = item.askingPrice > 150000;
      }

      return matchedQuery && matchedPlatform && matchedRarity && matchedPriceStatus;
    }).sort((a, b) => {
      if (sortOption === 'price-asc') return a.askingPrice - b.askingPrice;
      if (sortOption === 'price-desc') return b.askingPrice - a.askingPrice;
      return 0; // default
    });
  }, [listings, search, platformFilter, budgetFilter, rarityFilter, sortOption]);

  const currentListing = useMemo(() => {
    return listings.find((l) => l.id === selectedId);
  }, [listings, selectedId]);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col font-sans antialiased">
      
      {/* Dynamic Top Unified Banner */}
      <section className="bg-gradient-to-r from-blue-950/70 via-black to-indigo-950/70 border-b border-white/[0.04] py-2 px-4 relative z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="font-semibold text-zinc-300 tracking-wide">
              Manual Escrow Brokerage • Managing Premium Identity Swaps in INR (₹)
            </p>
          </div>
          <div className="flex items-center gap-3">
            {supabaseActive ? (
              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/20">
                <Database className="w-2.5 h-2.5" /> SUPABASE SYNCED UNIFIED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-500 font-mono px-2 py-0.5 rounded border border-amber-500/20">
                <Info className="w-2.5 h-2.5" /> LOCAL STORAGE DEMO MODE
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Main Responsive Navigation Navbar */}
      <nav className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo area */}
            <div className="flex items-center">
              <button 
                onClick={() => { setActiveTab('home'); setSelectedId(null); }}
                className="flex items-center space-x-2.5 hover:opacity-90 active:scale-95 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
                  <span className="text-white font-extrabold text-base tracking-wider font-display">ID</span>
                </div>
                <div>
                  <span className="text-xl font-black tracking-tight text-white block font-display">IDsvault</span>
                  <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-500 block">Digital Identity Broker</span>
                </div>
              </button>
            </div>

            {/* Desktop Center Links */}
            <div className="hidden md:flex items-center space-x-7">
              {[
                { tab: 'home', label: 'Dashboard' },
                { tab: 'browse', label: 'Browse live IDs' },
                { tab: 'sell', label: 'Sell Your Handle' },
                { tab: 'request', label: 'Commission Hunt' },
                { tab: 'how', label: 'Escrow flow' },
                { tab: 'faq', label: 'FAQs' },
              ].map((item) => {
                const isActive = activeTab === item.tab && !selectedId;
                return (
                  <button
                    key={item.tab}
                    onClick={() => { setActiveTab(item.tab); setSelectedId(null); }}
                    className={`text-xs font-bold tracking-wider uppercase transition-colors duration-200 ${
                      isActive ? 'text-blue-500 border-b-2 border-blue-500 pb-1' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Right Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => { setActiveTab('admin'); setSelectedId(null); }}
                className={`text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 py-1.5 px-3 rounded-md transition-colors ${activeTab === 'admin' ? 'bg-blue-950/40 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <LockKeyhole className="w-3.5 h-3.5" />
                <span>Admin Panel</span>
              </button>
              
              <button
                onClick={() => window.open(generateWhatsAppLink('Hello! I have inquiries regarding acquiring or selling premium digital handles on IDsvault. Please connect me to a manual broker.'), '_blank')}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white rounded-full text-xs font-bold tracking-wide transition-all active:scale-[0.98]"
              >
                Direct Concierge Chat
              </button>
            </div>

            {/* Mobile Hamburger Toggle */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenu(!mobileMenu)}
                className="p-2 text-zinc-400 hover:text-white focus:outline-none"
                aria-label="Toggle Menu"
              >
                {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenu && (
          <div className="md:hidden border-t border-white/5 bg-[#0e0e0f] px-4 pt-4 pb-6 space-y-2">
            {[
              { tab: 'home', label: 'Vault Dashboard' },
              { tab: 'browse', label: 'Browse Live IDs' },
              { tab: 'sell', label: 'Sell Your Handle' },
              { tab: 'request', label: 'Commission Hunt' },
              { tab: 'how', label: 'Escrow Flow' },
              { tab: 'faq', label: 'FAQs' },
              { tab: 'admin', label: 'Admin Workspace' }
            ].map((item) => {
              const isActive = activeTab === item.tab;
              return (
                <button
                  key={item.tab}
                  onClick={() => { setActiveTab(item.tab); setSelectedId(null); setMobileMenu(false); }}
                  className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-950/50 text-blue-400 font-semibold' : 'text-zinc-400 hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <div className="pt-4 border-t border-white/5">
              <button
                onClick={() => {
                  setMobileMenu(false);
                  window.open(generateWhatsAppLink('Hello! I have queries on digital escrows handles. Please connect a broker.'), '_blank');
                }}
                className="w-full text-center py-3 bg-white text-black font-bold text-xs uppercase tracking-wide rounded-xl"
              >
                Broker Chat (WhatsApp)
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">

        {dataLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="text-zinc-400 text-sm font-mono uppercase tracking-widest">Loading Registry Data...</span>
          </div>
        ) : (
          <>
            {/* ----------------- SUB-ROUTE: LISTING DETAILS PAGE ----------------- */}
            {selectedId && currentListing ? (
              <div className="space-y-12">
                
                {/* Back button */}
                <div className="flex items-center">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>&larr;</span> Back to Registry
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                  
                  {/* Detailed Left Side */}
                  <div className="lg:col-span-8 space-y-8 text-left">
                    
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="px-3 py-1 text-[10px] uppercase tracking-wider font-extrabold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full">
                          {currentListing.rarityScore} Rank
                        </span>
                        <span className="px-3 py-1 text-[10px] uppercase tracking-wider font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                          Vetting Protocols Met
                        </span>
                        <span className="text-xs font-mono text-zinc-500 uppercase">
                          {currentListing.platform} Channel
                        </span>
                      </div>
                      
                      <h1 className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-white">
                        @{currentListing.username}
                      </h1>
                      
                      <p className="text-sm font-semibold text-zinc-400">
                        Registry Classification: <span className="text-zinc-200">{currentListing.category}</span>
                      </p>
                    </div>

                    {/* Vette Status indicator block */}
                    <div className="p-6 bg-[#0c0c0e] border border-white/5 rounded-2xl space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span>Ownership Audit status log</span>
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-serif italic text-zinc-300">
                        &ldquo;{currentListing.brokerNotes || "Vetting Checklist: Hand-delivered verification bio token match completed. Original registration coordinates isolated securely."}&rdquo;
                      </p>
                    </div>

                    {/* Step-by-Step Risk Mitigated Escrow protocol checklist */}
                    <div className="p-6 sm:p-8 bg-[#0C0C0D] border border-white/[0.04] rounded-2xl space-y-6">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 font-mono">
                        Structured Transfer Roadmap
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed -mt-3">
                        Manual brokerage minimizes classic transfer risk points (e.g. automated network security clamps or original mailbox recovery exploits).
                      </p>
                      
                      {[
                        { step: 'Step A', title: 'Lock Negotiation Offer Parameters', desc: 'Settle on the target INR values. The buyer initiates standard IDsvault deal room credentials.' },
                        { step: 'Step B', title: 'Hold Escrow Settlement Monies', desc: 'Monies are securely held in standard administration vaults. Proceeds sit entirely untouched and isolated.' },
                        { step: 'Step C', title: 'Coordinate Credentials Transition', desc: 'Our senior broker manually switches registered phone tags, verification levels, and updates backup metadata.' },
                        { step: 'Step D', title: 'Final Handover Authorization', desc: 'Payouts drop safely to the verified seller as soon as corporate device tests are approved.' }
                      ].map((road, index) => (
                        <div key={index} className="flex gap-4 items-start">
                          <div className="w-8 h-8 rounded bg-zinc-900 border border-white/10 flex items-center justify-center text-[10px] font-mono font-bold text-blue-400 shrink-0">
                            {road.step}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-zinc-200 mb-0.5">{road.title}</h4>
                            <p className="text-xs text-zinc-400 leading-relaxed">{road.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>

                  {/* Pricing action card box (Right) */}
                  <div className="lg:col-span-4 text-left">
                    <div className="border border-white/[0.08] bg-[#111112] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
                      
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Asset Display Mode</span>
                        <div className="flex flex-col mt-1">
                          <span className="text-[11px] font-mono text-blue-400 uppercase tracking-widest font-semibold">
                            {getDisplayPriceAndCTA(currentListing).subtitle}
                          </span>
                          <span className="text-2xl sm:text-3xl font-mono font-black text-white mt-1">
                            {getDisplayPriceAndCTA(currentListing).displayPrice}
                          </span>
                        </div>
                      </div>

                      <hr className="border-white/5" />

                      <div className="space-y-3">
                        <button
                          onClick={() => {
                            setBuyerOffer(currentListing.askingPrice.toString());
                            setDealModalOpen(true);
                          }}
                          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold tracking-widest uppercase shadow-lg shadow-blue-500/10 active:scale-95 transition-all text-center cursor-pointer"
                        >
                          Initiate Deal Room
                        </button>

                        <button
                          onClick={() => {
                            setBuyerOffer('');
                            setDealModalOpen(true);
                          }}
                          className="w-full py-4 bg-[#1b1b1c] hover:bg-zinc-800 border border-white/10 text-zinc-200 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-center cursor-pointer"
                        >
                          Make Custom Offer
                        </button>
                      </div>

                      <div className="pt-2 space-y-3 text-[11px] text-zinc-400 leading-normal border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>Structured manual security audits.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>Broker commission: {brokeragePct}% administrative fee.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>Private WhatsApp communications workspace.</span>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

                {/* Secure Escrow Deal Modal */}
                {dealModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030303]/95 backdrop-blur-md">
                    <div className="w-full max-w-lg bg-[#111112] border border-white/10 rounded-2xl p-6 sm:p-8 relative space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
                      
                      {/* Close button */}
                      <button
                        onClick={() => setDealModalOpen(false)}
                        className="absolute top-5 right-5 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        aria-label="Close Modal"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      <div className="text-left">
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Open Escrow Deal Room</h2>
                        <p className="text-xs text-zinc-400 mt-1">
                          Securing premium digital asset: <span className="font-mono text-zinc-200 font-semibold">@{currentListing.username} ({currentListing.platform})</span>
                        </p>
                      </div>

                      <form onSubmit={(e) => handleStartDealForm(e, currentListing)} className="space-y-4 text-left">
                        
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Full Legal Name</label>
                          <input
                            type="text"
                            required
                            value={buyerName}
                            onChange={(e) => setBuyerName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none placeholder-zinc-700"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">WhatsApp Mobile number</label>
                          <input
                            type="tel"
                            required
                            value={buyerPhone}
                            onChange={(e) => setBuyerPhone(e.target.value)}
                            placeholder="e.g. +91 99999 88888"
                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none placeholder-zinc-700 font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Acquisition Offer (₹ INR)</label>
                            <input
                              type="number"
                              required
                              value={buyerOffer}
                              onChange={(e) => setBuyerOffer(e.target.value)}
                              placeholder={`Min ${currentListing.askingPrice}`}
                              className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none placeholder-zinc-700 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Urgency Limit</label>
                            <select
                              value={buyerUrgency}
                              onChange={(e) => setBuyerUrgency(e.target.value)}
                              className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                            >
                              <option value="ASAP Rush">ASAP Rush Delivery</option>
                              <option value="Standard Pace">Standard Broker Audit</option>
                              <option value="Standby Watch">Flexible / Opportunistic</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Transaction Notes (Optional)</label>
                          <textarea
                            value={buyerNotes}
                            onChange={(e) => setBuyerNotes(e.target.value)}
                            placeholder="State customization requests or recovery email conditions..."
                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-blue-500 focus:outline-none h-16 resize-none placeholder-zinc-700"
                          />
                        </div>

                        {/* Real Cloudflare Turnstile Integration */}
                        <div className="py-1">
                          <CloudflareTurnstile onVerified={setTurnstileVerified} verified={turnstileVerified} />
                        </div>

                        <button
                          type="submit"
                          disabled={!turnstileVerified}
                          className="w-full py-4 text-xs font-bold tracking-widest uppercase rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer"
                          style={{
                            backgroundColor: turnstileVerified ? '#10b981' : '#1e1b4b',
                            color: '#ffffff'
                          }}
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Establish Escrow on WhatsApp</span>
                        </button>

                      </form>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div>

                {/* ----------------- SUB-ROUTE: VAULT DASHBOARD / HOME ----------------- */}
                {activeTab === 'home' && (
                  <div className="space-y-24">
                    
                    {/* Hero Branding Section */}
                    <header className="relative pt-12 pb-8 flex flex-col lg:flex-row items-center gap-12 text-left">
                      <div className="flex-1 space-y-6 relative z-20">
                        
                        <div className="inline-flex items-center space-x-2 bg-white/[0.03] border border-white/10 px-3.5 py-1.5 rounded-full">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                          <span className="text-[10px] uppercase tracking-widest font-extrabold text-zinc-300 font-mono">
                            Manual Broker Escrow Shield
                          </span>
                        </div>

                        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-white font-display uppercase">
                          Premium IDs. <span className="text-blue-500 block">Vetted Escrow.</span>
                        </h1>

                        <p className="text-base sm:text-lg text-zinc-400 max-w-lg leading-relaxed font-serif font-light">
                          Broker premium digital assets, OG usernames, domains, and channels safely. Our experienced manual verification pipelines isolate classic handover vulnerabilities.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-2">
                          <button
                            onClick={() => setActiveTab('browse')}
                            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-blue-500/10 text-center cursor-pointer"
                          >
                            Browse Vault Registry
                          </button>
                          <button
                            onClick={() => setActiveTab('sell')}
                            className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 font-bold text-xs uppercase tracking-widest rounded-xl transition-colors text-center cursor-pointer"
                          >
                            Submit Asset Listing
                          </button>
                        </div>

                        {/* Flat facts */}
                        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/[0.04]">
                          <div>
                            <h4 className="text-xs font-bold text-zinc-300">Brokered Security</h4>
                            <span className="text-[10px] text-zinc-500 block">Risk minimisation</span>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-zinc-300">Detailed Vetting</h4>
                            <span className="text-[10px] text-zinc-500 block font-semibold text-blue-500">Duplicate prevention</span>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-zinc-300 font-mono">₹ Indian Rupees</h4>
                            <span className="text-[10px] text-zinc-500 block">Seamless INR payments</span>
                          </div>
                        </div>

                      </div>

                      {/* Mockup Card side */}
                      <div className="flex-1 w-full relative">
                        <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full" />
                        <div className="relative border border-white/[0.1] bg-[#0c0c0e]/80 p-6 sm:p-8 rounded-2xl shadow-2xl space-y-6">
                          
                          <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <span className="text-[10px] font-mono tracking-wider font-bold text-zinc-500 uppercase">Live Vault Case #8821</span>
                            <span className="px-2.5 py-0.5 text-[9px] uppercase tracking-widest font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded">
                              UNDER CLEARANCE
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <span className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">@nexus</span>
                              <span className="block text-[10px] text-zinc-500">Instagram Luxury Handle</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xl font-bold font-mono text-emerald-400">Make an Offer</span>
                              <span className="block text-[10px] text-zinc-500 tracking-wider font-mono uppercase font-semibold">Vetting Cleared</span>
                            </div>
                          </div>

                          <div className="p-4 bg-zinc-950/80 border border-white/5 rounded-xl space-y-2 text-left">
                            <p className="text-xs text-zinc-400 leading-relaxed italic">
                              &ldquo;Original registration coordinate mapping checked, devices history cleared. Handover released safely according to escrow checklist benchmarks.&rdquo;
                            </p>
                            <span className="block text-[9px] font-mono font-bold text-blue-500 uppercase tracking-widest">— Escrow Protocol Log</span>
                          </div>

                        </div>
                      </div>
                    </header>

                    {/* Vetted Highlights */}
                    <section className="space-y-8 text-left">
                      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/5 pb-4">
                        <div>
                          <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white uppercase font-mono">Registries Highlights</h2>
                          <p className="text-xs text-zinc-500 mt-1">Premium handles fully ownership checked and structured for escrow transfer.</p>
                        </div>
                        <button
                          onClick={() => setActiveTab('browse')}
                          className="text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 shrink-0 self-start sm:self-auto cursor-pointer"
                        >
                          <span>Explore complete registry catalog</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {listings.filter(l => l.featured).slice(0, 4).map((item) => (
                          <ListingCard 
                            key={item.id} 
                            item={item} 
                            onClick={setSelectedId} 
                            onQuickDeal={(e, it) => {
                              setSelectedId(it.id);
                              setBuyerOffer(it.askingPrice.toString());
                              setDealModalOpen(true);
                            }}
                          />
                        ))}
                      </div>
                    </section>

                    {/* Fast Search Request commissioning */}
                    <section className="bg-gradient-to-br from-[#0e0e0f] to-[#070708] border border-white/[0.08] p-6 sm:p-10 rounded-2xl relative overflow-hidden text-left">
                      <div className="text-center max-w-md mx-auto mb-8">
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase font-mono">Acquisition Hunting Commission</h2>
                        <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                          Commission our brokering experts to dynamically hunt, contact, and negotiate with the original owners of generic custom handles. Unlocks private escrow.
                        </p>
                      </div>

                      <form onSubmit={handleAcquisitionSubmit} className="space-y-4 max-w-3xl mx-auto">
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Target Username Handle</label>
                            <input
                              type="text"
                              required
                              value={reqUsername}
                              onChange={(e) => setReqUsername(e.target.value)}
                              placeholder="e.g. @premiumname"
                              className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none placeholder-zinc-700 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Platform Channel</label>
                            <select
                              value={reqPlatform}
                              onChange={(e) => setReqPlatform(e.target.value as PlatformType)}
                              className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                            >
                              <option value="instagram">Instagram</option>
                              <option value="x">X / Twitter</option>
                              <option value="telegram">Telegram</option>
                              <option value="brandable">Premium Domains</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Maximum Budget Limit (₹ INR)</label>
                            <input
                              type="number"
                              required
                              value={reqBudget}
                              onChange={(e) => setReqBudget(e.target.value)}
                              placeholder="e.g. 100000"
                              className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none placeholder-zinc-700 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Urgency matrix</label>
                            <select
                              value={reqUrgency}
                              onChange={(e) => setReqUrgency(e.target.value)}
                              className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none font-semibold text-zinc-200"
                            >
                              <option value="ASAP Hunt">Immediate Rush</option>
                              <option value="Medium">Standard Search Routine</option>
                              <option value="Standby">Passive opportunistic watchlist</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-4 bg-white hover:bg-zinc-200 text-black text-xs font-bold tracking-widest uppercase rounded-xl transition-all shadow-md mt-2 cursor-pointer"
                        >
                          Acquire Direct Target Search
                        </button>

                      </form>
                    </section>

                    {/* Vetting highlights guidelines */}
                    <section className="space-y-12 text-left">
                      <div className="text-center max-w-sm mx-auto">
                        <span className="text-[10px] tracking-wider font-extrabold uppercase text-blue-500 font-mono">Bespoke Frameworks</span>
                        <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 uppercase tracking-tight">Manual Broker mechanics</h2>
                        <p className="text-xs text-zinc-400 mt-2">Why automated checking engines fail; manual escrow isolates risk.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
                        {[
                          { step: '01', title: 'Listing Vetting Status', desc: 'Each submitted handle is checked manually. Recovery email logs and social claims coordinates are cleared.' },
                          { step: '02', title: 'Monies Vault Hold', desc: 'The buyer deposits funds securely. monie accounts reside untouched pending clearance benchmarks.' },
                          { step: '03', title: 'Hands-on Swap Coordination', desc: 'Seniors manually shift devices authentication keys and links, closing active backdoors exploits.' },
                          { step: '04', title: 'Settlement Proceed Released', desc: 'Proceed transfers release cleanly to the verified seller dynamically upon devices approval.' }
                        ].map((step, idx) => (
                          <div key={idx} className="space-y-3">
                            <div className="w-11 h-11 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-blue-400">
                              {step.step}
                            </div>
                            <h4 className="text-sm font-extrabold text-zinc-200">{step.title}</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed font-serif">{step.desc}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                  </div>
                )}

                {/* ----------------- SUB-ROUTE: BROWSE REGISTRY INVENTORY ----------------- */}
                {activeTab === 'browse' && (
                  <div className="space-y-8 animate-fadeIn text-left">
                    
                    <div>
                      <h1 className="text-2xl sm:text-4xl font-black text-white uppercase font-mono tracking-tight">Vault Registry Inventory</h1>
                      <p className="text-xs text-zinc-400 mt-1">Select and negotiate premium digital assets vetted under detailed broker checklist controls.</p>
                    </div>

                    {/* Filters block */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-5 sm:p-6 bg-[#0c0c0d] border border-white/5 rounded-xl">
                      
                      <div className="lg:col-span-4 relative">
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Search Handles or Tag</label>
                        <div className="relative">
                          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                          <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="e.g. alpha, 3-letter, dictionary word..."
                            className="w-full bg-[#050505] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-blue-500 focus:outline-none placeholder-zinc-700"
                          />
                        </div>
                      </div>

                      <div className="lg:col-span-2">
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Platform</label>
                        <select
                          value={platformFilter}
                          onChange={(e) => setPlatformFilter(e.target.value)}
                          className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-3 text-xs focus:border-blue-500 focus:outline-none font-semibold text-zinc-300"
                        >
                          <option value="all">Any Channel</option>
                          <option value="instagram">Instagram</option>
                          <option value="x">X / Twitter</option>
                          <option value="telegram">Telegram</option>
                          <option value="brandable">Premium Domains</option>
                          <option value="custom">Other Web Property</option>
                        </select>
                      </div>

                      <div className="lg:col-span-2">
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Budget (INR)</label>
                        <select
                          value={budgetFilter}
                          onChange={(e) => setBudgetFilter(e.target.value)}
                          className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-3 text-xs focus:border-blue-500 focus:outline-none font-semibold text-zinc-300"
                        >
                          <option value="all">Any Asking Price</option>
                          <option value="under-k">Under ₹50,000 INR</option>
                          <option value="k-k">₹50,000 to ₹1,50,000 INR</option>
                          <option value="over-k">Above ₹1,50,000 INR</option>
                        </select>
                      </div>

                      <div className="lg:col-span-2">
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Rarity Rank</label>
                        <select
                          value={rarityFilter}
                          onChange={(e) => setRarityFilter(e.target.value)}
                          className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-3 text-xs focus:border-blue-500 focus:outline-none font-semibold text-zinc-300"
                        >
                          <option value="all">Any Rarity</option>
                          <option value="Grail">Grail Type</option>
                          <option value="Legendary">Legendary Type</option>
                          <option value="Ultra Rare">Ultra Rare Type</option>
                          <option value="Rare">Rare Type</option>
                        </select>
                      </div>

                      <div className="lg:col-span-2">
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Sort Pricing</label>
                        <select
                          value={sortOption}
                          onChange={(e) => setSortOption(e.target.value)}
                          className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-3 text-xs focus:border-blue-500 focus:outline-none font-semibold text-zinc-300"
                        >
                          <option value="price-desc">High to Low Price</option>
                          <option value="price-asc">Low to High Price</option>
                        </select>
                      </div>

                    </div>

                    {/* Vetted results Grid layout */}
                    {filteredListings.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {filteredListings.map((item) => (
                          <ListingCard 
                            key={item.id} 
                            item={item} 
                            onClick={setSelectedId} 
                            onQuickDeal={(e, it) => {
                              setSelectedId(it.id);
                              setBuyerOffer(it.askingPrice.toString());
                              setDealModalOpen(true);
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl max-w-xl mx-auto space-y-4 bg-[#0c0c0d]">
                        <div className="p-3 bg-zinc-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-zinc-500">
                          <Inbox className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">No Registry Entries Match</h3>
                        <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                          We do not currently host live original registry assets fitting those criteria. Commission a target search hunt on our broker desks!
                        </p>
                        <button
                          onClick={() => setActiveTab('request')}
                          className="px-6 py-3 bg-white text-black text-xs font-bold tracking-widest uppercase rounded-xl cursor-pointer"
                        >
                          Commission Custom Hunt
                        </button>
                      </div>
                    )}

                  </div>
                )}

                {/* ----------------- SUB-ROUTE: SELL / SUBMIT WIZARD (WITH UPLOAD VALIDATION) ----------------- */}
                {activeTab === 'sell' && (
                  <div className="max-w-xl mx-auto animate-fadeIn text-left">
                    <div className="bg-[#111112] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-2xl">
                      
                      {/* Top horizontal timeline tracker */}
                      <div className="absolute top-0 inset-x-0 h-1 bg-zinc-900">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${(wizardStep / 4) * 100}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center bg-zinc-900/40 p-2 rounded-lg">
                        <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-extrabold font-mono">Wizard checkpoint {wizardStep} of 4</span>
                        <span className="text-[9px] uppercase font-bold text-blue-400 bg-blue-500/10 border border-blue-500/10 px-2 py-0.5 rounded font-mono">Dossier Audit Mode</span>
                      </div>

                      <form onSubmit={handleWizardSubmit} className="space-y-5 text-left">
                        
                        {/* STEP 1: Handle parameters */}
                        {wizardStep === 1 && (
                          <div className="space-y-4 animate-fadeIn">
                            <div className="space-y-1">
                              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Identity Parameters</h2>
                              <p className="text-xs text-zinc-400">Provide the generic handle username coordinates you wish to sell brokerage on.</p>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Asset Handle</label>
                              <input
                                type="text"
                                required
                                value={sellUsername}
                                onChange={(e) => setSellUsername(e.target.value)}
                                placeholder="e.g. @alpha"
                                className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none placeholder-zinc-700 font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Platform</label>
                              <select
                                value={sellPlatform}
                                onChange={(e) => setSellPlatform(e.target.value as PlatformType)}
                                className="w-full bg-[#050505] border border-white/10 rounded-xl px-3.5 py-3 text-sm focus:border-blue-500 focus:outline-none font-semibold text-zinc-300"
                              >
                                <option value="instagram">Instagram Username</option>
                                <option value="x">X / Twitter Username</option>
                                <option value="telegram">Telegram Username</option>
                                <option value="brandable">Premium Domain Package</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Asset Classification Tag</label>
                              <input
                                type="text"
                                required
                                value={sellCategory}
                                onChange={(e) => setSellCategory(e.target.value)}
                                placeholder="e.g. 3-character dictionary word, crypto identifier..."
                                className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none placeholder-zinc-700"
                              />
                            </div>
                          </div>
                        )}

                        {/* STEP 2: Asking Price settings */}
                        {wizardStep === 2 && (
                          <div className="space-y-4 animate-fadeIn">
                            <div className="space-y-1">
                              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Escrow target values</h2>
                              <p className="text-xs text-zinc-400">Declare target pricing. Minimum values remain entirely hidden and confidential to brokers.</p>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Requested Asking Price (₹ INR)</label>
                              <input
                                type="number"
                                required
                                value={sellAskingPrice}
                                onChange={(e) => setSellAskingPrice(e.target.value)}
                                placeholder="e.g. 150000"
                                className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none placeholder-zinc-700 font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Minimum Floor Reserve Value (₹ INR, Private)</label>
                              <input
                                type="number"
                                value={sellMinPrice}
                                onChange={(e) => setSellMinPrice(e.target.value)}
                                placeholder="e.g. 110000 (Private slider trigger)"
                                className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none placeholder-zinc-700 font-mono"
                              />
                            </div>
                          </div>
                        )}

                        {/* STEP 3: VETTING screenshot proof drag & drop zone */}
                        {wizardStep === 3 && (
                          <div className="space-y-4 animate-fadeIn">
                            <div className="space-y-1">
                              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Upload Ownership Proof</h2>
                              <p className="text-xs text-zinc-400">
                                Drag and drop screen logs, registration invoices or configuration snapshot files to validate immediate control.
                              </p>
                            </div>

                            <div 
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleFileDrop}
                              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                                isDragging ? 'border-blue-500 bg-blue-950/20' : sellerProofName ? 'border-emerald-500 bg-emerald-950/5' : 'border-white/10 bg-[#050505]'
                              }`}
                            >
                              <input 
                                type="file" 
                                id="sellerFileSelector"
                                accept=".png,.jpg,.jpeg,.pdf"
                                onChange={handleFileChange}
                                className="hidden"
                              />
                              
                              <div className="flex flex-col items-center justify-center space-y-3 cursor-pointer" onClick={() => document.getElementById('sellerFileSelector')?.click()}>
                                <Upload className={`w-8 h-8 ${sellerProofName ? 'text-emerald-400' : 'text-zinc-500'}`} />
                                <div>
                                  <p className="text-xs font-bold text-zinc-200">
                                    {sellerProofName ? 'File registered: ' + sellerProofName : 'Drag & Drop files or click to manual select'}
                                  </p>
                                  <p className="text-[10px] text-zinc-500 uppercase mt-1 font-mono">PNG, JPG, PDF (Max File size: 5MB limit)</p>
                                </div>
                              </div>
                            </div>

                            {sellerProofData && (
                              <div className="p-3 bg-zinc-950 border border-white/5 rounded-lg flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                                <span>Preview Ready</span>
                                <Check className="w-4 h-4 text-emerald-400" />
                              </div>
                            )}

                            <div className="p-5 bg-zinc-950/70 border border-white/5 rounded-xl flex gap-3 items-start">
                              <input
                                type="checkbox"
                                id="declaration"
                                checked={sellDeclaration}
                                onChange={(e) => setSellDeclaration(e.target.checked)}
                                className="mt-1 h-4.5 w-4.5 rounded bg-zinc-900 border-white/10 text-blue-600 focus:ring-0 cursor-pointer"
                              />
                              <label htmlFor="declaration" className="text-xs text-zinc-300 leading-relaxed font-serif">
                                I verify that I hold legitimate administrative control and recovery access key logs of this handle, with zero pending trademark disputes on major platforms.
                              </label>
                            </div>
                          </div>
                        )}

                        {/* STEP 4: Submit and open */}
                        {wizardStep === 4 && (
                          <div className="space-y-4 animate-fadeIn">
                            <div className="space-y-1">
                              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Broker Contacts</h2>
                              <p className="text-xs text-zinc-400">Provide direct contact details so brokers can open WhatsApp deal spaces upon verification approvals.</p>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Seller Legal Name</label>
                              <input
                                type="text"
                                required
                                value={sellSellerName}
                                onChange={(e) => setSellSellerName(e.target.value)}
                                placeholder="Rohan Sharma"
                                className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none placeholder-zinc-700"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">WhatsApp Mobile phone</label>
                              <input
                                type="tel"
                                required
                                value={sellWhatsapp}
                                onChange={(e) => setSellWhatsapp(e.target.value)}
                                placeholder="e.g. +91 99999 77777"
                                className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none placeholder-zinc-700 font-mono"
                              />
                            </div>

                            <div className="p-3.5 bg-zinc-900/60 border border-white/5 rounded-xl text-[11px] text-zinc-400 leading-relaxed">
                              Commission rate is locked at {brokeragePct}% administrative deduction upon completed, successful handovers. Zero listing charges.
                            </div>
                          </div>
                        )}

                        {/* Controls */}
                        <div className="flex items-center justify-between pt-4 border-t border-white/[0.04]">
                          {wizardStep > 1 ? (
                            <button
                              type="button"
                              onClick={() => setWizardStep(prev => prev - 1)}
                              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold tracking-wider uppercase rounded-xl transition-all cursor-pointer"
                            >
                              Back
                            </button>
                          ) : (
                            <div />
                          )}

                          {wizardStep < 4 ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (wizardStep === 1 && !sellUsername) {
                                  alert('Input handle username sequence before continuing.');
                                  return;
                                }
                                if (wizardStep === 2 && !sellAskingPrice) {
                                  alert('Declare asking price target before continuing.');
                                  return;
                                }
                                if (wizardStep === 3 && (!sellDeclaration || !sellerProofName)) {
                                  alert('Please upload ownership proof and check the security declaration box.');
                                  return;
                                }
                                setWizardStep(prev => prev + 1);
                              }}
                              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-wider uppercase rounded-xl transition-all shadow-md cursor-pointer"
                            >
                              Next Step
                            </button>
                          ) : (
                            <button
                              type="submit"
                              disabled={!sellDeclaration}
                              className="px-6 py-3 bg-emerald-600 disabled:bg-emerald-800 disabled:opacity-50 hover:bg-emerald-700 text-white text-xs font-bold tracking-wider uppercase rounded-xl transition-all hover:scale-[1.01] cursor-pointer"
                            >
                              Agree & List Submission
                            </button>
                          )}
                        </div>

                      </form>
                    </div>
                  </div>
                )}

                {/* ----------------- SUB-ROUTE: COMMISSION HUNT ----------------- */}
                {activeTab === 'request' && (
                  <div className="max-w-xl mx-auto animate-fadeIn text-left">
                    <div className="bg-[#111112] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl text-left">
                      
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white uppercase font-mono tracking-tight text-left">Target Search Commission</h1>
                        <p className="text-xs text-zinc-400 mt-1">
                          Can't locate your target username listed? Command our brokers to directly run discovery parameters, negotiate with current managers, and set up escrow.
                        </p>
                      </div>

                      <form onSubmit={handleAcquisitionSubmit} className="space-y-4">
                        
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Target Handle</label>
                          <input
                            type="text"
                            required
                            value={reqUsername}
                            onChange={(e) => setReqUsername(e.target.value)}
                            placeholder="e.g. @alpha"
                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none placeholder-zinc-700 font-mono font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Platform Channel</label>
                          <select
                            value={reqPlatform}
                            onChange={(e) => setReqPlatform(e.target.value as PlatformType)}
                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-3.5 py-3 text-sm focus:outline-none font-semibold text-zinc-300"
                          >
                            <option value="instagram">Instagram</option>
                            <option value="x">X / Twitter</option>
                            <option value="telegram">Telegram</option>
                            <option value="brandable">Premium Domain</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Acquisition Budget (₹ INR)</label>
                            <input
                              type="number"
                              required
                              value={reqBudget}
                              onChange={(e) => setReqBudget(e.target.value)}
                              placeholder="e.g. 120000"
                              className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none placeholder-zinc-700 font-mono font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Search Speed</label>
                            <select
                              value={reqUrgency}
                              onChange={(e) => setReqUrgency(e.target.value)}
                              className="w-full bg-[#050505] border border-white/10 rounded-xl px-3.5 py-3 text-sm focus:border-blue-500 focus:outline-none font-semibold text-zinc-300"
                            >
                              <option value="Immediate Rush">Urgent Premium Hunt Focus</option>
                              <option value="Medium">Standard Broker Routine</option>
                              <option value="Standby Watch">Passive watchlists registry</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono font-mono">Acceptable Swaps (Optional)</label>
                          <input
                            type="text"
                            value={reqAlternatives}
                            onChange={(e) => setReqAlternatives(e.target.value)}
                            placeholder="e.g. spelling variations or numbers swaps..."
                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none placeholder-zinc-700"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Your WhatsApp coordinates</label>
                          <input
                            type="tel"
                            required
                            value={reqWhatsapp}
                            onChange={(e) => setReqWhatsapp(e.target.value)}
                            placeholder="e.g. +91 99999 66666"
                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none placeholder-zinc-700 font-mono font-medium"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-4 bg-white hover:bg-zinc-200 text-black text-xs font-bold tracking-widest uppercase rounded-xl transition-all mt-4 cursor-pointer"
                        >
                          Lock Search Commission
                        </button>

                      </form>
                    </div>
                  </div>
                )}

                {/* ----------------- SUB-ROUTE: ESCROW MANUAL HOW GUIDE ----------------- */}
                {activeTab === 'how' && (
                  <div className="max-w-5xl mx-auto space-y-16 animate-fadeIn text-left">
                    <div className="text-center max-w-xl mx-auto space-y-4">
                      <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight uppercase font-mono tracking-tight text-center">Bespoke Escrow protocol</h1>
                      <p className="text-sm text-zinc-400 font-serif leading-relaxed text-center font-light">
                        Why automated checkouts represent high risk vectors inside premium digital platforms: they do not purge administrative backdoor logins, secondary backups phone numbers, or pending brand claims. Private human mediated escrows mitigate these liabilities.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {[
                        { number: '01', title: 'Isolate & Lock Handle', text: 'Senior brokers take direct control of the user registered handles, execute recovery audits, update admin records, and temporarily bind profile parameters.' },
                        { number: '02', title: 'Hold Escrow Settlement', text: 'Buyers place the collateral value securely. Proceed values sit untouched in neutral accounts pending checklists confirmation.' },
                        { number: '03', title: 'Swap Credentials Safely', text: 'Our brokers systematically swap registered backup mailboxes, close physical browser links, verify brand clearances, and complete payout releases.' }
                      ].map((card, idx) => (
                        <div key={idx} className="p-8 bg-[#0c0c0d] border border-white/5 rounded-xl space-y-6 text-left">
                          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center font-mono font-bold text-xs text-blue-400">
                            {card.number}
                          </div>
                          <h3 className="text-lg font-bold text-white">{card.title}</h3>
                          <p className="text-xs text-zinc-400 leading-relaxed font-serif">{card.text}</p>
                        </div>
                      ))}
                    </div>

                    <div className="p-6 sm:p-10 border border-white/[0.08] bg-[#0c0c0e] rounded-2xl flex flex-col md:flex-row items-center justify-between gap-8 text-left">
                      <div className="space-y-2 max-w-lg">
                        <h2 className="text-lg sm:text-xl font-bold text-white uppercase font-mono">Commission structures</h2>
                        <p className="text-xs text-zinc-400 leading-normal font-serif font-light">
                          Our brokerage charges a flat {brokeragePct}% administrative verification fee upon successfully closed transfers. Zero upfront checkout costs.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('sell')}
                        className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-colors shrink-0 cursor-pointer text-center"
                      >
                        List Premium Handle
                      </button>
                    </div>
                  </div>
                )}

                {/* ----------------- SUB-ROUTE: FAQS ACCORDION ----------------- */}
                {activeTab === 'faq' && (
                  <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn text-left">
                    <div className="text-center space-y-1">
                      <h1 className="text-2xl sm:text-4xl font-black text-white uppercase font-mono">FAQ Accordion</h1>
                      <p className="text-xs text-zinc-400">Rules covering payment structures, handovers, timelines, and broker liabilities.</p>
                    </div>

                    <div className="space-y-4">
                      {FAQ_SEEDS.map((faq, fIdx) => {
                        const isOpen = activeFaq === fIdx;
                        return (
                          <div key={fIdx} className="border border-white/5 bg-[#0c0c0e] rounded-xl overflow-hidden shadow-sm">
                            <button
                              type="button"
                              onClick={() => setActiveFaq(isOpen ? null : fIdx)}
                              className="w-full flex justify-between items-center p-6 text-left focus:outline-none transition-colors"
                            >
                              <span className="text-sm font-extrabold text-white tracking-tight">{faq.q}</span>
                              <span className="text-blue-500 font-extrabold ml-4 shrink-0">{isOpen ? '—' : '+'}</span>
                            </button>

                            {isOpen && (
                              <div className="px-6 pb-6 pt-1 border-t border-white/[0.04]">
                                <p className="text-xs text-zinc-400 font-serif leading-relaxed font-light">{faq.a}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ----------------- ROUTE: SECURE ADMIN WORKSPACE ----------------- */}
                {activeTab === 'admin' && (
                  <div className="max-w-5xl mx-auto space-y-10 animate-fadeIn text-left">
                    
                    {!adminAuth ? (
                      <div className="max-w-sm mx-auto space-y-6 py-12">
                        <div className="text-center space-y-2">
                          <h2 className="text-2xl font-black text-white uppercase font-mono">Supervisor Gate check</h2>
                          <p className="text-xs text-zinc-500">Administrative desk passcode. Test key is <span className="font-mono text-zinc-300 font-bold bg-zinc-900 px-1.5 py-0.5 rounded">adminpass</span></p>
                        </div>

                        <form onSubmit={handleAdminAuthSubmit} className="p-6 bg-[#0c0c0e] border border-white/10 rounded-2xl space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-widest font-mono">Passcode</label>
                            <input
                              type="password"
                              required
                              value={adminPass}
                              onChange={(e) => setAdminPass(e.target.value)}
                              placeholder="Enter access code"
                              className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none placeholder-zinc-700"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-widest uppercase rounded-xl transition-all cursor-pointer"
                          >
                            Authenticate passkey
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="space-y-12">
                        
                        {/* Admin HUD stats */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase font-mono tracking-tight">Supervisor Desk HUD</h1>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">Vette inbound submissions, approve registries, sequence deals, and configure fee commission splits.</p>
                          </div>

                          <button
                            onClick={handleAdminDeauth}
                            className="px-4 py-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 text-xs font-semibold rounded-lg border border-red-500/10 uppercase select-none transition-all cursor-pointer"
                          >
                            Disconnect Desk
                          </button>
                        </div>

                        {/* CONFIGURATION PANEL: Dynamic Broker Fee Commission Setting */}
                        <div className="p-6 bg-[#0c0c0e] border border-white/10 rounded-2xl space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300 font-mono flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4 text-blue-500" />
                            <span>Global Brokerage configurations</span>
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                            <div>
                              <p className="text-xs text-zinc-400 leading-relaxed font-serif font-light">
                                Configure the platform commissions deduction %. Payouts metrics across escrow deals recalculate dynamically based on this config.
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <input 
                                  type="range"
                                  min="1"
                                  max="50"
                                  value={brokeragePct}
                                  onChange={(e) => setBrokeragePct(parseInt(e.target.value, 10))}
                                  className="w-full uppercase cursor-pointer"
                                />
                                <div className="flex justify-between text-[9px] text-zinc-500 font-mono mt-1">
                                  <span>1% MIN</span>
                                  <span>50% MAX</span>
                                </div>
                              </div>
                              <div className="w-16 text-center bg-zinc-950 border border-white/5 p-2 rounded-lg font-mono font-bold text-blue-400">
                                {brokeragePct}%
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SUBMISSIONS QUEUE: Seller interactive workflows list */}
                        <div className="space-y-4 text-left">
                          <h2 className="text-lg font-bold text-white uppercase font-mono flex items-center gap-2">
                            <span>Approval Queue (Vetting required)</span>
                            <span className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 font-mono">
                              {submissions.length}
                            </span>
                          </h2>

                          {submissions.length > 0 ? (
                            <div className="space-y-4">
                              {submissions.map((sub) => {
                                const isChecking = checklistSubId === sub.id;
                                return (
                                  <div key={sub.id} className="border border-white/5 bg-[#0c0c0e] rounded-xl p-5 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
                                      <div>
                                        <span className="text-sm font-mono font-bold text-white block">@{sub.username}</span>
                                        <span className="text-[10px] text-zinc-500 uppercase font-mono">{sub.platform} • Category: {sub.category}</span>
                                      </div>
                                      <div className="text-left sm:text-right font-mono">
                                        <span className="text-xs font-semibold text-zinc-400 block">TARGET ASKING</span>
                                        <span className="text-sm font-bold text-emerald-400">{formatINR(sub.askingPrice)}</span>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-zinc-400">
                                      <div>
                                        <span className="block text-[8px] uppercase tracking-wider text-zinc-500">Seller details</span>
                                        <p className="font-sans font-bold text-zinc-200 mt-1">{sub.sellerName}</p>
                                        <p>{sub.whatsapp}</p>
                                        {sub.uploadProofName && (
                                          <div className="mt-2.5 flex items-center gap-1.5 p-1.5 bg-zinc-950 rounded border border-white/5 text-[10px] w-fit">
                                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                                            <span>{sub.uploadProofName}</span>
                                            {sub.uploadProofData?.startsWith('data:') && (
                                              <a href={sub.uploadProofData} target="_blank" rel="noopener noreferrer" className="text-[8px] bg-blue-500/10 text-blue-400 px-1 py-0.2 rounded hover:bg-blue-500/30">VIEW IMAGE</a>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap items-end gap-2 justify-start md:justify-end">
                                        {!isChecking ? (
                                          <>
                                            <button
                                              onClick={() => handleApproveSubmissionClick(sub.id)}
                                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] uppercase rounded-lg transition-all cursor-pointer"
                                            >
                                              Approve & List Live
                                            </button>
                                            <button
                                              onClick={() => handleRejectSubmissionExecute(sub.id)}
                                              className="px-3 py-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-500/10 text-[10px] font-extrabold uppercase rounded-lg transition-all cursor-pointer"
                                            >
                                              Reject
                                            </button>
                                          </>
                                        ) : (
                                          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest font-mono">Conduct Vetting Checklist Below</span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Checklist Vetting Panel (Active state ONLY) */}
                                    {isChecking && (
                                      <div className="mt-4 p-5 bg-[#050505] border border-white/10 rounded-xl space-y-4 text-xs">
                                        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                                          <span className="font-extrabold font-mono text-amber-400 tracking-wider text-[10px] uppercase">Interactive Brokering Vetting Checklist</span>
                                          <button onClick={() => setChecklistSubId(null)} className="text-zinc-500 hover:text-white uppercase font-mono text-[9px] font-bold">Cancel</button>
                                        </div>

                                        <div className="space-y-3 font-sans">
                                          <label className="flex items-start gap-2.5 cursor-pointer">
                                            <input 
                                              type="checkbox"
                                              checked={ownershipChecked}
                                              onChange={(e) => setOwnershipChecked(e.target.checked)}
                                              className="mt-0.5 h-4 w-4 text-blue-500 bg-zinc-900 border-white/10 rounded focus:ring-0"
                                            />
                                            <div>
                                              <span className="block font-bold text-zinc-100 text-xs">Acknowledge Direct bio-token configuration status</span>
                                              <p className="text-[11px] text-zinc-500">Confirm match validation of secure seed labels on account bio.</p>
                                            </div>
                                          </label>

                                          <label className="flex items-start gap-2.5 cursor-pointer">
                                            <input 
                                              type="checkbox"
                                              checked={historyChecked}
                                              onChange={(e) => setHistoryChecked(e.target.checked)}
                                              className="mt-0.5 h-4 w-4 text-blue-500 bg-zinc-900 border-white/10 rounded focus:ring-0"
                                            />
                                            <div>
                                              <span className="block font-bold text-zinc-100 text-xs">Original registration email mailbox secure checklist</span>
                                              <p className="text-[11px] text-zinc-500">Confirm original mailing coordinates are logged; isolation backups are safe.</p>
                                            </div>
                                          </label>

                                          <label className="flex items-start gap-2.5 cursor-pointer">
                                            <input 
                                              type="checkbox"
                                              checked={riskChecked}
                                              onChange={(e) => setRiskChecked(e.target.checked)}
                                              className="mt-0.5 h-4 w-4 text-blue-500 bg-zinc-900 border-white/10 rounded focus:ring-0"
                                            />
                                            <div>
                                              <span className="block font-bold text-zinc-100 text-xs">Execute Trademark and hijacking assessment audit</span>
                                              <p className="text-[11px] text-zinc-500">Scan major corporate registries to confirm zero brand disputes.</p>
                                            </div>
                                          </label>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/5">
                                          <div>
                                            <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Select Price Display Representation strategy</label>
                                            <select
                                              value={selectedDisplayStrategy}
                                              onChange={(e) => setSelectedDisplayStrategy(e.target.value as PriceDisplayType)}
                                              className="w-full bg-zinc-900 border border-white/10 p-2.5 rounded text-xs text-white"
                                            >
                                              <option value="MAKE_OFFER">MAKE_OFFER (Best default)</option>
                                              <option value="PRICE_ON_REQUEST">PRICE_ON_REQUEST (Luxury feeling)</option>
                                              <option value="BROKER_VALUATION_RANGE">BROKER_VALUATION_RANGE</option>
                                              <option value="HOT_DEMAND">HOT_DEMAND (URGENT)</option>
                                              <option value="RARITY_SCORE">RARITY_SCORE (Emotion tag)</option>
                                              <option value="CATEGORY_VALUE">CATEGORY_VALUE</option>
                                              <option value="STARTING_BID">STARTING_BID (Bidding)</option>
                                              <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                                            </select>
                                          </div>

                                          <div>
                                            <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono font-mono">Vetting Broker Note labels</label>
                                            <input 
                                              type="text"
                                              value={verifierNotes}
                                              onChange={(e) => setVerifierNotes(e.target.value)}
                                              placeholder="e.g. Cleared 2FA mail checks. Clean account lineage."
                                              className="w-full bg-zinc-900 border border-white/10 p-2.5 rounded text-xs text-white"
                                            />
                                          </div>
                                        </div>

                                        <div className="pt-3 flex gap-2 justify-end">
                                          <button
                                            type="button"
                                            onClick={() => handleApproveVettingExecute(sub)}
                                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold uppercase rounded text-[10px] tracking-wider cursor-pointer"
                                          >
                                            Pass Audits & List Live
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-10 text-center border border-dashed border-white/10 rounded-xl text-zinc-500 font-serif italic text-xs bg-[#0c0c0e]/40">
                              No inbound listing submissions awaiting vetting audits currently. All registries clean.
                            </div>
                          )}
                        </div>

                        {/* ACTIVE ESCROW TRANSACTIONS LEDGER BOARD */}
                        <div className="space-y-4 text-left">
                          <h2 className="text-lg font-bold text-white uppercase font-mono">Active Deals Ledger Swaps</h2>
                          
                          {deals.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {deals.map((deal) => {
                                // Calculate dynamic escrow figures matching brokeragePct configuration changes
                                const compBrokerage = deal.agreedPrice * (brokeragePct / 100);
                                const compPayout = deal.agreedPrice * (1 - brokeragePct / 100);

                                return (
                                  <div key={deal.id} className="p-6 bg-[#0c0c0d] border border-white/5 rounded-2xl space-y-4 shadow-xl">
                                    
                                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                      <div>
                                        <span className="text-lg font-mono font-black text-white">@{deal.username}</span>
                                        <span className="block text-[10px] text-zinc-500 font-semibold uppercase font-mono">{deal.platform} Escrow</span>
                                      </div>
                                      <span className="px-2.5 py-0.5 text-[9px] font-mono uppercase tracking-widest font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded">
                                        {deal.status}
                                      </span>
                                    </div>

                                    {/* Escrow Figures layout with config commission percentages */}
                                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-white/5 text-[11px] font-mono">
                                      <div>
                                        <span className="block text-[8px] text-zinc-500 uppercase">Deal Sum</span>
                                        <span className="font-bold text-white">{formatINR(deal.agreedPrice)}</span>
                                      </div>
                                      <div>
                                        <span className="block text-[8px] text-zinc-500 uppercase">Comm Fee ({brokeragePct}%)</span>
                                        <span className="font-bold text-blue-400">{formatINR(compBrokerage)}</span>
                                      </div>
                                      <div>
                                        <span className="block text-[8px] text-zinc-500 uppercase">Payout</span>
                                        <span className="font-bold text-emerald-400">{formatINR(compPayout)}</span>
                                      </div>
                                    </div>

                                    {/* Client Profile details */}
                                    <div className="text-[11px] text-zinc-400 space-y-1">
                                      <span className="block text-[8px] font-extrabold text-zinc-500 uppercase font-mono">Buyer contact parameters</span>
                                      <p className="text-zinc-200 mt-0.5 font-semibold">{deal.buyerName}</p>
                                      <p className="font-mono text-zinc-500 leading-none">{deal.whatsapp}</p>
                                    </div>

                                    {/* Active Pipeline Workflow seq progression */}
                                    <div className="pt-3 border-t border-white/5 space-y-3">
                                      <span className="block text-[8px] font-extrabold text-zinc-500 uppercase font-mono">Escrow Stage progressions</span>
                                      
                                      <div className="flex flex-wrap gap-2">
                                        {deal.status === 'NEW' && (
                                          <button
                                            onClick={() => advanceDealStatus(deal.id, 'VERIFYING')}
                                            className="px-2.5 py-1 text-[9px] font-mono uppercase font-bold bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-black rounded transition-all cursor-pointer"
                                          >
                                            Confirm Account Holding Parameters
                                          </button>
                                        )}
                                        {deal.status === 'VERIFYING' && (
                                          <button
                                            onClick={() => advanceDealStatus(deal.id, 'LIVE')}
                                            className="px-2.5 py-1 text-[9px] font-mono uppercase font-bold bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded transition-all cursor-pointer"
                                          >
                                            Activate Deal Room Lobby
                                          </button>
                                        )}
                                        {deal.status === 'LIVE' && (
                                          <button
                                            onClick={() => advanceDealStatus(deal.id, 'PAYMENT_RECEIVED')}
                                            className="px-2.5 py-1 text-[9px] font-mono uppercase font-bold bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white rounded transition-all cursor-pointer"
                                          >
                                            Confirm Deposit Receipt
                                          </button>
                                        )}
                                        {deal.status === 'PAYMENT_RECEIVED' && (
                                          <button
                                            onClick={() => advanceDealStatus(deal.id, 'TRANSFER_LIVE')}
                                            className="px-2.5 py-1 text-[9px] font-mono uppercase font-bold bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded transition-all cursor-pointer"
                                          >
                                            Initiate Handover Shift
                                          </button>
                                        )}
                                        {deal.status === 'TRANSFER_LIVE' && (
                                          <button
                                            onClick={() => advanceDealStatus(deal.id, 'COMPLETED')}
                                            className="px-2.5 py-1 text-[9px] font-mono uppercase font-bold bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded transition-all cursor-pointer"
                                          >
                                            Complete Final release
                                          </button>
                                        )}
                                        {deal.status === 'COMPLETED' ? (
                                          <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                            <Check className="w-3.5 h-3.5 shrink-0" />
                                            <span>Swap closed successfully</span>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => advanceDealStatus(deal.id, 'DISPUTE')}
                                            className="px-2.5 py-1 text-[9px] font-mono uppercase font-bold bg-red-950/20 text-red-400 border border-red-500/10 hover:bg-red-500/20 rounded transition-colors cursor-pointer"
                                          >
                                            Dispute / Pause Hold
                                          </button>
                                        )}
                                        
                                        <button
                                          onClick={() => deleteDealFromPanel(deal.id)}
                                          className="text-[9px] uppercase font-bold text-zinc-600 hover:text-zinc-400 ml-auto"
                                        >
                                          Archive Ledger
                                        </button>
                                      </div>
                                    </div>

                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-zinc-500 font-serif italic">No verified transaction deals logs mapped currently.</p>
                          )}
                        </div>

                        {/* ACQUISITION HUNT COMMISSIONS LIST (Form data saving check) */}
                        <div className="space-y-4 text-left border-t border-white/5 pt-8">
                          <h2 className="text-lg font-bold text-white uppercase font-mono flex items-center gap-2">
                            <span>Hunter Commissions Registered</span>
                            <span className="px-2 py-0.5 text-xs bg-sky-500/10 text-sky-400 rounded-full border border-sky-500/20 font-mono">
                              {huntRequests.length}
                            </span>
                          </h2>

                          {huntRequests.length > 0 ? (
                            <div className="overflow-x-auto border border-white/5 bg-[#0c0c0e] rounded-xl shadow-md">
                              <table className="w-full border-collapse text-left text-xs">
                                <thead>
                                  <tr className="border-b border-white/5 text-[9px] uppercase tracking-wider text-zinc-500 font-mono">
                                    <th className="p-4">Target Handle</th>
                                    <th className="p-4">Platform</th>
                                    <th className="p-4">Maximum Budget</th>
                                    <th className="p-4">SpeedUrgent</th>
                                    <th className="p-4">Alternatives list</th>
                                    <th className="p-4 text-right">WhatsApp Contacts</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04] text-zinc-300 font-mono font-medium">
                                  {huntRequests.map((hunt) => (
                                    <tr key={hunt.id} className="hover:bg-white/[0.01]">
                                      <td className="p-4 font-bold text-white">@{hunt.desiredUsername}</td>
                                      <td className="p-4 uppercase">{hunt.platform}</td>
                                      <td className="p-4 text-emerald-400 font-bold">{formatINR(hunt.budget)}</td>
                                      <td className="p-4 text-zinc-400">{hunt.urgency}</td>
                                      <td className="p-4 font-sans text-zinc-500">{hunt.alternatives || 'None'}</td>
                                      <td className="p-4 text-right">{hunt.whatsapp}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="p-8 text-center border border-dashed border-white/10 rounded-xl text-zinc-500 font-serif italic text-xs bg-[#0c0c0e]/30">
                              No client-side direct hunter acquisition commissions loaded.
                            </div>
                          )}
                        </div>

                      </div>
                    )}

                  </div>
                )}

              </div>
            )}
          </>
        )}

      </main>

      {/* Corporate legal footer details */}
      <footer className="bg-[#0c0c0d] border-t border-white/[0.08] py-16 text-left mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center">
                  <span className="text-white font-extrabold text-xs tracking-wider">ID</span>
                </div>
                <span className="text-lg font-display font-black tracking-tight text-white uppercase">IDsvault</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed font-serif font-light">
                Digital Identity Neutral Brokerage. Private manual escrow administrators reducing handover risk factors.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4 font-mono">Marketplace Registry</h4>
              <ul className="space-y-2.5 text-xs text-zinc-400">
                <li><button onClick={() => { setActiveTab('browse'); setSelectedId(null); }} className="hover:text-white transition-colors cursor-pointer">Browse Vault Catalog</button></li>
                <li><button onClick={() => { setActiveTab('sell'); setSelectedId(null); }} className="hover:text-white transition-colors cursor-pointer">Submit Handle</button></li>
                <li><button onClick={() => { setActiveTab('request'); setSelectedId(null); }} className="hover:text-white transition-colors cursor-pointer">Commission Hunt</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4 font-mono">Handovers guides</h4>
              <ul className="space-y-2.5 text-xs text-zinc-400">
                <li><button onClick={() => { setActiveTab('how'); setSelectedId(null); }} className="hover:text-white transition-colors cursor-pointer">Bespoke Escrow Flow</button></li>
                <li><button onClick={() => { setActiveTab('faq'); setSelectedId(null); }} className="hover:text-white transition-colors cursor-pointer">Security FAQs</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4 font-mono">Vetted compliance policies</h4>
              <ul className="space-y-2.5 text-xs text-zinc-400 text-left">
                <li>
                  <button onClick={() => { setActiveTab('faq'); setSelectedId(null); }} className="hover:text-white transition-colors cursor-pointer text-left">
                    Terms of brokering
                  </button>
                </li>
                <li className="text-[11px] text-zinc-500 italic mt-1 font-serif leading-relaxed">
                  Disclaimer: Digital acquisitions naturally carry platform-dependency risk. Manual systems reduce standard loopholes but do not provide absolute immunity against social networks administrative reclaiming.
                </li>
              </ul>
            </div>

          </div>

          <div className="pt-8 border-t border-white/[0.04] md:flex md:justify-between md:items-center space-y-4 md:space-y-0 text-left">
            <p className="text-[9px] text-zinc-600 leading-normal max-w-xl font-mono">
              Disclaimer: IDsvault is an independent facilitator. We do not officially represent Meta Platforms, Instagram, X Corp, or Telegram Inc. All third party assets rights reside with original registrants.
            </p>
            <p className="text-xs text-zinc-500 font-mono">
              &copy; {new Date().getFullYear()} IDsvault Corporation. Safe escrow pathways.
            </p>
          </div>

        </div>
      </footer>

    </div>
  );
}
