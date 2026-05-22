import { ListingItem, SellerSubmission, DealItem } from '../types';

export const ADMIN_PHONE = '919999999999'; // Unified broker phone in International/Indian format

// Initial High-Grade Vault Inventory Seeds (Represented in INR)
export const INITIAL_INV_SEEDS: ListingItem[] = [
  { 
    id: '1', 
    username: 'alpha', 
    platform: 'instagram', 
    category: '3-Letter OG', 
    askingPrice: 145000, 
    rarityScore: 'Grail', 
    verificationStatus: true, 
    listingStatus: 'live', 
    featured: true, 
    brokerNotes: 'Highly pristine og handle. Verified clean ownership history with original registration logs.', 
    priceDisplayType: 'MAKE_OFFER' 
  },
  { 
    id: '2', 
    username: 'vertex', 
    platform: 'x', 
    category: 'Dictionary Word', 
    askingPrice: 89000, 
    rarityScore: 'Legendary', 
    verificationStatus: true, 
    listingStatus: 'live', 
    featured: true, 
    brokerNotes: 'Clean status, perfect brand name. Super fast secure transfer. Highly recommended for crypto/tech teams.', 
    priceDisplayType: 'PRICE_ON_REQUEST' 
  },
  { 
    id: '3', 
    username: 'omega', 
    platform: 'telegram', 
    category: 'Universal Brand', 
    askingPrice: 120000, 
    rarityScore: 'Ultra Rare', 
    verificationStatus: true, 
    listingStatus: 'live', 
    featured: true, 
    brokerNotes: 'Includes matching broadcast channels. High density search volume.', 
    priceDisplayType: 'BROKER_VALUATION_RANGE',
    estimatedRangeMin: 110000,
    estimatedRangeMax: 135000
  },
  { 
    id: '4', 
    username: 'solis', 
    platform: 'brandable', 
    category: 'C-Suite Asset', 
    askingPrice: 45000, 
    rarityScore: 'Rare', 
    verificationStatus: true, 
    listingStatus: 'live', 
    featured: true, 
    brokerNotes: 'Premium enterprise asset including matching .in and .com domains setup.', 
    priceDisplayType: 'HOT_DEMAND' 
  },
  { 
    id: '5', 
    username: 'quantum', 
    platform: 'x', 
    category: 'Science Theme', 
    askingPrice: 165000, 
    rarityScore: 'Grail', 
    verificationStatus: true, 
    listingStatus: 'live', 
    featured: false, 
    brokerNotes: 'Excellent high authority asset with pristine past registration audit records.', 
    priceDisplayType: 'RARITY_SCORE',
    rarityTags: ['ULTRA RARE', 'OG SHORT HANDLE', 'BRANDABLE']
  },
  { 
    id: '6', 
    username: 'dev', 
    platform: 'instagram', 
    category: '3-Letter Tech', 
    askingPrice: 250000, 
    rarityScore: 'Grail', 
    verificationStatus: true, 
    listingStatus: 'live', 
    featured: false, 
    brokerNotes: 'Extremely rare developer asset. Perfect positioning for engineering leads.', 
    priceDisplayType: 'CATEGORY_VALUE',
    categoryDescriptor: 'Premium Finance Handle'
  },
  { 
    id: '7', 
    username: 'flow', 
    platform: 'telegram', 
    category: 'Dictionary Word', 
    askingPrice: 68000, 
    rarityScore: 'Rare', 
    verificationStatus: true, 
    listingStatus: 'live', 
    featured: false, 
    brokerNotes: 'Perfect brand name for fintech or payment integration startup projects.', 
    priceDisplayType: 'STARTING_BID' 
  },
  { 
    id: '8', 
    username: 'meta', 
    platform: 'custom', 
    category: 'Custom Brand Handle', 
    askingPrice: 320000, 
    rarityScore: 'Legendary', 
    verificationStatus: true, 
    listingStatus: 'live', 
    featured: false, 
    brokerNotes: 'Premium corporate web asset bundle. Direct transfers managed in private deal rooms.', 
    priceDisplayType: 'CONFIDENTIAL' 
  }
];

// Initial Submissions Seeds
export const INITIAL_SUBMISSIONS_SEEDS: SellerSubmission[] = [
  { 
    id: 'sub-1', 
    username: 'sigma', 
    platform: 'instagram', 
    category: '5-Letter Clean', 
    askingPrice: 32000, 
    sellerName: 'Rohan Sharma', 
    whatsapp: '+919999011111', 
    ownershipConfirmed: true, 
    status: 'pending' 
  },
  { 
    id: 'sub-2', 
    username: 'volt', 
    platform: 'x', 
    category: '4-Letter Tech', 
    askingPrice: 64000, 
    sellerName: 'Aditi Nair', 
    whatsapp: '+918888022222', 
    ownershipConfirmed: true, 
    status: 'pending' 
  }
];

// Initial Active Deals Seeds
export const INITIAL_DEALS_SEEDS: DealItem[] = [
  { 
    id: 'deal-1', 
    username: 'alpha', 
    platform: 'instagram', 
    agreedPrice: 145000, 
    brokerageFee: 36250, 
    payout: 108750, 
    status: 'VERIFYING', 
    buyerName: 'Vijay Mallik', 
    whatsapp: '+919876543210' 
  },
  { 
    id: 'deal-2', 
    username: 'omega', 
    platform: 'telegram', 
    agreedPrice: 120000, 
    brokerageFee: 30000, 
    payout: 90000, 
    status: 'TRANSFER_LIVE', 
    buyerName: 'Priya Iyer', 
    whatsapp: '+918765432109' 
  }
];

export const FAQ_SEEDS = [
  { 
    q: "Is IDsvault officially affiliated with social media networks?", 
    a: "No. IDsvault operates as a completely independent, neutral digital escrow manual brokerage agency. We are not officially endorsed or affiliated with Meta Platforms, Instagram, X Corp, or Telegram." 
  },
  { 
    q: "Why use manual brokerage instead of direct APIs?", 
    a: "Direct automatic API handovers can trigger automated platform freezes or ban filters on major networks. Our experienced brokers manually coordinate ownership handover processes, isolating recovery backdoors safely." 
  },
  { 
    q: "What happens if a seller fails the verification queue?", 
    a: "The escrow process is immediately paused, and any buyer collateral deposits are held or refunded entirely under standard legal protocols." 
  },
  { 
    q: "How long does a standard transfer take?", 
    a: "Vetted transactions typically close inside 24 to 48 hours depending on platform-specific authentication and device transfer delay settings." 
  }
];
