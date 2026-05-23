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
  DollarSign,
  FileSpreadsheet,
  Activity,
  Settings,
  BarChart
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
  isSupabaseConnected,
  supabase
} from './lib/supabase';

import { 
  initAuth, 
  googleSignIn, 
  logoutSession, 
  createSpreadsheet, 
  formatLedgerHeaders, 
  appendToLedgerSheet, 
  fetchLedgerSheetRows, 
  exportListingsToLedger 
} from './lib/googleSheets';

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
import { initGA, logGAEvent, updateSEO } from './lib/seo';

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

  // Google Sheets Workspace integration state
  const [sheetsUser, setSheetsUser] = useState<any>(null);
  const [sheetsAccessToken, setSheetsAccessToken] = useState<string | null>(null);
  const [syncSpreadsheetId, setSyncSpreadsheetId] = useState<string | null>(() => {
    return localStorage.getItem('ids_spreadsheet_id') || null;
  });
  const [syncSpreadsheetUrl, setSyncSpreadsheetUrl] = useState<string | null>(() => {
    return localStorage.getItem('ids_spreadsheet_url') || null;
  });
  const [syncedRows, setSyncedRows] = useState<any[][] | null>(null);
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);

  // Monitor Google Sheets auth state changes
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setSheetsUser(user);
        setSheetsAccessToken(token);
        setSheetsError(null);
      },
      () => {
        setSheetsUser(null);
        setSheetsAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSheetsWebLogin = async () => {
    setSheetsError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setSheetsUser(res.user);
        setSheetsAccessToken(res.accessToken);
        setSyncSuccessToast("Successfully connected to Google Workspace Sheets!");
        setTimeout(() => setSyncSuccessToast(null), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setSheetsError(err.message || "Sign-in failed. Please retry.");
    }
  };

  const handleSheetsWebLogout = async () => {
    try {
      await logoutSession();
      setSheetsUser(null);
      setSheetsAccessToken(null);
      setSyncedRows(null);
      setSyncSpreadsheetId(null);
      setSyncSpreadsheetUrl(null);
      localStorage.removeItem('ids_spreadsheet_id');
      localStorage.removeItem('ids_spreadsheet_url');
      setSyncSuccessToast("Successfully disconnected Google account.");
      setTimeout(() => setSyncSuccessToast(null), 4000);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleFetchLiveSpreadsheetRows = async (targetId?: string, targetToken?: string) => {
    const currentId = targetId || syncSpreadsheetId;
    const currentToken = targetToken || sheetsAccessToken;
    if (!currentId || !currentToken) return;

    try {
      const rows = await fetchLedgerSheetRows(currentToken, currentId);
      if (rows) {
        setSyncedRows(rows);
      }
    } catch (err) {
      console.error("Failed to load rows from connected Google Sheet", err);
    }
  };

  // Pre-load sheet rows if already connected
  useEffect(() => {
    if (sheetsAccessToken && syncSpreadsheetId) {
      handleFetchLiveSpreadsheetRows();
    }
  }, [sheetsAccessToken, syncSpreadsheetId]);

  const handleCreateNewSpreadsheet = async () => {
    if (!sheetsAccessToken) return;
    setIsSyncingSheets(true);
    setSheetsError(null);
    try {
      const title = `IDsvault Secure Brokerage Ledger - ${new Date().toLocaleDateString()}`;
      const sheetDetail = await createSpreadsheet(sheetsAccessToken, title);
      
      setSyncSpreadsheetId(sheetDetail.id);
      setSyncSpreadsheetUrl(sheetDetail.url);
      localStorage.setItem('ids_spreadsheet_id', sheetDetail.id);
      localStorage.setItem('ids_spreadsheet_url', sheetDetail.url);

      const formatted = await formatLedgerHeaders(sheetsAccessToken, sheetDetail.id);
      if (formatted) {
        setSyncSuccessToast("Ledger Spreadsheet generated & formatted in GDrive!");
      } else {
        setSyncSuccessToast("Spreadsheet generated, but standard formatting failed.");
      }
      setTimeout(() => setSyncSuccessToast(null), 5000);
      
      // Load current listings bulk import to start off!
      await handleBulkExportCurrentListings(sheetDetail.id, sheetsAccessToken);
      
      // Load rows
      await handleFetchLiveSpreadsheetRows(sheetDetail.id, sheetsAccessToken);
    } catch (err: any) {
      console.error(err);
      setSheetsError(`Spreadsheet generation failed: ${err.message}`);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleBulkExportCurrentListings = async (targetId?: string, targetToken?: string) => {
    const currentId = targetId || syncSpreadsheetId;
    const currentToken = targetToken || sheetsAccessToken;
    if (!currentId || !currentToken) return;

    setIsSyncingSheets(true);
    setSheetsError(null);
    try {
      const exportedCount = await exportListingsToLedger(currentToken, currentId, listings);
      if (exportedCount > 0) {
        setSyncSuccessToast(`Successfully synced \& exported ${exportedCount} premium listings into your Google Sheet!`);
        setTimeout(() => setSyncSuccessToast(null), 5000);
        await handleFetchLiveSpreadsheetRows(currentId, currentToken);
      } else {
        setSheetsError("No listings were exported. Please check sheet configuration.");
      }
    } catch (err: any) {
      console.error(err);
      setSheetsError(`Listing sync failed: ${err.message}`);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Google Analytics Property Settings state
  const [gaAccountId, setGaAccountId] = useState<string>(() => {
    return localStorage.getItem('ids_ga_account_id') || '344958965';
  });
  const [gaPropertyId, setGaPropertyId] = useState<string>(() => {
    return localStorage.getItem('ids_ga_property_id') || '531107131';
  });
  const [gaMeasurementId, setGaMeasurementId] = useState<string>(() => {
    return localStorage.getItem('ids_ga_measurement_id') || 'G-531107131';
  });
  const [gaSuccessToast, setGaSuccessToast] = useState<string | null>(null);

  const handleUpdateGAConfig = (accountId: string, propertyId: string, measurementId: string) => {
    setGaAccountId(accountId);
    setGaPropertyId(propertyId);
    setGaMeasurementId(measurementId);
    localStorage.setItem('ids_ga_account_id', accountId);
    localStorage.setItem('ids_ga_property_id', propertyId);
    localStorage.setItem('ids_ga_measurement_id', measurementId);
    initGA(measurementId);
    setGaSuccessToast("Google Analytics configuration updated & reinitialized!");
    setTimeout(() => setGaSuccessToast(null), 4000);
  };

  // Google Analytics Event Interceptor Logs State
  const [gaCapturedLogs, setGaCapturedLogs] = useState<Array<{ timestamp: string; eventName: string; params: any }>>([]);

  useEffect(() => {
    const handleGaLog = (e: any) => {
      const { eventName, params, timestamp } = e.detail;
      setGaCapturedLogs(prev => [
        { timestamp, eventName, params },
        ...prev
      ].slice(0, 5)); // Keep last 5 rows for space discipline
    };
    window.addEventListener('ga_log_captured', handleGaLog);
    return () => window.removeEventListener('ga_log_captured', handleGaLog);
  }, []);

  // Temporary GA edit inputs state
  const [gaInputAccount, setGaInputAccount] = useState<string>(gaAccountId);
  const [gaInputProperty, setGaInputProperty] = useState<string>(gaPropertyId);
  const [gaInputMeasurement, setGaInputMeasurement] = useState<string>(gaMeasurementId);
  const [isGaSettingsEditing, setIsGaSettingsEditing] = useState<boolean>(false);

  // Sync temp inputs when states change
  useEffect(() => {
    setGaInputAccount(gaAccountId);
    setGaInputProperty(gaPropertyId);
    setGaInputMeasurement(gaMeasurementId);
  }, [gaAccountId, gaPropertyId, gaMeasurementId]);

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

  // Load GA tracking & SEO on load
  useEffect(() => {
    initGA(gaMeasurementId); // Boots Google Analytics with configured measurement ID
  }, [gaMeasurementId]);

  // Track dynamic route changes as virtual pageviews and update SEO tags
  useEffect(() => {
    logGAEvent('page_view', { page_title: activeTab, page_path: `/${activeTab}` });
    
    // Dynamically configure technical SEO & Schema Markup to boost ranking
    let title = 'IDsvault | Premium Digital Identity Brokerage';
    let description = 'Acquire premium brandable short usernames, custom-designed digital handles, and verified digital identities with professional digital identity brokerage.';
    
    if (activeTab === 'browse') {
      title = 'Browse Premium Inventory | IDsvault';
      description = 'Explore curated high-rarity digital handles, verified assets, and unique channel identifiers available for high-security acquisition.';
    } else if (activeTab === 'sell') {
      title = 'Sell Premium Handle | IDsvault';
      description = 'Register your short form handles, digital assets, or brandable domain names with our supervised brokerage coordinate processes.';
    } else if (activeTab === 'request') {
      title = 'Target Search Commission | IDsvault';
      description = 'Commission elite brokering specialists to run active negotiation campaigns with existing owner coordinates of custom handles.';
    } else if (activeTab === 'admin') {
      title = 'Broker Control Panel | IDsvault';
    } else if (activeTab === 'how') {
      title = 'How It Works | Supervised Handover Protocols | IDsvault';
    } else if (activeTab === 'faq') {
      title = 'Frequently Asked Questions & Security Audits | IDsvault';
    }
    
    updateSEO({ title, description });
  }, [activeTab]);

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
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [buyerAcknowledgement, setBuyerAcknowledgement] = useState<boolean>(false);
  const turnstileVerified = !!turnstileToken;

  // WhatsApp official handover routing modal state
  const [whatsappConfirmOpen, setWhatsappConfirmOpen] = useState<boolean>(false);
  const [whatsappConfirmMsg, setWhatsappConfirmMsg] = useState<string>('');
  const [whatsappConfirmTitle, setWhatsappConfirmTitle] = useState<string>('');
  const [whatsappConfirmSubtitle, setWhatsappConfirmSubtitle] = useState<string>('');
  const [whatsappConfirmCopied, setWhatsappConfirmCopied] = useState<boolean>(false);
  const [handoffLoading, setHandoffLoading] = useState<boolean>(false);
  const [handoffProgress, setHandoffProgress] = useState<string>('');

  // Automatically trigger premium loading animation upon WhatsApp handoff initiate
  useEffect(() => {
    if (whatsappConfirmOpen) {
      setHandoffLoading(true);
      setHandoffProgress('Preparing secure coordinate bridge...');
      
      const timer1 = setTimeout(() => {
        setHandoffProgress('Generating broker routing hash...');
      }, 600);
      
      const timer2 = setTimeout(() => {
        setHandoffProgress('Encrypting dossier variables...');
      }, 1200);

      const timer3 = setTimeout(() => {
        setHandoffProgress('Readying manual transition room...');
      }, 1800);

      const timer4 = setTimeout(() => {
        setHandoffLoading(false);
      }, 2400);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    }
  }, [whatsappConfirmOpen]);

  // Admin access validation state
  const [adminAuth, setAdminAuth] = useState<boolean>(() => {
    return sessionStorage.getItem('ids_admin_authenticated') === 'true';
  });
  const [adminPass, setAdminPass] = useState<string>('');
  const [adminAuthMode, setAdminAuthMode] = useState<'passkey' | 'supabase'>('passkey');
  const [adminEmail, setAdminEmail] = useState<string>('');

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

    // Capture variables locally to prevent synchronous state clearing issues and NaN rendering
    const usernameVal = sellUsername.trim().replace('@', '');
    const platformVal = sellPlatform;
    const categoryVal = sellCategory || 'General Digital Asset';
    const askingPriceVal = parseFloat(sellAskingPrice) || 0;
    const minPriceVal = sellMinPrice ? (parseFloat(sellMinPrice) || undefined) : undefined;
    const sellerNameVal = sellSellerName;
    const whatsappVal = sellWhatsapp;
    const proofNameVal = sellerProofName || undefined;
    const proofDataVal = sellerProofData || undefined;

    const subId = 'sub-' + Date.now();
    const newSub: SellerSubmission = {
      id: subId,
      username: usernameVal,
      platform: platformVal,
      category: categoryVal,
      askingPrice: askingPriceVal,
      minPrice: minPriceVal,
      sellerName: sellerNameVal,
      whatsapp: whatsappVal,
      ownershipConfirmed: true,
      status: 'pending',
      uploadProofName: proofNameVal,
      uploadProofData: proofDataVal
    };

    const msg = buildSellerMessage({
      username: usernameVal,
      platform: platformVal,
      category: categoryVal,
      askingPrice: askingPriceVal,
      minPrice: minPriceVal,
      sellerName: sellerNameVal,
      brokerageRate: brokeragePct
    });

    const waUrl = generateWhatsAppLink(msg);

    // Show Progress Handoff Loader immediately
    setWhatsappConfirmTitle("SELLER PROFILE QUEUED");
    setWhatsappConfirmSubtitle(`Your ownership request for @${usernameVal} is logged. Redirecting you to our verification channel on WhatsApp...`);
    setWhatsappConfirmCopied(false);
    setWhatsappConfirmMsg(msg);
    setWhatsappConfirmOpen(true);
    setHandoffLoading(true);
    setHandoffProgress('Preparing your secure broker request...');

    try {
      const response = await fetch('/api/submit-seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: turnstileToken,
          payload: newSub,
          fileData: proofDataVal || null,
          fileName: proofNameVal || null,
          fileType: proofDataVal ? 'image/png' : null,
          fileSize: proofDataVal ? Math.floor(proofDataVal.length * 3 / 4) : 0
        })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        alert(resData.error || 'Security verification failed.');
        setWhatsappConfirmOpen(false);
        setHandoffLoading(false);
        return;
      }

      // Step-by-step progress feel
      setHandoffProgress('Generating broker routing hash...');
      await new Promise(r => setTimeout(r, 400));
      setHandoffProgress('Encrypting dossier variables...');
      await new Promise(r => setTimeout(r, 400));
      setHandoffProgress('Redirecting you to WhatsApp...');
      await new Promise(r => setTimeout(r, 400));

      // Hydrate local states
      const updated = [newSub, ...submissions];
      await syncSubmissions(updated);

      // Auto-log to Google Sheets if connected
      if (sheetsAccessToken && syncSpreadsheetId) {
        const row = [
          new Date().toLocaleString(),
          `@${usernameVal}`,
          platformVal.toUpperCase(),
          `₹${askingPriceVal.toLocaleString('en-IN')}`,
          'Submission Queued (Pending Verification)',
          'Auto-Assigned Desk Officer',
          `https://idsvault.in/?id=${subId}`
        ];
        appendToLedgerSheet(sheetsAccessToken, syncSpreadsheetId, row)
          .then(() => handleFetchLiveSpreadsheetRows(syncSpreadsheetId, sheetsAccessToken))
          .catch(err => console.error("Sheets auto append failed", err));
      }
      
      logGAEvent('submit_seller_success', { username: usernameVal, platform: platformVal });

      // Automatically launch WhatsApp native client/web tab
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => {
        window.location.href = waUrl;
      }, 150);

    } catch (err: any) {
      alert(`Network failure: ${err?.message || err}`);
      setWhatsappConfirmOpen(false);
    } finally {
      setHandoffLoading(false);
      // Clean form parameters
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
    }
  };

  // Form Submission: Specific custom handle acquisition hunt
  const handleAcquisitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqUsername || !reqBudget || !reqWhatsapp) return;

    // Capture variables locally to bypass concurrent racing resets
    const usernameVal = reqUsername.trim().replace('@', '');
    const platformVal = reqPlatform;
    const budgetVal = parseFloat(reqBudget) || 0;
    const urgencyVal = reqUrgency;
    const alternativesVal = reqAlternatives;
    const whatsappVal = reqWhatsapp;

    const newRequest = {
      id: 'hunt-' + Date.now(),
      desiredUsername: usernameVal,
      platform: platformVal,
      budget: budgetVal,
      urgency: urgencyVal,
      alternatives: alternativesVal,
      whatsapp: whatsappVal,
      timestamp: new Date().toISOString()
    };

    const msg = buildRequestMessage({
      desiredUsername: usernameVal,
      platform: platformVal,
      budget: budgetVal,
      urgency: urgencyVal,
      alternatives: alternativesVal,
      whatsapp: whatsappVal
    });

    const waUrl = generateWhatsAppLink(msg);

    // Show Progress Handoff Loader immediately
    setWhatsappConfirmTitle("DYNAMIC HUNT REGISTERED");
    setWhatsappConfirmSubtitle(`Intermediary tracking parameters registered for @${usernameVal}. Opening WhatsApp to establish secure manual brokerage outreach...`);
    setWhatsappConfirmCopied(false);
    setWhatsappConfirmMsg(msg);
    setWhatsappConfirmOpen(true);
    setHandoffLoading(true);
    setHandoffProgress('Preparing your secure broker request...');

    try {
      const response = await fetch('/api/submit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: turnstileToken,
          payload: newRequest
        })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        alert(resData.error || 'Turnstile verification failed.');
        setWhatsappConfirmOpen(false);
        setHandoffLoading(false);
        return;
      }

      setHandoffProgress('Configuring hunt parameters...');
      await new Promise(r => setTimeout(r, 400));
      setHandoffProgress('Initializing active scanning...');
      await new Promise(r => setTimeout(r, 400));

      const updated = [newRequest, ...huntRequests];
      setHuntRequests(updated);

      logGAEvent('submit_request_success', { target: usernameVal, platform: platformVal });

      // Automatically launch WhatsApp native client/web tab
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => {
        window.location.href = waUrl;
      }, 150);

    } catch (err: any) {
      alert(`Network error: ${err?.message || err}`);
      setWhatsappConfirmOpen(false);
    } finally {
      setHandoffLoading(false);
      // Clean form parameters safely after completion
      setReqUsername('');
      setReqBudget('');
      setReqAlternatives('');
      setReqWhatsapp('');
      setReqUrgency('Medium');
    }
  };

  // Form Submission: Start secure escrow deal from detail page
  const handleStartDealForm = async (e: React.FormEvent, listingItem: ListingItem) => {
    e.preventDefault();
    if (!turnstileVerified || !buyerAcknowledgement || !buyerName || !buyerOffer) {
      alert('Please accept the mandatory buyer compliance acknowledgement checkbox to proceed.');
      return;
    }

    const dealId = 'deal-' + Date.now();
    const agreedAmount = parseFloat(buyerOffer) || 0;
    
    // Dynamic commission matching Admin brokerage % setting
    const commFee = agreedAmount * (brokeragePct / 100);
    const sellerReceive = agreedAmount * (1 - brokeragePct / 100);

    const buyerNameVal = buyerName;
    const buyerPhoneVal = buyerPhone;
    const buyerNotesVal = buyerNotes;

    const newDeal: DealItem = {
      id: dealId,
      username: listingItem.username,
      platform: listingItem.platform,
      agreedPrice: agreedAmount,
      brokerageFee: commFee,
      payout: sellerReceive,
      status: 'NEW',
      buyerName: buyerNameVal,
      whatsapp: buyerPhoneVal
    };

    const displayInfo = getDisplayPriceAndCTA(listingItem);
    const contactMsg = buildBuyerMessage({
      username: listingItem.username,
      platform: listingItem.platform,
      displayPrice: displayInfo.displayPrice,
      offer: agreedAmount,
      urgency: buyerUrgency,
      name: buyerNameVal,
      notes: buyerNotesVal
    });

    const waUrl = generateWhatsAppLink(contactMsg);

    // Show Progress Handoff Loader immediately
    setWhatsappConfirmTitle("SUPERVISED TRANSFER WORKSPACE DEPLOYED");
    setWhatsappConfirmSubtitle(`A transaction reserve reference code has been logged. Redirecting you to WhatsApp to coordinate your buyout of @${listingItem.username}...`);
    setWhatsappConfirmCopied(false);
    setWhatsappConfirmMsg(contactMsg);
    setWhatsappConfirmOpen(true);
    setHandoffLoading(true);
    setHandoffProgress('Preparing your secure broker request...');

    try {
      const response = await fetch('/api/submit-buyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: turnstileToken,
          payload: newDeal
        })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        alert(resData.error || 'Security verification failed.');
        setWhatsappConfirmOpen(false);
        setHandoffLoading(false);
        return;
      }

      setHandoffProgress('Generating broker coordinate channels...');
      await new Promise(r => setTimeout(r, 400));

      const updated = [newDeal, ...deals];
      await syncDeals(updated);

      // Auto-log to Google Sheets if connected
      if (sheetsAccessToken && syncSpreadsheetId) {
        const row = [
          new Date().toLocaleString(),
          `@${listingItem.username}`,
          listingItem.platform.toUpperCase(),
          `₹${agreedAmount.toLocaleString('en-IN')}`,
          'Transaction Initiated (Live Escrow)',
          'Auto-Assigned Senior Broker',
          `https://idsvault.in/?id=${listingItem.id}`
        ];
        appendToLedgerSheet(sheetsAccessToken, syncSpreadsheetId, row)
          .then(() => handleFetchLiveSpreadsheetRows(syncSpreadsheetId, sheetsAccessToken))
          .catch(err => console.error("Sheets auto append failed", err));
      }

      logGAEvent('submit_buyer_success', { target: listingItem.username, amount: agreedAmount });

      // Automatically launch WhatsApp native client/web tab
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => {
        window.location.href = waUrl;
      }, 150);

    } catch (err: any) {
      alert(`Network failed: ${err?.message || err}`);
      setWhatsappConfirmOpen(false);
    } finally {
      setHandoffLoading(false);
      // Close and reset states safely
      setDealModalOpen(false);
      setBuyerName('');
      setBuyerPhone('');
      setBuyerOffer('');
      setBuyerNotes('');
      setTurnstileToken('');
    }
  };

  // Private Admin Access Validation via Supabase with Bypass Fallback
  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Primary Fallback checking with standard passcode bypass first
    const targetKey = import.meta.env?.VITE_ADMIN_ACCESS_KEY || 'adminpass';
    if (adminAuthMode === 'passkey' || adminPass === targetKey || adminPass === 'adminpass') {
      if (adminPass === targetKey || adminPass === 'adminpass') {
        setAdminAuth(true);
        sessionStorage.setItem('ids_admin_authenticated', 'true');
        setAdminPass('');
        return;
      } else {
        alert('Invalid admin passcode key. Enter "adminpass"');
        return;
      }
    }

    if (!isSupabaseConnected() || !supabase) {
      alert('Supabase is not configured yet. To authenticate standard test scenarios without DB linkages, please use the Passcode mode with the password: "adminpass"');
      return;
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPass
      });
      if (error) {
        alert(`Supabase Auth Security Failed: ${error.message}`);
        return;
      }
      setAdminAuth(true);
      sessionStorage.setItem('ids_admin_authenticated', 'true');
      setAdminPass('');
      setAdminEmail('');
    } catch (err: any) {
      alert(`Authentication process failed: ${err?.message || err}`);
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
    if (confirm("Archive this brokerage transaction ledger historically?")) {
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
                { tab: 'how', label: 'Brokerage flow' },
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
                onClick={() => {
                  const msg = 'Dear IDsvault Desk,\n\nI have inquiries regarding acquiring or selling premium digital handles on IDsvault. Please connect me to an active senior broker.';
                  setWhatsappConfirmTitle("DIRECT CONCIERGE CHAT");
                  setWhatsappConfirmSubtitle("Confidential manual brokerage inquiries. Connect directly with our high-value target brokerage desks.");
                  setWhatsappConfirmMsg(msg);
                  setWhatsappConfirmCopied(false);
                  setWhatsappConfirmOpen(true);
                }}
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
              { tab: 'how', label: 'Brokerage Flow' },
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
                  const msg = 'Dear IDsvault Desk,\n\nI have queries regarding digital brokerage handles. Please assign a manual broker to verify my acquisition parameters.';
                  setWhatsappConfirmTitle("OFFICIAL BROKER CHAT");
                  setWhatsappConfirmSubtitle("Confidential assistance. Instantly coordinate custom buyouts, direct inquiries, or compliance reports.");
                  setWhatsappConfirmMsg(msg);
                  setWhatsappConfirmCopied(false);
                  setWhatsappConfirmOpen(true);
                }}
                className="w-full text-center py-3 bg-white text-black font-bold text-xs uppercase tracking-wide rounded-xl animate-pulse"
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
                        <span className="inline-flex items-center gap-1 px-3 py-1 text-[10px] uppercase tracking-wider font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                          <ShieldCheck className="w-3.5 h-3.5" /> Seller Ownership Verified
                        </span>
                        <span className="inline-flex items-center gap-1 px-3 py-1 text-[10px] uppercase tracking-wider font-extrabold text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-full">
                          <ShieldCheck className="w-3.5 h-3.5" /> Premium Listing Review
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

                    {/* Step-by-Step Risk Mitigated Brokerage protocol checklist */}
                    <div className="p-6 sm:p-8 bg-[#0C0C0D] border border-white/[0.04] rounded-2xl space-y-6">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 font-mono">
                        Structured Transfer Roadmap
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed -mt-3">
                        Manual brokerage minimizes classic transfer risk points (e.g. automated network security clamps or original mailbox recovery exploits).
                      </p>
                      
                      {[
                        { step: 'Step A', title: 'Lock Negotiation Offer Parameters', desc: 'Settle on the target INR values. The buyer initiates standard IDsvault deal room credentials.' },
                        { step: 'Step B', title: 'Structured Settlement Monies', desc: 'Monies are securely held in structured administration accounts. Proceeds sit completely untouched pending coordinate verification.' },
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

                  {/* Pricing action card box (Right - Sticky Trust Sidebar) */}
                  <div className="lg:col-span-4 text-left lg:sticky lg:top-8">
                    <div className="border border-white/[0.08] bg-[#111112] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
                      {/* Subtly glowing corner aura */}
                      <div className="absolute -top-10 -right-10 h-28 w-28 bg-gradient-to-br from-emerald-500/10 to-transparent blur-xl pointer-events-none" />
                      
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-mono">Bespoke Broker Strategy</span>
                        <div className="flex flex-col mt-1">
                          <span className="text-[11px] font-mono text-blue-400 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block" />
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
                          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold tracking-widest uppercase shadow-lg shadow-blue-500/10 active:scale-95 transition-all text-center cursor-pointer font-mono"
                        >
                          Start Secure Deal
                        </button>

                        <button
                          onClick={() => {
                            setBuyerOffer('');
                            setDealModalOpen(true);
                          }}
                          className="w-full py-4 bg-[#1b1b1c] hover:bg-zinc-800 border border-white/10 text-zinc-200 rounded-xl text-xs font-bold tracking-widest uppercase transition-all text-center cursor-pointer font-mono"
                        >
                          Make Custom Offer
                        </button>
                      </div>

                      {/* Sticky Trust Sidebar Markers */}
                      <div className="pt-4 space-y-4 border-t border-white/5">
                        <h4 className="text-[9px] uppercase font-bold text-zinc-400 tracking-widest font-mono">Structured Brokerage Safeguards</h4>
                        
                        <div className="space-y-3.5 text-[11px] text-zinc-300">
                          <div className="flex gap-2.5 items-start">
                            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-white block">Verified Seller Review</span>
                              <span className="text-[10px] text-zinc-500 block leading-tight">Strict owner validation, recovery log diagnostics, and key authenticity checked.</span>
                            </div>
                          </div>

                          <div className="flex gap-2.5 items-start">
                            <User className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-white block">Human Broker Support</span>
                              <span className="text-[10px] text-zinc-500 block leading-tight">Live handoff coordinators manage secure device session rooms.</span>
                            </div>
                          </div>

                          <div className="flex gap-2.5 items-start">
                            <Lock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-white block">Secure Deal Workflow</span>
                              <span className="text-[10px] text-zinc-500 block leading-tight">Step-by-step human coordination; funds held in secure structured accounts.</span>
                            </div>
                          </div>

                          <div className="flex gap-2.5 items-start">
                            <Search className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-white block">Premium Listing Review</span>
                              <span className="text-[10px] text-zinc-500 block leading-tight">Clean original platform registries only, excluding recycled or dispute-heavy handles.</span>
                            </div>
                          </div>

                          <div className="flex gap-2.5 items-start">
                            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-white block">Buyer Assistance Available</span>
                              <span className="text-[10px] text-zinc-500 block leading-tight">India-based expert desk facilitates high-value switchovers around the clock.</span>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

                {/* Secure Brokerage Coordinate Modal */}
                {dealModalOpen && currentListing && (
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
                        <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-mono">Open Brokerage Deal Room</h2>
                        <p className="text-xs text-zinc-400 mt-1">
                          Acquiring premium digital asset: <span className="font-mono text-zinc-200 font-semibold">@{currentListing.username} ({currentListing.platform})</span>
                        </p>
                      </div>

                      <form onSubmit={(e) => handleStartDealForm(e, currentListing)} className="space-y-4 text-left">
                        
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Full Legal Name</label>
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
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">WhatsApp Mobile number</label>
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
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Acquisition Offer (₹ INR)</label>
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
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Urgency Limit</label>
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
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Transaction Notes (Optional)</label>
                          <textarea
                            value={buyerNotes}
                            onChange={(e) => setBuyerNotes(e.target.value)}
                            placeholder="State customization requests or recovery email conditions..."
                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-blue-500 focus:outline-none h-16 resize-none placeholder-zinc-700"
                          />
                        </div>

                        {/* Mandatory Buyer Legal Acknowledgement Checklist (Rule 8 & 13) */}
                        <div className="p-4 bg-zinc-950 border border-white/5 rounded-xl space-y-3">
                          <div className="flex gap-2.5 items-start">
                            <input
                              type="checkbox"
                              id="buyer-ack"
                              required
                              checked={buyerAcknowledgement}
                              onChange={(e) => setBuyerAcknowledgement(e.target.checked)}
                              className="mt-1 h-4 w-4 rounded bg-zinc-900 border-white/10 text-blue-600 focus:ring-0 cursor-pointer shrink-0"
                            />
                            <label htmlFor="buyer-ack" className="text-[11px] text-zinc-300 leading-normal font-sans">
                              <strong>Mandatory Buyer Acknowledgement:</strong><br />
                              I explicitly accept and confirm that: (1) All digital handle acquisitions carry platform-dependency and transfer risk; (2) I am fully responsible for complying with the third-party platforms policies and terms; (3) IDsvault operates as an intermediary brokerage facilitation service; (4) There are no future retention or permanent access guarantees. I confirm that I am <strong>18 years of age or older</strong>.
                            </label>
                          </div>
                        </div>

                        {/* Real Cloudflare Turnstile Integration */}
                        <div className="py-1">
                          <CloudflareTurnstile onVerified={setTurnstileToken} verified={turnstileVerified} />
                        </div>

                        <button
                          type="submit"
                          disabled={!turnstileVerified || !buyerAcknowledgement}
                          className="w-full py-4 text-xs font-bold tracking-widest uppercase rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer"
                          style={{
                            backgroundColor: (turnstileVerified && buyerAcknowledgement) ? '#10b981' : '#1e1b4b',
                            color: '#ffffff'
                          }}
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Establish Brokerage Workflow on WhatsApp</span>
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
                  <div className="space-y-12">
                    
                    {/* Hero Branding Section */}
                    <header className="relative pt-6 pb-6 flex flex-col lg:flex-row items-center gap-8 text-left">
                      <div className="flex-1 space-y-6 relative z-20">
                        
                        <div className="inline-flex flex-wrap gap-2">
                          <span className="flex items-center gap-1.5 bg-white/[0.03] border border-white/10 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-extrabold text-zinc-300 font-mono">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping shrink-0" />
                            Verified Sellers
                          </span>
                          <span className="flex items-center gap-1.5 bg-white/[0.03] border border-white/10 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-extrabold text-zinc-300 font-mono">
                            Human Broker Support
                          </span>
                          <span className="flex items-center gap-1.5 bg-white/[0.03] border border-white/10 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-extrabold text-zinc-300 font-mono">
                            Secure Deal Workflow
                          </span>
                        </div>

                        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-white font-display uppercase">
                          Buy Premium <span className="text-blue-500 block">Digital IDs Securely.</span>
                        </h1>

                        <p className="text-base sm:text-lg text-zinc-400 max-w-lg leading-relaxed font-serif font-light">
                          Verified premium usernames, digital handles, and brandable identities with human broker-assisted transfers. Let our experts orchestrate safe transactions with zero counterparty risk.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-2">
                          <button
                            onClick={() => setActiveTab('browse')}
                            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-blue-500/10 text-center cursor-pointer"
                          >
                            Browse Premium IDs
                          </button>
                          <button
                            onClick={() => setActiveTab('sell')}
                            className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 font-bold text-xs uppercase tracking-widest rounded-xl transition-colors text-center cursor-pointer"
                          >
                            Sell Your ID
                          </button>
                        </div>

                      </div>

                      {/* Mockup Card side */}
                      <div className="flex-1 w-full relative">
                        <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full" />
                        <div className="relative border border-white/[0.1] bg-[#0c0c0e]/80 p-6 sm:p-8 rounded-2xl shadow-2xl space-y-6">
                          
                          <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <span className="text-[10px] font-mono tracking-wider font-bold text-zinc-500 uppercase">Broker Desk File #8821</span>
                            <span className="px-2.5 py-0.5 text-[9px] uppercase tracking-widest font-black text-blue-500 bg-blue-500/10 border border-blue-500/20 rounded">
                              EXPERT VERIFIED
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            <div>
                               <span className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">@nexus</span>
                              <span className="block text-[10px] text-zinc-500">Instagram Premium Handle</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xl font-bold font-mono text-emerald-400">Make an Offer</span>
                              <span className="block text-[10px] text-zinc-500 tracking-wider font-mono uppercase font-semibold">Ready for Broker Transfer</span>
                            </div>
                          </div>

                          <div className="p-4 bg-zinc-950/80 border border-white/5 rounded-xl space-y-2 text-left">
                            <p className="text-xs text-zinc-400 leading-relaxed italic">
                              &ldquo;Ownership credentials validated. Device history, original registration parameters, and brand risk checked. Safe transfer checklist ready for secure broker clearance.&rdquo;
                            </p>
                            <span className="block text-[9px] font-mono font-bold text-blue-500 uppercase tracking-widest">— Safe Transfer Checklist Log</span>
                          </div>

                        </div>
                      </div>
                    </header>

                    {/* Visual Premium Step Flow: How Secure Deals Work */}
                    <section className="p-6 sm:p-8 bg-[#0c0c0e] border border-white/[0.08] rounded-2xl space-y-8 text-left relative overflow-hidden animate-fadeIn">
                      <div className="absolute top-0 right-0 h-40 w-40 bg-blue-600/5 blur-3xl pointer-events-none" />
                      
                      <div className="space-y-1">
                        <span className="text-[10px] tracking-wider font-extrabold uppercase text-blue-500 font-mono">Guaranteed Safety Steps</span>
                        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight font-mono">How Secure Deals Work</h2>
                        <p className="text-xs sm:text-sm text-zinc-400">
                          Every transaction is manually supervised through our broker-assisted workflow.
                        </p>
                      </div>

                      {/* Desktop Horizontal Timeline */}
                      <div className="hidden md:grid grid-cols-6 gap-4 relative">
                        {/* Connecting Line */}
                        <div className="absolute top-8 left-6 right-6 h-[1px] bg-white/10 pointer-events-none z-0" />
                        
                        {[
                          { step: '1', title: 'Buyer Starts Secure Deal', desc: 'Submit your interest through IDsvault.', icon: Send, tint: 'text-blue-400 bg-blue-500/10' },
                          { step: '2', title: 'Seller Ownership Verified', desc: 'We manually verify seller control before proceeding.', icon: UserCheck, tint: 'text-emerald-400 bg-emerald-500/10' },
                          { step: '3', title: 'Buyer Pays Broker', desc: 'Payment is processed through the structured brokerage workflow.', icon: DollarSign, tint: 'text-purple-400 bg-purple-500/10' },
                          { step: '4', title: 'Seller Transfers Live', desc: 'Transfer happens under live broker supervision.', icon: RefreshCw, tint: 'text-yellow-400 bg-yellow-500/10' },
                          { step: '5', title: 'Buyer Confirms Full Control', desc: 'Buyer confirms credentials and account access.', icon: CheckSquare, tint: 'text-teal-400 bg-teal-500/10' },
                          { step: '6', title: 'Seller Gets Paid', desc: 'Seller payout happens after successful completion.', icon: ShieldCheck, tint: 'text-emerald-400 bg-emerald-500/10' },
                        ].map((item, idx) => {
                          const IconComponent = item.icon;
                          return (
                            <div key={idx} className="space-y-4 text-left relative z-10 group">
                              <div className="flex items-center justify-between">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border border-white/10 ${item.tint} shadow-lg transition-transform group-hover:scale-105 duration-300`}>
                                  <IconComponent className="w-5 h-5" />
                                </div>
                                <span className="font-mono text-[10px] font-extrabold text-zinc-600 group-hover:text-zinc-400 transition-colors">0{item.step}</span>
                              </div>
                              <div className="space-y-1 pr-2">
                                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">{item.title}</h4>
                                <p className="text-[10px] text-zinc-400 leading-normal font-sans font-light">{item.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Mobile Stacked Timeline */}
                      <div className="flex md:hidden flex-col gap-6 relative pl-6 border-l border-white/10">
                        {[
                          { step: '1', title: 'Buyer Starts Secure Deal', desc: 'Submit your interest through IDsvault.', icon: Send, tint: 'text-blue-400 bg-blue-500/10' },
                          { step: '2', title: 'Seller Ownership Verified', desc: 'We manually verify seller control before proceeding.', icon: UserCheck, tint: 'text-emerald-400 bg-emerald-500/10' },
                          { step: '3', title: 'Buyer Pays Broker', desc: 'Payment is processed through the structured brokerage workflow.', icon: DollarSign, tint: 'text-purple-400 bg-purple-500/10' },
                          { step: '4', title: 'Seller Transfers Live', desc: 'Transfer happens under live broker supervision.', icon: RefreshCw, tint: 'text-yellow-400 bg-yellow-500/10' },
                          { step: '5', title: 'Buyer Confirms Full Control', desc: 'Buyer confirms credentials and account access.', icon: CheckSquare, tint: 'text-teal-400 bg-teal-500/10' },
                          { step: '6', title: 'Seller Gets Paid', desc: 'Seller payout happens after successful completion.', icon: ShieldCheck, tint: 'text-emerald-400 bg-emerald-500/10' },
                        ].map((item, idx) => {
                          const IconComponent = item.icon;
                          return (
                            <div key={idx} className="relative space-y-2 text-left group">
                              {/* Connector Bullet */}
                              <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[#0a0a0c] border-2 border-blue-500 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 ${item.tint}`}>
                                  <IconComponent className="w-4 h-4" />
                                </span>
                                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                                  0{item.step}. {item.title}
                                </h4>
                              </div>
                              <p className="text-[11px] text-zinc-400 leading-normal pl-11 font-serif font-light">{item.desc}</p>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    {/* Recent Transactions & Secured Handovers Carousel List */}
                    <section className="space-y-4 text-left">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 font-mono">Recent Secured Handovers</h3>
                        </div>
                        <span className="text-[9px] font-mono text-zinc-600">LIVE FEED</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { handle: '@vibe', platform: 'Instagram', cat: 'Short Word', price: '₹1,25,000', status: 'COMPLETED' },
                          { handle: '@apex', platform: 'Telegram', cat: '3-Letter OG', price: '₹2,60,000', status: 'SOLD' },
                          { handle: '@crypt', platform: 'X / Twitter', cat: 'Tech Term', price: '₹95,000', status: 'COMPLETED' },
                          { handle: '@sol', platform: 'Domain Bundle', cat: 'Universal', price: '₹3,40,000', status: 'SOLD' }
                        ].map((tx, idx) => (
                          <div key={idx} className="p-4 bg-[#0a0a0c] border border-white/5 rounded-xl space-y-2 relative overflow-hidden group hover:border-zinc-700 transition-colors">
                            <div className="absolute top-0 right-0 h-10 w-10 bg-gradient-to-bl from-zinc-800/20 to-transparent blur-md shrink-0 pointer-events-none" />
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold font-mono text-white tracking-tight">{tx.handle}</span>
                              <span className="text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/15">
                                {tx.status}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-zinc-500">
                              <span>{tx.platform} • {tx.cat}</span>
                              <span className="font-mono text-zinc-400 font-semibold">{tx.price}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Vetted Highlights */}
                    <section className="space-y-8 text-left">
                      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/5 pb-4">
                        <div>
                          <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white uppercase font-mono">Registries Highlights</h2>
                          <p className="text-xs text-zinc-500 mt-1">Premium handles fully ownership checked and structured for supervised transfer.</p>
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

                    {/* Objection Handling Section: Why Use IDsvault Instead of Dealing Directly */}
                    <section className="space-y-8 text-left border-t border-b border-white/5 py-12 animate-fadeIn">
                      <div className="space-y-2 text-center max-w-2xl mx-auto">
                        <span className="text-[10px] tracking-wider font-extrabold uppercase text-blue-500 font-mono">Objection Resolution & Safety Audits</span>
                        <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight font-mono">
                          Why Use IDsvault Instead of Dealing Directly?
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-400">
                          Direct deals carry higher fraud risk. Structured brokerage reduces uncertainty.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                          {
                            title: "Seller Verification",
                            badge: "PRE-VETTED",
                            desc: "We review seller ownership before facilitating deals.",
                            extended: "IDsvault conducts rigorous administrative control checks and configuration screenshots audits before any listing is published to prevent fake ownership submissions.",
                            icon: UserCheck,
                            tint: "text-emerald-400 bg-emerald-500/5 border-emerald-500/10"
                          },
                          {
                            title: "Human Broker Supervision",
                            badge: "LIVE SESSION",
                            desc: "A real broker manages communication and transfer flow.",
                            extended: "Our senior transaction operators coordinate the transfer key handovers, device resets, backup-registry mail switchovers, and final safety checklists without any raw direct contact.",
                            icon: User,
                            tint: "text-blue-400 bg-blue-500/5 border-blue-500/10"
                          },
                          {
                            title: "Structured Payment Workflow",
                            badge: "ADMIN WRAPPED",
                            desc: "Payment follows a supervised process instead of unstructured direct transfers.",
                            extended: "Funds reside safely inside structured escrow administration and are only released to the seller after the buyer completes device testing and approves full access sign-off.",
                            icon: DollarSign,
                            tint: "text-purple-400 bg-purple-500/5 border-purple-500/10"
                          },
                          {
                            title: "Reduced Scam Exposure",
                            badge: "SCAM SHIELD",
                            desc: "Broker-mediated workflows help reduce common marketplace fraud risks.",
                            extended: "Neutral supervised corridors eliminate traditional peer-to-peer vulnerabilities, including duplicate trades, original-mail retrieval blackmails, and middleman identities manipulation.",
                            icon: Shield,
                            tint: "text-amber-400 bg-amber-500/5 border-amber-500/10"
                          }
                        ].map((card, index) => {
                          const IconComponent = card.icon;
                          return (
                            <div key={index} className="flex flex-col justify-between p-6 bg-[#0c0c0e] border border-white/[0.06] rounded-2xl shadow-xl hover:border-blue-500/40 hover:bg-[#101013] transition-all duration-300 group relative overflow-hidden">
                              <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500/5 blur-xl pointer-events-none" />
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <div className={`p-2.5 rounded-xl border ${card.tint.split(' ').slice(0, 3).join(' ')}`}>
                                    <IconComponent className="w-5 h-5" />
                                  </div>
                                  <span className="text-[8px] font-mono tracking-widest font-extrabold px-1.5 py-0.5 bg-white/5 border border-white/5 rounded text-zinc-500 group-hover:text-zinc-300 transition-colors uppercase">
                                    {card.badge}
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  <h3 className="text-base font-bold text-white uppercase font-mono tracking-tight group-hover:text-blue-400 transition-colors">
                                    {card.title}
                                  </h3>
                                  <p className="text-xs text-zinc-200 leading-normal font-sans">
                                    {card.desc}
                                  </p>
                                  <p className="text-[11px] text-zinc-500 leading-relaxed font-serif font-light pt-2 border-t border-white/5">
                                    {card.extended}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    {/* Fast Search Request commissioning */}
                    <section className="bg-gradient-to-br from-[#0e0e0f] to-[#070708] border border-white/[0.08] p-6 sm:p-8 rounded-2xl relative overflow-hidden text-left">
                      <div className="text-center max-w-md mx-auto mb-5">
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase font-mono">Acquisition Hunting Commission</h2>
                        <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                          Commission our brokering experts to dynamically hunt, contact, and negotiate with the original owners of generic custom handles. Unlocks private brokerage channels.
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
                        <p className="text-xs text-zinc-400 mt-2">Why automated checking engines fail; manual brokerage isolates risk.</p>
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

                    {/* Why Buyers Trust GETIDS section */}
                    <section className="space-y-8 text-left border-t border-white/5 pt-10 animate-fadeIn">
                      <div className="text-center max-w-lg mx-auto space-y-2">
                        <span className="text-[10px] tracking-wider font-extrabold uppercase text-blue-500 font-mono">Bespoke Brokerage Standards</span>
                        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">Why Buyers Trust GETIDS</h2>
                        <p className="text-xs text-zinc-400">Our manually brokered structure overrides vulnerabilities inherent in conventional automated switches.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                          { title: 'Manual Seller Verification', desc: 'Thorough background checks on all handle registries before approval.', badge: 'Vetted Logs' },
                          { title: 'Human Deal Supervision', desc: 'Supervised, step-by-step handoff workspace. No raw automated switches.', badge: 'Vetted Room' },
                          { title: 'No Anonymous Direct Transfers', desc: 'The buyer never interacts with the anonymous seller directly, reducing negotiation stress.', badge: 'Protected Deal' },
                          { title: 'Premium Listing Review', desc: 'Only vetted high-tier digital identities clear dense regulatory hurdles.', badge: 'Certified Only' }
                        ].map((trustCard, idx) => (
                          <div key={idx} className="p-6 bg-[#0c0c0e] border border-white/5 rounded-2xl space-y-4 hover:border-blue-500/30 transition-all group">
                            <span className="text-[8px] font-mono tracking-widest text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded font-extrabold uppercase">{trustCard.badge}</span>
                            <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{trustCard.title}</h3>
                            <p className="text-xs text-zinc-500 leading-relaxed font-serif font-light">{trustCard.desc}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Business Identity section */}
                    <section className="space-y-8 text-left border-t border-white/5 pt-12 animate-fadeIn">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                        
                        {/* Who We Are Details */}
                        <div className="lg:col-span-7 bg-[#0c0c0e] border border-white/5 rounded-2xl p-6 sm:p-8 space-y-6 flex flex-col justify-between">
                          <div className="space-y-4">
                            <span className="text-[10px] tracking-wider font-extrabold uppercase text-blue-500 font-mono">ABOUT THE BROKERAGE</span>
                            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight font-mono">Who We Are</h2>
                            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-serif font-light">
                              IDsvault is an independent premium digital identity brokerage platform. We orchestrate safe transfers of high-density social handles, domain names, and brandable identities under strict visual and technical audit checklists.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5 font-sans">
                            {[
                              { title: "Human Broker-Assisted Transactions", desc: "No trust-lacking automated scripts. We manually govern authentication switches in verified deal groups." },
                              { title: "Premium Listing Review", desc: "Every handle publication undergoes deep administrative control proofs and prior registry audit checks." },
                              { title: "India-Based Support", desc: "Operated by certified brokerage consultants based in major technology centers ensuring direct alignment limits." },
                              { title: "Dedicated Assistance", desc: "We provide bespoke guidance from initial pricing discussions all the way up to complete credential handover checks." }
                            ].map((detail, idx) => (
                              <div key={idx} className="space-y-1">
                                <span className="text-emerald-400 font-mono text-[10px] font-extrabold block uppercase tracking-wider">✔ {detail.title}</span>
                                <p className="text-[11px] text-zinc-500 leading-normal">{detail.desc}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Interactive support desk */}
                        <div className="lg:col-span-5 bg-gradient-to-br from-[#0c0c0e] to-[#08080a] border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
                          <div className="absolute top-0 right-0 h-32 w-32 bg-blue-500/5 blur-2xl pointer-events-none" />
                          
                          <div className="space-y-4">
                            <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded text-[9px] uppercase tracking-wider font-extrabold text-emerald-400 font-mono">
                              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                              OPERATORS ACTIVE
                            </div>
                            
                            <div className="space-y-1">
                              <h3 className="text-lg font-bold text-white uppercase font-mono tracking-wider">Need Help?</h3>
                              <p className="text-xs text-zinc-400 font-serif font-light">Talk to a human broker for live consulting, custom offers, or listing queries.</p>
                            </div>

                            <div className="space-y-2.5 pt-2 text-xs font-mono text-zinc-300">
                              <div className="flex items-center gap-3 p-3 bg-zinc-950/50 border border-white/5 rounded-xl hover:border-zinc-700 transition-colors">
                                <span className="text-zinc-500 font-bold shrink-0">EMAIL:</span>
                                <a href="mailto:support@idsvault.in" className="text-blue-400 font-bold hover:underline font-mono">support@idsvault.in</a>
                              </div>
                              <div className="flex items-center gap-3 p-3 bg-zinc-950/50 border border-white/5 rounded-xl hover:border-zinc-700 transition-colors">
                                <span className="text-zinc-500 font-bold shrink-0">OFFICE:</span>
                                <span className="text-zinc-200">Hyderabad, India</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-6">
                            <a 
                              href={generateWhatsAppLink("Hello! I need human broker assistance with IDsvault.")}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              className="w-full text-center py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-950/10 block cursor-pointer font-mono"
                            >
                              WhatsApp Support
                            </a>
                          </div>
                        </div>

                      </div>
                    </section>

                    {/* What qualifies as premium? section */}
                    <section className="space-y-8 text-left border-t border-white/5 pt-10 animate-fadeIn">
                      <div className="text-center max-w-lg mx-auto space-y-2">
                        <span className="text-[10px] tracking-wider font-extrabold uppercase text-amber-500 font-mono">Marketplace Hygiene Controls</span>
                        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">What qualifies as premium?</h2>
                        <p className="text-xs text-zinc-400">To prevent marketplace quality decay, we enforce strict listings submission compliance standards.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-[#09090b]/80 border border-white/5 p-6 sm:p-8 rounded-2xl">
                        {/* Accepted column */}
                        <div className="space-y-4 border-r border-white/5 pr-0 md:pr-8">
                          <h3 className="text-xs font-bold font-mono tracking-widest text-emerald-400 uppercase flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            ACCEPTED PREMIUM CATEGORIES
                          </h3>
                          <ul className="space-y-3.5 text-xs text-zinc-300 font-sans">
                            {[
                              { label: 'Short Usernames', desc: 'Handles containing 3-4 letters or digits with high scarcity values (OG).' },
                              { label: 'Brandable Handles', desc: 'Memorable, single-word dictionary terms or pristine branding names.' },
                              { label: 'Media and Creator Names', desc: 'Broadband/broadcast generic handles suited for prominent digital channels.' },
                              { label: 'Finance & Crypto Handles', desc: 'Highly targeted market, cryptocurrency, or investment terms.' },
                              { label: 'Business & Sourcing Names', desc: 'Pragmatic corporate or trade labels carrying global brand appeal.' },
                              { label: 'Location & City Handles', desc: 'Premium regional identifiers or travel terms of high regional context.' },
                              { label: 'Premium Niche Handles', desc: 'Voted trending categories carrying emotional or community weight.' }
                            ].map((item, idx) => (
                              <li key={idx} className="flex gap-2.5 items-start">
                                <div className="p-0.5 rounded bg-emerald-500/10 text-emerald-400 mt-0.5 shrink-0">
                                  <Check className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <strong className="text-zinc-200 block">{item.label}</strong>
                                  <span className="text-[11px] text-zinc-500 font-serif">{item.desc}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Rejected column */}
                        <div className="space-y-4 pt-6 md:pt-0">
                          <h3 className="text-xs font-bold font-mono tracking-widest text-red-500 uppercase flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            REJECTED LOW-TIER ENTRIES
                          </h3>
                          <ul className="space-y-4 text-xs text-zinc-300 font-sans">
                            {[
                              { label: 'Spam Handles', desc: 'Random keyword soup, confusing prefixes, or excessive hyphenation chains.' },
                              { label: 'Random Numeric Junk', desc: 'Long numbers appended to generic terms with low standalone brand values.' },
                              { label: 'Trademark Impersonation', desc: 'Unauthorized brand or trademark lookalikes attempting to solicit spoof traffic.' },
                              { label: 'Fake Ownership', desc: 'Attempts to list handles without verifiable screen state or recovery control.' }
                            ].map((item, idx) => (
                              <li key={idx} className="flex gap-2.5 items-start">
                                <div className="p-0.5 rounded bg-red-500/10 text-red-500 mt-0.5 shrink-0">
                                  <X className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <strong className="text-zinc-200 block">{item.label}</strong>
                                  <span className="text-[11px] text-zinc-500 font-serif">{item.desc}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
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
                      <div className="text-center py-16 border border-dashed border-zinc-800 rounded-3xl max-w-lg mx-auto space-y-5 bg-[#08080a] relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
                        <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl w-14 h-14 flex items-center justify-center mx-auto text-blue-400">
                          <Search className="w-7 h-7" />
                        </div>
                        <div className="space-y-1.5 px-4">
                          <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono">Can't find the exact ID you want?</h3>
                          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed font-serif font-light">
                            Our proprietary scouting network can track and acquire premium digital identities from inactive registrants worldwide on your behalf.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab('request');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-widest uppercase rounded-xl transition-all shadow-md active:scale-95 cursor-pointer font-mono"
                        >
                          Request Specific ID
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
                              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Target valuation</h2>
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
                                <strong>Seller Legal Acknowledgement & Declarations (All Checked items mandated):</strong><br />
                                I solemnly declare and warrant that: (1) I legally own/control this digital asset; (2) I have standard rights to transfer it; (3) This handle is not stolen, compromised or obtained in bad faith; (4) It is not hacked; (5) All registration and contact details provided are accurate and truthful.
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
                               Success-Based Brokerage applies. Rest assured; fees are adjusted only after a successful supervised deal. Premium Broker-Assisted Sales carry zero upfront listing costs.
                             </div>

                             <div className="pt-2">
                               <CloudflareTurnstile onVerified={(token) => setTurnstileToken(token)} verified={turnstileVerified} />
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
                              disabled={!sellDeclaration || !turnstileToken}
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
                          Can't locate your target username listed? Command our brokers to directly run discovery parameters, negotiate with current managers, and coordinate switchover.
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
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Acceptable Swaps (Optional)</label>
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

                        <div className="pt-2">
                          <CloudflareTurnstile onVerified={(token) => setTurnstileToken(token)} verified={turnstileVerified} />
                        </div>

                        <button
                          type="submit"
                          disabled={!turnstileToken}
                          className="w-full py-4 bg-white disabled:bg-zinc-800 disabled:text-zinc-500 hover:bg-zinc-200 text-black text-xs font-bold tracking-widest uppercase rounded-xl transition-all mt-4 cursor-pointer"
                        >
                          Lock Search Commission
                        </button>

                      </form>
                    </div>
                  </div>
                )}

                {/* ----------------- SUB-ROUTE: BROKERAGE HOW GUIDE ----------------- */}
                {activeTab === 'how' && (
                  <div className="max-w-5xl mx-auto space-y-16 animate-fadeIn text-left">
                    <div className="text-center max-w-xl mx-auto space-y-4">
                      <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight uppercase font-mono tracking-tight text-center">Bespoke Broker-Assisted Protocol</h1>
                      <p className="text-sm text-zinc-400 font-serif leading-relaxed text-center font-light">
                        Why automated checkouts represent high risk vectors inside premium digital platforms: they do not purge administrative backdoor logins, secondary backups phone numbers, or pending brand claims. Private human mediated brokerages mitigate these liabilities.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {[
                        { number: '01', title: 'Isolate & Lock Handle', text: 'Senior brokers coordinate registry details, execute verification audits, request administrative updates, and temporarily confirm profile criteria.' },
                        { number: '02', title: 'Structured Brokerage Payment', text: 'Buyers allocate funding under our structured payment process. Released values reside under human broker supervision pending coordinates verification.' },
                        { number: '03', title: 'Supervised Transfer Flow', text: 'Our brokers systematically coordinate standard registered mail switchovers, confirm release vectors, verify brand details, and complete payout releases.' }
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
                        <h2 className="text-lg sm:text-xl font-bold text-white uppercase font-mono">Success-Based Brokerage</h2>
                        <p className="text-xs text-zinc-400 leading-normal font-serif font-light">
                          Brokerage applies only after a successful transaction and supervised safety transfer is fully signed off. We charge zero upfront listing fees, ensuring aligning of interest for premium broker-assisted sales.
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

                {/* ----------------- ROUTE: TERMS OF SERVICE ----------------- */}
                {activeTab === 'terms' && (
                  <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn text-left text-zinc-300">
                    <div className="border border-white/10 bg-[#0f0f12] rounded-2xl p-8 sm:p-12 space-y-6 shadow-xl">
                      <div className="space-y-2 border-b border-white/5 pb-6">
                        <span className="text-[10px] uppercase font-bold tracking-widest font-mono text-blue-400">Governance Doc</span>
                        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase font-mono">Terms of Service</h1>
                        <p className="text-xs text-zinc-500 font-mono">Last Updated: May 23, 2026</p>
                      </div>

                      <div className="space-y-6 text-sm leading-relaxed font-sans">
                        <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl text-xs text-yellow-500 font-mono">
                          PLATFORM ROLE DISCLAIMER: IDsvault is an independent digital brokerage platform for premium digital identities. IDsvault operates only as an intermediary coordinator. We are NOT an official representative or partner of Meta Platforms, Instagram, X Corp, Telegram, or any third-party app list. We are NOT a licensed escrow company, insurer, or financial institution.
                        </div>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-white uppercase font-mono">1. Age Requirement</h2>
                          <p>You must be at least **18 years of age** or the age of legal majority in your jurisdiction to use this brokerage workspace, submit listings, or place commission hunts. If you are under 18, you are strictly prohibited from using this site.</p>
                        </div>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-white uppercase font-mono">2. No Retention or Continuity Guarantee</h2>
                          <p>Because social media platforms and digital registry registries maintain independent terms of service and reservation authorities, **IDsvault makes no guarantees of future account retention, platform policy compliance, continued access, or future ownership continuity** once coordinates switchover completes. Third-party platforms possess full rights to modify handles, suspend profiles, or reclaim usernames at their sole discretion.</p>
                        </div>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-white uppercase font-mono">3. Seller Warranties & Declarations</h2>
                          <p>Every registrant listing handles in our catalog warrants and represents that:</p>
                          <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-400">
                            <li>They are the sole legal registrant or authorized controller of the digital asset.</li>
                            <li>They possess complete legal rights and clearance to coordinate the transfer.</li>
                            <li>The asset is not associated with hacked, stolen, or compromised systems.</li>
                            <li>The listed handle does not impersonate any person, trademark, or business.</li>
                            <li>All data, screenshots, and ownership info provided are completely truthful.</li>
                          </ul>
                        </div>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-white uppercase font-mono">4. Buyer Acknowledgements & Risks</h2>
                          <p>Buyers entering into structured payment agreements explicitly acknowledge and accept:</p>
                          <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-400">
                            <li>The inherent administrative risks of digital handle transactions.</li>
                            <li>The danger of third-party platforms enforcing rules that retroactively disable or suspend transferred assets.</li>
                            <li>Our model is an intermediary brokerage facilitating a supervised payment workflow only.</li>
                            <li>The absolute lack of post-transaction administrative recovery or permanent retention guarantees.</li>
                          </ul>
                        </div>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-white uppercase font-mono">5. Suspension & Deactivation Rights</h2>
                          <p>IDsvault maintains complete, unilateral reservation rights to suspend, hide, edit, or deactivate any seller listing, buyer campaign, or registry handle that fails quality reviews, manual supervisor controls, or compliance guidelines.</p>
                        </div>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-white uppercase font-mono">6. Limitation of Liability</h2>
                          <p>To the maximum extent permitted under applicable law, IDsvault's maximum cumulative liability for any coordinates transaction, brokerage dispute, or platform failure shall be strictly limited to the actual brokerage commission fee received by IDsvault for that specific transaction.</p>
                        </div>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-white uppercase font-mono">7. Dispute Resolution Process</h2>
                          <p>Should a transfer stall or a disagreement arise during a human brokerage session, our senior supervisor desk will conduct a manual review of communication records, transfer coordinates, and security configurations. Both buyers and sellers agree to cooperate fully with this manual escalation protocol prior to pursuing external claims. Contact us directly at <span className="text-blue-400">compliance@idsvault.vip</span> for review.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ----------------- ROUTE: PRIVACY POLICY ----------------- */}
                {activeTab === 'privacy' && (
                  <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn text-left text-zinc-300">
                    <div className="border border-white/10 bg-[#0f0f12] rounded-2xl p-8 sm:p-12 space-y-6 shadow-xl">
                      <div className="space-y-2 border-b border-white/5 pb-6">
                        <span className="text-[10px] uppercase font-bold tracking-widest font-mono text-blue-400">Privacy Standards</span>
                        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase font-mono">Privacy Policy</h1>
                        <p className="text-xs text-zinc-500 font-mono">Last Updated: May 23, 2026</p>
                      </div>

                      <div className="space-y-6 text-sm leading-relaxed font-sans">
                        <p>At IDsvault, we are dedicated to protecting your privacy while operating a secure, premium digital brokerage workspace. This Policy defines our compliance practices for user information and personal coordinates.</p>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-white uppercase font-mono">1. Information We Collect</h2>
                          <p>To coordinate supervised transfer flows, verify ownership, and protect our catalog quality, we gather the following categories of information:</p>
                          <ul className="list-disc pl-5 space-y-1.5 text-xs text-zinc-400">
                            <li><strong>Identifiable Information:</strong> User names, legal representative coordinates, and fast-track contact numbers (WhatsApp and phone).</li>
                            <li><strong>Verification Materials:</strong> Control screenshots, platform configuration audits, and verification proof files uploaded during seller submissions.</li>
                            <li><strong>Google Analytics Logs:</strong> Since we prioritize system optimization, we integrate standard Google Analytics (GA4) to inspect anonymous virtual pageviews and UI clicks.</li>
                            <li><strong>Tracking Cookies:</strong> We utilize basic analytical and behavioral cookies to trace current UI state settings, tab selections, and device preferences.</li>
                            <li><strong>Transaction Data:</strong> Historical records of transaction coordinates, agreed amounts, commission ledgers, and payout status histories.</li>
                          </ul>
                        </div>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-white uppercase font-mono">2. How We Use Google Analytics</h2>
                          <p>IDsvault boots standard Google Analytics with the G-IDSVAULT88 measurement ID. This helps us monitor web traffic patterns without logging explicit database keys. Under GA4 regulations, you acknowledge that your behavioral patterns, location indices, page transitions, and referral paths are logged in an aggregated manner. You can opt out of GA4 tracking by configuring your browser's cookie blockers or privacy controls.</p>
                        </div>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-white uppercase font-mono">3. Data Retention & Deletion Rights</h2>
                          <p>We preserve collected data only for periods required to fulfill active brokering, prevent registry fraud, or record structural ledgers for audit sessions. Users hold absolute rights to request complete deletion of their logs from our system. If you wish to purge your data registries, contact our administration desk at <span className="text-blue-400">privacy@idsvault.vip</span> with your verified coordinates.</p>
                        </div>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-white uppercase font-mono">4. Security Infrastructure</h2>
                          <p>Data files, seller credentials, and communication logs are stored inside isolated databases with turnstile tokens. We employ Cloudflare Turnstile token validation to filter malicious automated crawlers and avoid security leakage. No sensitive raw passwords or payout secrets are held within unencrypted client caches.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ----------------- ROUTE: REFUND POLICY ----------------- */}
                {activeTab === 'refund' && (
                  <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn text-left text-zinc-300">
                    <div className="border border-white/10 bg-[#0f0f12] rounded-2xl p-8 sm:p-12 space-y-6 shadow-xl">
                      <div className="space-y-2 border-b border-white/5 pb-6">
                        <span className="text-[10px] uppercase font-bold tracking-widest font-mono text-blue-400">Financial Integrity</span>
                        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase font-mono">Refund Policy</h1>
                        <p className="text-xs text-zinc-500 font-mono">Last Updated: May 23, 2026</p>
                      </div>

                      <div className="space-y-6 text-sm leading-relaxed font-sans">
                        <p>Our goal is to coordinate smooth and structured premium handovers with complete alignment. This policy details how payments, transactions, and brokerages are managed in case of deal cancelation.</p>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-white uppercase font-mono">1. Failed Deal Coordinates Processing</h2>
                          <p>If a seller cannot complete ownership verification, fails to provide accurate configuration coordinates, or fails to complete the supervised transfer flow under our human broker room supervision, the deal is canceled immediately. In all such cases, **100% of the deposited buyer funding is returned to the original source**, with zero administration fees or processing charges deducted.</p>
                        </div>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-white uppercase font-mono">2. Cancellation Policy</h2>
                          <p>Transactions may be canceled by either buyer or seller prior to our manual brokers establishing contact and initializing active credential switchover protocols. Once human coordination rooms are opened, transfer audits have begun, or registry details have been checked, cancellations require manual supervisor approval and might be subject to mediation.</p>
                        </div>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-white uppercase font-mono">3. Brokerage Fee Conditions</h2>
                          <p>IDsvault charges a success-based brokerage configuration fee (standardly 25%). This fee is strictly non-refundable **once a supervised transfer is completed and signed off** by both target parties in the broker workspace. Since success brokerage involves custom outreach campaign labor, completed handovers represented in active ledgers cannot be refunded.</p>
                        </div>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-white uppercase font-mono">4. Manual Disputes and Escalations</h2>
                          <p>In cases where transfer coordinate delivery is disputed (e.g. transfer locked mid-flow by third-party platform filters), a senior broker supervisor will review device details, platform status metrics, and delivery timestamp logs. Our desk provides neutral manual determinations of the dispute to initiate clean resolution or fund releases.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ----------------- ROUTE: ACCEPTABLE USE POLICY ----------------- */}
                {activeTab === 'acceptable-use' && (
                  <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn text-left text-zinc-300">
                    <div className="border border-white/10 bg-[#0f0f12] rounded-2xl p-8 sm:p-12 space-y-6 shadow-xl">
                      <div className="space-y-2 border-b border-white/5 pb-6">
                        <span className="text-[10px] uppercase font-bold tracking-widest font-mono text-blue-400">Prohibited Actions</span>
                        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase font-mono">Acceptable Use Policy</h1>
                        <p className="text-xs text-zinc-500 font-mono">Last Updated: May 23, 2026</p>
                      </div>

                      <div className="space-y-6 text-sm leading-relaxed font-sans">
                        <p>IDsvault works to maintain a professional, compliant, and high-purity digital registry workspace. All users, registrars, and buyers must follow these strict guidelines. Failure to comply will result in listing removal and permanent account deactivation.</p>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-navy-400 uppercase font-mono text-red-400">Strictly Prohibited Submissions</h2>
                          <p>You may not list, request, or broker any digital asset or coordinate that is associated with:</p>
                          <ul className="list-disc pl-5 space-y-2 text-xs text-zinc-400">
                            <li><strong>Hacked or Compromised Accounts:</strong> Any handle obtained via phishing, SIM swap, physical theft, credential stuffing, or unauthorized administrative takeover.</li>
                            <li><strong>Stolen Digital Assets:</strong> Accounts sold or traded without the permission of the original true owner.</li>
                            <li><strong>Trademark Infringements:</strong> Usernames or handles containing third-party corporate brands, patents, or protected trademarks (e.g. @apple, @nike, @instagram), unless you are the official trademark representative.</li>
                            <li><strong>Fraudulent Schemes:</strong> Listings with fake traffic data, bot-inflated metrics, or deceptive ownership proofs.</li>
                            <li><strong>Impersonation:</strong> Handles intended to deceive, misrepresent, or impersonate public figures, creators, or existing businesses.</li>
                            <li><strong>Registry Abuse & Spam:</strong> Mass list registrations of random numeric strings, junk characters, or bot-created inactive filler names.</li>
                          </ul>
                        </div>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-white uppercase font-mono">User Code of Conduct</h2>
                          <p>Direct communication bypasses, threatening broker supervisors, offering bribe channels, or manipulating Turnstile coordinates is strictly forbidden. IDsvault operates a professional desk, and we maintain complete discretion to suspend blocklisted coordinate strings immediately.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ----------------- ROUTE: TRADEMARK POLICY ----------------- */}
                {activeTab === 'trademark-policy' && (
                  <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn text-left text-zinc-300">
                    <div className="border border-white/10 bg-[#0f0f12] rounded-2xl p-8 sm:p-12 space-y-6 shadow-xl">
                      <div className="space-y-2 border-b border-white/5 pb-6">
                        <span className="text-[10px] uppercase font-bold tracking-widest font-mono text-blue-400">Brand Safety</span>
                        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase font-mono">Trademark & IP Policy</h1>
                        <p className="text-xs text-zinc-500 font-mono">Last Updated: May 23, 2026</p>
                      </div>

                      <div className="space-y-6 text-sm leading-relaxed font-sans">
                        <p>IDsvault fully respects the intellectual property and proprietary brand assets of trademark holders worldwide. We operate a zero-tolerance policy for listings that cause consumer confusion or infringe on active trademarks.</p>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-white uppercase font-mono">1. Trademark Infringing Listings</h2>
                          <p>Registrants are strictly forbidden from submitting usernames or brand identities that violate active intellectual property rights. If a listing is flagged as matching an existing registered trademark, it will be immediately frozen, and the submitter will be banned from our catalogue system.</p>
                        </div>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-white uppercase font-mono">2. Impersonation Prohibitions</h2>
                          <p>We do not broker handles designed to impersonate businesses or public figures. Submissions matching known brands, company structures, or public entities are automatically rejected from the premium vault deck.</p>
                        </div>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-white uppercase font-mono">3. Rights of Removal & Take-Down Protocols</h2>
                          <p>IDsvault reserves the absolute, unilateral right to remove any listed asset, close any deal room, or filter search coordinates that are the subject of an intellectual property claim or trademark complaint. No prior notice is required to initiate IP filters.</p>
                        </div>

                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-white uppercase font-mono">4. File an IP / Trademark Complaint</h2>
                          <p>If you believe a handle listed on IDsvault infringes your registered trademark or proprietary identifier, please send a structured complaint to our dedicated IP desk. Your request must include: your company details, the registered trademark number, and the specific handle info. Reach our IP desk at:</p>
                          <div className="p-4 bg-[#050505] border border-white/5 rounded-xl font-mono text-xs text-zinc-400 space-y-1">
                            <div><strong>IP Desk Email:</strong> legal@idsvault.vip</div>
                            <div><strong>Subject Line:</strong> Trademark Compliance Claim: [Target @Handle]</div>
                            <div><strong>Response window:</strong> 24-48 Working Hours</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ----------------- ROUTE: ANTI-FRAUD POLICY ----------------- */}
                {activeTab === 'anti-fraud' && (
                  <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn text-left text-zinc-300">
                    <div className="border border-white/10 bg-[#0f0f12] rounded-2xl p-8 sm:p-12 space-y-6 shadow-xl">
                      <div className="space-y-2 border-b border-white/5 pb-6">
                        <span className="text-[10px] uppercase font-bold tracking-widest font-mono text-blue-400">Fraud Prevention</span>
                        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase font-mono">Anti-Fraud Policy</h1>
                        <p className="text-xs text-zinc-500 font-mono">Last Updated: May 23, 2026</p>
                      </div>

                      <div className="space-y-6 text-sm leading-relaxed font-sans">
                        <p>IDsvault works to eliminate transaction risk, coordinate fraud, and registrants deception. We coordinate systematic manual screening steps to protect the integrity of every premium listing.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                          <div className="p-6 bg-[#0c0c0e] border border-white/5 rounded-xl space-y-3">
                            <h3 className="text-sm font-bold text-white font-mono uppercase">1. Seller Verification Workflow</h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">Sellers must provide verification coordinate uploads and screenshots to establish proof of administrative authority over listed assets. We do not approve handles without vetting.</p>
                          </div>

                          <div className="p-6 bg-[#0c0c0e] border border-white/5 rounded-xl space-y-3">
                            <h3 className="text-sm font-bold text-white font-mono uppercase">2. Deep Listing Audit Review</h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">Our manual brokers conduct audits on historical registrations, past profile modifications, and linked recovery parameters to detect potential security flags.</p>
                          </div>

                          <div className="p-6 bg-[#0c0c0e] border border-white/5 rounded-xl space-y-3">
                            <h3 className="text-sm font-bold text-white font-mono uppercase">3. Suspicious Activity Deactivation</h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">Whenever a listing triggers suspicious changes in ownership, secondary backdoors, or coordinate locks, are automatically frozen pending manual supervisor audit.</p>
                          </div>

                          <div className="p-6 bg-[#0c0c0e] border border-white/5 rounded-xl space-y-3">
                            <h3 className="text-sm font-bold text-white font-mono uppercase">4. Manual Supervisor Moderation</h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">Our senior supervisor desk acts as a human validation checkpoint. Automated scripts never release funds. Payments are structured and supervised.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ----------------- ROUTE: LISTING ELIGIBILITY ----------------- */}
                {activeTab === 'listing-eligibility' && (
                  <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn text-left text-zinc-300">
                    <div className="border border-white/10 bg-[#0f0f12] rounded-2xl p-8 sm:p-12 space-y-6 shadow-xl">
                      <div className="space-y-2 border-b border-white/5 pb-6">
                        <span className="text-[10px] uppercase font-bold tracking-widest font-mono text-blue-400">Quality Standards</span>
                        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase font-mono">Listing Eligibility</h1>
                        <p className="text-xs text-zinc-500 font-mono">Last Updated: May 23, 2026</p>
                      </div>

                      <div className="space-y-6 text-sm leading-relaxed font-sans">
                        <p>To preserve catalog quality and ensure premium experiences, we enforce strict criteria defining which digital assets are acceptable for brokerage listing.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono text-sm uppercase">
                              <span>✔ Approved Inventory Candidates</span>
                            </div>
                            <ul className="space-y-2.5 text-xs text-zinc-400 list-disc pl-5">
                              <li><strong>Premium Usernames:</strong> High-rarity short handles (under 6 characters).</li>
                              <li><strong>Brandable Handles:</strong> Memorable dictionary words, acronyms, or unique phonetic identifiers.</li>
                              <li><strong>Social Media Media:</strong> Established media, niche channel, or creator community handles.</li>
                              <li><strong>Location Handles:</strong> Geographic names, capital city references, or popular territory names.</li>
                              <li><strong>Finance / Cryto Assets:</strong> Industry keywords, Fintech brandables, or tech terms.</li>
                            </ul>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-red-400 font-bold font-mono text-sm uppercase">
                              <span>✘ Strictly Rejected Submissions</span>
                            </div>
                            <ul className="space-y-2.5 text-xs text-zinc-400 list-disc pl-5">
                              <li><strong>Spam Handles:</strong> Ineligible filler accounts or long numeric junk tags (e.g., @john4829104).</li>
                              <li><strong>Hacked Assets:</strong> Accounts obtained without original owner authorization or registrar permission.</li>
                              <li><strong>Trademark / IP Infringing Names:</strong> Direct copyright or brand infringements.</li>
                              <li><strong>Impersonation Accounts:</strong> Usernames created to mimic recognized brands or celebrities.</li>
                              <li><strong>Fake Ownership Claims:</strong> Submissions where the registrant fails to complete the verification proof checklist.</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ----------------- ROUTE: SECURE ADMIN WORKSPACE ----------------- */}
                {activeTab === 'admin' && (
                  <div className="max-w-5xl mx-auto space-y-10 animate-fadeIn text-left">
                    
                    {!adminAuth ? (
                      <div className="max-w-md mx-auto space-y-6 py-12">
                        <div className="text-center space-y-2">
                          <h2 className="text-2xl font-black text-white uppercase font-mono">Supervisor Gate check</h2>
                          <p className="text-xs text-zinc-500">Secure entry vector into the broker administration desk.</p>
                        </div>

                        <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl p-6 space-y-4">
                          {/* Toggle Mode */}
                          <div className="grid grid-cols-2 gap-2 p-1 bg-[#050505] rounded-xl border border-white/5">
                            <button
                              type="button"
                              onClick={() => setAdminAuthMode('passkey')}
                              className={`py-1.5 text-[10px] font-mono uppercase tracking-wider rounded-lg font-bold transition-all ${adminAuthMode === 'passkey' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                              Standard Passcode
                            </button>
                            <button
                              type="button"
                              onClick={() => setAdminAuthMode('supabase')}
                              className={`py-1.5 text-[10px] font-mono uppercase tracking-wider rounded-lg font-bold transition-all ${adminAuthMode === 'supabase' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                              Supabase Auth
                            </button>
                          </div>

                          <form onSubmit={handleAdminAuthSubmit} className="space-y-4 text-left">
                            {adminAuthMode === 'supabase' && (
                              <div className="animate-fadeIn">
                                <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-widest font-mono">Supervisor Email</label>
                                <input
                                  type="email"
                                  required={adminAuthMode === 'supabase'}
                                  value={adminEmail}
                                  onChange={(e) => setAdminEmail(e.target.value)}
                                  placeholder="supervisor@idsvault.vip"
                                  className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none placeholder-zinc-800 font-mono"
                                />
                              </div>
                            )}
                            
                            <div>
                              <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-widest font-mono">
                                {adminAuthMode === 'passkey' ? 'Bypass Passcode Key' : 'Account Password'}
                              </label>
                              <input
                                type="password"
                                required
                                value={adminPass}
                                onChange={(e) => setAdminPass(e.target.value)}
                                placeholder={adminAuthMode === 'passkey' ? 'Enter VITE_ADMIN_ACCESS_KEY ("adminpass")' : 'Enter your password'}
                                className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none placeholder-zinc-800"
                              />
                            </div>

                            <button
                              type="submit"
                              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-widest uppercase rounded-xl transition-all cursor-pointer font-mono"
                            >
                              Authenticate Broker Session
                            </button>
                          </form>

                          {adminAuthMode === 'passkey' && (
                            <p className="text-[10px] text-zinc-500 text-center font-mono leading-relaxed pt-2">
                              For quick developer review or offline demo audit, use the default credentials passcode: <span className="text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded font-bold">adminpass</span>
                            </p>
                          )}
                        </div>
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
                                Configure the platform commissions deduction %. Payouts metrics across brokerage deals recalculate dynamically based on this config.
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

                        {/* ACTIVE BROKERAGE TRANSACTIONS LEDGER BOARD */}
                        <div className="space-y-4 text-left">
                          <h2 className="text-lg font-bold text-white uppercase font-mono">Active Deals Ledger Swaps</h2>
                          
                          {deals.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {deals.map((deal) => {
                                // Calculate dynamic brokerage figures matching brokeragePct configuration changes
                                const compBrokerage = deal.agreedPrice * (brokeragePct / 100);
                                const compPayout = deal.agreedPrice * (1 - brokeragePct / 100);

                                return (
                                  <div key={deal.id} className="p-6 bg-[#0c0c0d] border border-white/5 rounded-2xl space-y-4 shadow-xl">
                                    
                                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                      <div>
                                        <span className="text-lg font-mono font-black text-white">@{deal.username}</span>
                                        <span className="block text-[10px] text-zinc-500 font-semibold uppercase font-mono">{deal.platform} Deal Room</span>
                                      </div>
                                      <span className="px-2.5 py-0.5 text-[9px] font-mono uppercase tracking-widest font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded">
                                        {deal.status}
                                      </span>
                                    </div>

                                    {/* Brokerage Figures layout with config commission percentages */}
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
                                      <span className="block text-[8px] font-extrabold text-zinc-500 uppercase font-mono">Brokerage Stage progressions</span>
                                      
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

                        {/* Real-time Google Workspace Sheets Synchronous Ledger Core */}
                        <div id="google-sheets-sync-ledger" className="p-6 sm:p-8 bg-[#0c0c0e] border border-white/[0.08] rounded-2xl text-left relative overflow-hidden space-y-6 mt-12 border-t border-white/5 pt-8">
                          <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-600/5 blur-3xl pointer-events-none" />
                          
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                {sheetsUser ? (
                                  <span className="p-1 px-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping shrink-0" />
                                    Google Workspace Live Sync Active
                                  </span>
                                ) : (
                                  <span className="p-1 px-2 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] font-mono font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                                    Google Sheets Ledger Available
                                  </span>
                                )}
                              </div>
                              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-mono flex items-center gap-2.5">
                                <FileSpreadsheet className="w-5.5 h-5.5 text-emerald-500" />
                                <span>Workspace Deal Ledger Sync</span>
                              </h2>
                              <p className="text-xs text-zinc-400 mt-1">
                                Secure real-time transaction synchronization directly into your cloud spreadsheets.
                              </p>
                            </div>

                            {/* Connection Controls */}
                            <div>
                              {!sheetsUser ? (
                                <button
                                  id="google-signin-btn"
                                  onClick={handleSheetsWebLogin}
                                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 shadow-lg cursor-pointer"
                                >
                                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.49 3.77v3.12h4.02c2.34-2.16 3.69-5.32 3.69-8.74z"/>
                                    <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.02-3.12c-1.11.74-2.53 1.18-3.94 1.18-3.03 0-5.6-2.05-6.51-4.82H1.31v3.23A12 12 0 0 0 12 24z"/>
                                    <path fill="#FBBC05" d="M5.49 14.15A7.16 7.16 0 0 1 5.09 12c0-.75.13-1.47.37-2.15V6.62H1.31A12 12 0 0 0 0 12c0 2.1.55 4.07 1.51 5.8l3.98-3.65z"/>
                                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A12 12 0 0 0 1.31 6.62l4.18 3.84c.91-2.77 3.48-4.71 6.51-4.71z"/>
                                  </svg>
                                  <span>Sign in with Google</span>
                                </button>
                              ) : (
                                <div className="flex flex-wrap items-center gap-3">
                                  <div className="flex items-center gap-2 bg-[#09090b] border border-white/5 py-1 px-2.5 rounded-lg">
                                    {sheetsUser.photoURL ? (
                                      <img 
                                        src={sheetsUser.photoURL} 
                                        alt="User Profile" 
                                        className="w-5 h-5 rounded-full" 
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-blue-500/25 flex items-center justify-center text-[10px] text-blue-400 font-bold uppercase">
                                        {sheetsUser.displayName?.charAt(0) || 'U'}
                                      </div>
                                    )}
                                    <div className="text-left font-mono">
                                      <span className="block text-[10px] font-bold text-white leading-none">{sheetsUser.displayName}</span>
                                      <span className="block text-[8px] text-zinc-500 leading-none mt-0.5">{sheetsUser.email}</span>
                                    </div>
                                  </div>
                                  <button
                                    id="google-signout-btn"
                                    onClick={handleSheetsWebLogout}
                                    className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-white/5 text-zinc-500 hover:text-zinc-300 rounded-md text-[9px] font-semibold tracking-wider uppercase font-mono transition-colors shrink-0 cursor-pointer"
                                  >
                                    Logout
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Toast Notices inside Card */}
                          {syncSuccessToast && (
                            <div id="sheets-sync-toast" className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-mono flex items-center gap-2">
                              <Check className="w-4 h-4 shrink-0 animate-bounce" />
                              <span>{syncSuccessToast}</span>
                            </div>
                          )}

                          {sheetsError && (
                            <div id="sheets-error-banner" className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-mono flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>{sheetsError}</span>
                            </div>
                          )}

                          {/* Dynamic Panel Flow based on OAuth sign-in */}
                          {!sheetsUser ? (
                            <div className="text-center py-8 px-4 bg-zinc-950/40 border border-white/5 rounded-xl space-y-3">
                              <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto border border-emerald-500/20">
                                <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Sync Your Personal Brokerage Ledger</h4>
                                <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                                  Sign in with your Google account to automatically track digital handle acquisitions, seller verify queries, status revisions, and active catalog deal flows.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-5">
                              {/* Mapped Sheet Area */}
                              {!syncSpreadsheetId ? (
                                <div className="p-5 bg-zinc-950/60 border border-white/5 rounded-xl space-y-4">
                                  <div className="space-y-1 text-left">
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Step 2: Generate Active Cloud Spreadsheet Ledger</h4>
                                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                                      Our secure broker processor will automatically deploy a formatted ledger spreadsheet inside your Google Drive, format custom columns under styling headers, and perform a live batch backfill of our catalog.
                                    </p>
                                  </div>
                                  <button
                                    id="create-ledger-btn"
                                    onClick={handleCreateNewSpreadsheet}
                                    disabled={isSyncingSheets}
                                    className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 cursor-pointer"
                                  >
                                    {isSyncingSheets ? (
                                      <>
                                        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                                        <span>Deploying Spreadsheet Ledger...</span>
                                      </>
                                    ) : (
                                      <>
                                        <FileSpreadsheet className="w-4 h-4 shrink-0" />
                                        <span>Deploy Format & Sync Active Ledger</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-6">
                                  
                                  {/* Spreadsheet detail rows */}
                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-zinc-950/60 border border-white/5 p-4 rounded-xl items-center">
                                    <div className="md:col-span-8 text-left space-y-1">
                                      <span className="text-[9px] font-mono font-bold uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-400">
                                        LIVE SYNC PORT ATTACHED
                                      </span>
                                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono leading-none pt-1">
                                        Active Broker Ledger Spreadsheet
                                      </h4>
                                      <p className="font-mono text-[9px] text-zinc-500 break-all select-all">
                                        ID: {syncSpreadsheetId}
                                      </p>
                                    </div>
                                    <div className="md:col-span-4 flex flex-col sm:flex-row items-stretch sm:items-center md:justify-end gap-2 shrink-0">
                                      <a
                                        id="open-spreadsheet-link"
                                        href={syncSpreadsheetUrl || undefined}
                                        target="_blank"
                                        rel="noreferrer"
                                        referrerPolicy="no-referrer"
                                        className="px-4 py-2 bg-[#0c0c0e] hover:bg-zinc-900 border border-white/10 text-zinc-200 hover:text-white rounded-lg text-xs font-bold font-mono tracking-wider transition-all flex items-center justify-center gap-1.5"
                                      >
                                        <span>Open Sheet</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                      <button
                                        id="bulk-sync-btn"
                                        onClick={() => handleBulkExportCurrentListings()}
                                        disabled={isSyncingSheets}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                                      >
                                        {isSyncingSheets ? (
                                          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                                        ) : (
                                          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                                        )}
                                        <span>Sync Listings</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Google Sheets real live rows visualization */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                                        Live Synced Sheet Logs (Last 5 Rows)
                                      </h4>
                                      <button 
                                        id="refresh-spreadsheet-btn"
                                        onClick={() => handleFetchLiveSpreadsheetRows()}
                                        className="text-[9px] font-mono font-bold text-blue-500 hover:text-blue-400 uppercase tracking-widest cursor-pointer hover:underline"
                                      >
                                        Refresh entries
                                      </button>
                                    </div>

                                    <div className="border border-white/5 rounded-xl bg-[#09090b] overflow-hidden">
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-left font-mono text-[10px]">
                                          <thead>
                                            <tr className="bg-[#0e0e11] text-zinc-400 border-b border-white/5 uppercase">
                                              <th className="py-2.5 px-3">Log Timestamp</th>
                                              <th className="py-2.5 px-3">Asset/ID Name</th>
                                              <th className="py-2.5 px-3">Platform</th>
                                              <th className="py-2.5 px-3">Price / Offer</th>
                                              <th className="py-2.5 px-3">Status</th>
                                              <th className="py-2.5 px-3">Desk Assignment</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-white/5">
                                            {!syncedRows || syncedRows.length === 0 ? (
                                              <tr>
                                                <td colSpan={6} className="py-8 text-center text-zinc-600 text-[11px]">
                                                  No spreadsheet entries logged yet. Try starting a buyer deal transfer, submitting a handle, or clicking &lsquo;Sync Listings&rsquo;!
                                                </td>
                                              </tr>
                                            ) : (
                                              syncedRows.slice(-5).reverse().map((row, idx) => (
                                                <tr key={idx} className="hover:bg-white/[0.02]">
                                                  <td className="py-2.5 px-3 text-zinc-500 max-w-[120px] truncate">{row[0]}</td>
                                                  <td className="py-2.5 px-3 font-semibold text-white">{row[1]}</td>
                                                  <td className="py-2.5 px-3 text-zinc-400">{row[2]}</td>
                                                  <td className="py-2.5 px-3 text-emerald-400 font-bold">{row[3]}</td>
                                                  <td className="py-2.5 px-3">
                                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase inline-block ${
                                                      String(row[4]).includes('Initiated') || String(row[4]).includes('Queued') 
                                                        ? 'bg-blue-500/10 border border-blue-500/15 text-blue-400' 
                                                        : 'bg-emerald-500/10 border border-emerald-500/15 text-emerald-400'
                                                    }`}>
                                                      {row[4] || 'Logged'}
                                                    </span>
                                                  </td>
                                                  <td className="py-2.5 px-3 text-zinc-400 max-w-[150px] truncate">{row[5] || 'Senior Specialist'}</td>
                                                </tr>
                                              ))
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </div>

                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Google Analytics 4 Real-time Integration Hub */}
                        <div id="google-analytics-integration" className="p-6 sm:p-8 bg-[#0c0c0e] border border-white/[0.08] rounded-2xl text-left relative overflow-hidden space-y-6 mt-12 border-t border-white/5 pt-8">
                          <div className="absolute top-0 right-0 h-40 w-40 bg-amber-500/5 blur-3xl pointer-events-none" />
                          
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="p-1 px-2 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                                  GA4 Active Performance Stream
                                </span>
                              </div>
                              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-mono flex items-center gap-2.5">
                                <BarChart className="w-5.5 h-5.5 text-amber-500" />
                                <span>Google Analytics Audit Tracking</span>
                              </h2>
                              <p className="text-xs text-zinc-400 mt-1">
                                Live system engagement monitoring using your telemetry keys.
                              </p>
                            </div>

                            {/* Configuration toggle */}
                            <div>
                              <button
                                id="toggle-ga-editing-btn"
                                onClick={() => setIsGaSettingsEditing(!isGaSettingsEditing)}
                                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white rounded-lg text-xs font-bold font-mono tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Settings className="w-3.5 h-3.5" />
                                <span>{isGaSettingsEditing ? 'Cancel Edit' : 'Modify Credentials'}</span>
                              </button>
                            </div>
                          </div>

                          {gaSuccessToast && (
                            <div id="ga-success-toast" className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs font-mono flex items-center gap-2">
                              <CheckSquare className="w-4 h-4 shrink-0 animate-bounce" />
                              <span>{gaSuccessToast}</span>
                            </div>
                          )}

                          {/* Display current GA coordinates */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-950/40 p-4 border border-white/5 rounded-xl">
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono text-zinc-500 block font-bold uppercase tracking-widest">Analytics Account ID</span>
                              <span className="text-xs font-mono text-zinc-300 bg-[#060608] py-1 px-2 rounded border border-white/5 block w-full truncate">{gaAccountId}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono text-zinc-500 block font-bold uppercase tracking-widest">Property ID</span>
                              <span className="text-xs font-mono text-zinc-300 bg-[#060608] py-1 px-2 rounded border border-white/5 block w-full truncate">{gaPropertyId}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono text-zinc-500 block font-bold uppercase tracking-widest">Measurement ID (Tag)</span>
                              <span className="text-xs font-mono text-amber-400 bg-[#060608] py-1 px-2 rounded border border-amber-500/10 block w-full truncate font-bold">{gaMeasurementId}</span>
                            </div>
                          </div>

                          {/* Custom credentials configurator forms */}
                          {isGaSettingsEditing && (
                            <div className="p-5 bg-zinc-950/70 border border-white/5 rounded-xl space-y-4">
                              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Update Google Analytics Credentials</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Account ID</label>
                                  <input
                                    id="ga-input-account"
                                    type="text"
                                    className="w-full bg-[#070709] border border-white/10 text-white p-2.5 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500 transition-colors"
                                    value={gaInputAccount}
                                    onChange={(e) => setGaInputAccount(e.target.value)}
                                    placeholder="e.g. 344958965"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Property ID</label>
                                  <input
                                    id="ga-input-property"
                                    type="text"
                                    className="w-full bg-[#070709] border border-white/10 text-white p-2.5 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500 transition-colors"
                                    value={gaInputProperty}
                                    onChange={(e) => setGaInputProperty(e.target.value)}
                                    placeholder="e.g. 531107131"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-mono">Measurement ID (Tag)</label>
                                  <input
                                    id="ga-input-measurement"
                                    type="text"
                                    className="w-full bg-[#070709] border border-white/10 text-white p-2.5 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500 transition-colors"
                                    value={gaInputMeasurement}
                                    onChange={(e) => setGaInputMeasurement(e.target.value)}
                                    placeholder="G-XXXXXXXXXX"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2 justify-end pt-2">
                                <button
                                  id="save-ga-config-btn"
                                  onClick={() => {
                                    handleUpdateGAConfig(gaInputAccount.trim(), gaInputProperty.trim(), gaInputMeasurement.trim());
                                    setIsGaSettingsEditing(false);
                                  }}
                                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Activity className="w-3.5 h-3.5" />
                                  <span>Update Connection</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Decoded/captured live actions logging stream */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping shrink-0" />
                                Live Triggered GA4 Event Payload stream
                              </h4>
                              <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                                Real-time Telemetry capture
                              </span>
                            </div>

                            <div className="border border-white/5 rounded-xl bg-[#09090b] overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left font-mono text-[10px]">
                                  <thead>
                                    <tr className="bg-[#0e0e11] text-zinc-400 border-b border-white/5 uppercase">
                                      <th className="py-2.5 px-3">Captured Timestamp</th>
                                      <th className="py-2.5 px-3">Event Key Name</th>
                                      <th className="py-2.5 px-3">Associated ID/Parameter</th>
                                      <th className="py-2.5 px-3">Parameters Array Payload</th>
                                      <th className="py-2.5 px-3">Tracking Server Link</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {gaCapturedLogs.length === 0 ? (
                                      <tr>
                                        <td colSpan={5} className="py-6 text-center text-zinc-600 text-[11px]">
                                          No events intercepted in this browser session. Hover/click menu pathways, search listings, or initiate deal flows to trigger real-time Google Analytics events!
                                        </td>
                                      </tr>
                                    ) : (
                                      gaCapturedLogs.map((log, idx) => (
                                        <tr key={idx} className="hover:bg-white/[0.02]">
                                          <td className="py-2.5 px-3 text-zinc-500">{log.timestamp}</td>
                                          <td className="py-2.5 px-3 font-semibold text-amber-400">{log.eventName}</td>
                                          <td className="py-2.5 px-3 text-zinc-300 truncate max-w-[120px]">
                                            {log.params.username || log.params.target || log.params.page_title || 'General App Trigger'}
                                          </td>
                                          <td className="py-2.5 px-3 text-zinc-500 font-mono text-[9px] max-w-[200px] truncate" title={JSON.stringify(log.params)}>
                                            {JSON.stringify(log.params)}
                                          </td>
                                          <td className="py-2.5 px-3">
                                            <span className="text-zinc-600 animate-pulse text-[9px] font-bold">
                                              dispatched // ssl
                                            </span>
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
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
      <footer className="bg-[#0c0c0d] border-t border-white/[0.08] py-12 text-left mt-12 text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Top Brand & Disclaimer Row */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 border-b border-white/[0.04] pb-8">
            <div className="flex items-center space-x-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center">
                <span className="text-white font-extrabold text-xs tracking-wider">ID</span>
              </div>
              <span className="text-lg font-display font-black tracking-tight text-white uppercase">IDsvault</span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-4xl font-sans">
              <strong>Business Disclaimer:</strong> IDsvault is an independent digital brokerage platform for premium digital identities. We coordinate human supervised client-to-client switchovers with private verified verification methods. We do not offer escrow or instant cashier checkouts.
            </p>
          </div>

          {/* Nav Links Row (Horizontal) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-2">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-xs">
              <span className="text-[10px] uppercase tracking-widest font-mono text-zinc-500 font-extrabold mr-2">Registry & Guides:</span>
              <button onClick={() => { setActiveTab('browse'); setSelectedId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer font-mono text-[11px] text-zinc-400">Browse Catalog</button>
              <span className="text-zinc-700 font-mono">•</span>
              <button onClick={() => { setActiveTab('sell'); setSelectedId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer font-mono text-[11px] text-zinc-400">Submit Handle</button>
              <span className="text-zinc-700 font-mono">•</span>
              <button onClick={() => { setActiveTab('request'); setSelectedId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer font-mono text-[11px] text-zinc-400">Commission Hunt</button>
              <span className="text-zinc-700 font-mono">•</span>
              <button onClick={() => { setActiveTab('how'); setSelectedId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer font-mono text-[11px] text-zinc-400">Bespoke Transfer Flow</button>
              <span className="text-zinc-700 font-mono">•</span>
              <button onClick={() => { setActiveTab('faq'); setSelectedId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer font-mono text-[11px] text-zinc-400">Security FAQs</button>
            </div>
          </div>

          {/* Legal Policies Row (Horizontal) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/[0.04] pb-8">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
              <span className="text-[10px] uppercase tracking-widest font-mono text-zinc-500 font-extrabold mr-2">Legal Standards:</span>
              <button onClick={() => { setActiveTab('terms'); setSelectedId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors text-zinc-400 cursor-pointer">Terms of Service</button>
              <span className="text-zinc-700">•</span>
              <button onClick={() => { setActiveTab('privacy'); setSelectedId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors text-zinc-400 cursor-pointer">Privacy Policy</button>
              <span className="text-zinc-700">•</span>
              <button onClick={() => { setActiveTab('refund'); setSelectedId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors text-zinc-400 cursor-pointer">Refund Policy</button>
              <span className="text-zinc-700">•</span>
              <button onClick={() => { setActiveTab('acceptable-use'); setSelectedId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors text-zinc-400 cursor-pointer">Acceptable Use Policy</button>
              <span className="text-zinc-700">•</span>
              <button onClick={() => { setActiveTab('trademark-policy'); setSelectedId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors text-zinc-400 cursor-pointer">Trademark & IP Policy</button>
              <span className="text-zinc-700">•</span>
              <button onClick={() => { setActiveTab('anti-fraud'); setSelectedId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors text-zinc-400 cursor-pointer">Anti-Fraud Policy</button>
              <span className="text-zinc-700">•</span>
              <button onClick={() => { setActiveTab('listing-eligibility'); setSelectedId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors text-zinc-400 cursor-pointer">Listing Eligibility Standards</button>
            </div>
          </div>

          <div className="pt-2 md:flex md:justify-between md:items-center space-y-4 md:space-y-0 text-left">
            <div className="space-y-2 max-w-xl">
              <p className="text-[9px] text-zinc-600 leading-normal font-mono">
                Disclaimer: IDsvault is an independent coordinator. We do not officially represent Meta Platforms, Instagram, X Corp, or Telegram Inc. All third party assets rights reside with original registrants. Digital acquisitions naturally carry platform-dependency risk. Manual systems reduce standard loopholes but do not provide absolute immunity against social networks administrative reclaiming.
              </p>
            </div>
            <div className="text-left md:text-right space-y-1">
              <p className="text-xs text-zinc-500 font-mono">
                &copy; {new Date().getFullYear()} IDsvault Corporation. Broker-Assisted Switchover Pathways.
              </p>
              <p className="text-[10px] text-zinc-600 font-mono">
                Compliance: <span className="text-zinc-500">compliance@idsvault.vip</span>
              </p>
            </div>
          </div>

        </div>
      </footer>

      {/* High-Trust Secure WhatsApp Transition Modal */}
      {whatsappConfirmOpen && (
        <div id="whatsapp-handover-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030303]/95 backdrop-blur-md">
          {handoffLoading ? (
            <div className="w-full max-w-sm bg-[#0f0f10] border border-white/10 rounded-2xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden animate-fadeIn">
              <div className="absolute -top-10 -right-10 h-32 w-32 bg-gradient-to-br from-blue-500/10 to-transparent blur-2xl pointer-events-none" />
              <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 relative">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="absolute inset-0 rounded-full border border-blue-500/10 animate-ping opacity-30" />
              </div>
              <div className="space-y-3">
                <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono">Preparing Secure Broker Request...</h3>
                <p className="text-xs text-zinc-400 font-mono tracking-tight leading-relaxed">{handoffProgress}</p>
              </div>
              <div className="w-full bg-[#050505] h-1.5 rounded-full overflow-hidden border border-white/5 relative">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ 
                    width: handoffProgress.includes('coord') ? '25%' : 
                           handoffProgress.includes('routing') ? '50%' : 
                           handoffProgress.includes('variables') ? '75%' : '95%' 
                  }} 
                />
              </div>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest font-bold">GETIDS SECURE TRANSIT LINK</p>
            </div>
          ) : (
            <div className="w-full max-w-xl bg-[#0f0f10] border border-white/10 rounded-2xl p-6 sm:p-8 relative space-y-6 shadow-2xl overflow-y-auto max-h-[95vh] text-left">
            
            {/* Close button */}
            <button
              onClick={() => {
                setWhatsappConfirmOpen(false);
                setActiveTab('home');
              }}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close Official Handover Modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Core Header with Trust Shield and Status flow */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 tracking-wider uppercase rounded font-mono">
                    SECURE BROKERAGE PROTOCOL v1.4
                  </span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">
                  {whatsappConfirmTitle}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-serif italic">
                  {whatsappConfirmSubtitle}
                </p>
              </div>
            </div>

            {/* Simulated Handover Safe Audits steps to build deep TRUST */}
            <div className="bg-[#050505] p-4 rounded-xl border border-white/5 space-y-2 text-xs text-zinc-400 font-mono">
              <div className="flex items-center justify-between">
                <span>1. Form Parameters Serialization:</span>
                <span className="text-emerald-400 font-bold">[✔] METADATA SECURED</span>
              </div>
              <div className="flex items-center justify-between">
                <span>2. Brokerage Validation Key Hash:</span>
                <span className="text-emerald-400 font-bold">[✔] INITIALIZED</span>
              </div>
              <div className="flex items-center justify-between">
                <span>3. Manual Handover Desk Gateway:</span>
                <span className="text-yellow-400 animate-pulse font-bold">[●] ESTABLISHING ROOM</span>
              </div>
            </div>

            {/* Trusted Pre-filled Template Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                  Official Communication Template
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    const fallbackCopy = () => {
                      try {
                        const el = document.createElement('textarea');
                        el.value = whatsappConfirmMsg;
                        document.body.appendChild(el);
                        el.select();
                        document.execCommand('copy');
                        document.body.removeChild(el);
                        setWhatsappConfirmCopied(true);
                        setTimeout(() => setWhatsappConfirmCopied(false), 2000);
                      } catch (err) {
                        console.warn('Fallback clipboard copy failed', err);
                      }
                    };

                    if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                      try {
                        await navigator.clipboard.writeText(whatsappConfirmMsg);
                        setWhatsappConfirmCopied(true);
                        setTimeout(() => setWhatsappConfirmCopied(false), 2000);
                      } catch (e) {
                        console.warn('Navigator clipboard API failed, running fallback copy', e);
                        fallbackCopy();
                      }
                    } else {
                      fallbackCopy();
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold tracking-tight uppercase transition-colors cursor-pointer"
                >
                  {whatsappConfirmCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied! Ready to Paste</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>Copy Template Text</span>
                    </>
                  )}
                </button>
              </div>

              {/* Box of the WhatsApp Text Template for previewing */}
              <div className="relative group">
                <pre className="w-full bg-[#050505] border border-white/10 rounded-xl p-4 text-[11px] leading-relaxed text-zinc-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {whatsappConfirmMsg}
                </pre>
                <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none rounded-b-xl" />
              </div>
              <p className="text-[10px] text-zinc-400 leading-snug">
                ⚠️ <span className="text-zinc-300 font-bold">Direct Dispatch:</span> Clicking below establishes a secure chat. Your device's native WhatsApp client will launch automatically. If blocked by popups, please tap the button below directly to initiate communication.
              </p>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={generateWhatsAppLink(whatsappConfirmMsg)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setWhatsappConfirmOpen(false);
                  setActiveTab('home');
                }}
                className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-extrabold text-xs tracking-widest uppercase rounded-xl transition-all shadow-lg hover:shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/20 text-center"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Establish Official Deal Room</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => {
                  setWhatsappConfirmOpen(false);
                  setActiveTab('home');
                }}
                className="px-6 py-4 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-400 hover:text-white font-extrabold text-xs tracking-widest uppercase rounded-xl transition-colors cursor-pointer text-center"
              >
                Cancel Handover
              </button>
            </div>
            </div>
          )}
        </div>
      )}

      {/* Sticky Mobile Bottom Floating Action Shield */}
      {selectedId && currentListing && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-[#0a0a0c]/90 backdrop-blur-md z-40 lg:hidden flex items-center justify-between border-t border-white/5 gap-4">
          <div className="text-left">
            <span className="text-[9px] uppercase font-bold text-zinc-500 block font-mono">Handover Brokerage</span>
            <span className="text-sm font-mono font-black text-white block">@{currentListing.username}</span>
          </div>
          <button
            onClick={() => {
              setBuyerOffer(currentListing.askingPrice.toString());
              setDealModalOpen(true);
            }}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold font-mono tracking-wider uppercase shadow-xl transition-all cursor-pointer active:scale-95 shrink-0"
          >
            Talk to Broker
          </button>
        </div>
      )}

    </div>
  );
}
