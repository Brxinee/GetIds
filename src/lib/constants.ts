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
    q: "How does the secure transfer work?", 
    a: "We manually coordinate all device details and recovery email switchovers in a supervised private escrow environment. Our brokers examine platform logs and lock recovery pathways to guarantee 100% security with zero backdoor risks." 
  },
  { 
    q: "Why pay IDsvault instead of the seller directly?", 
    a: "Direct buying is highly susceptible to scams, recovery recaptures, or payment fraud. IDsvault acts as an official neutral trustee. We hold buyer funds in protected bank corridors and verify all recovery coordinates are locked down before releasing any seller payouts." 
  },
  { 
    q: "What if the transfer fails or platform locks occur?", 
    a: "All buyer funds remain in our protected custody. If a seller fails handovers or cannot verify immediate control, the transaction is canceled immediately and your funds are refunded 100% with no hidden fees." 
  },
  { 
    q: "How are sellers vetted and verified?", 
    a: "Sellers must submit multi-factor control proofs, platform configuration logs, and clear registration checks. Our internal brokerage desk manually validates administrative control of every handle before approving any public listing." 
  },
  { 
    q: "What qualifies as premium on IDsvault?", 
    a: "We accept short handles (under 6 characters), generic dictionary labels, and brandable industry terms (e.g., finance, media, crypto). Random numeric structures, spam IDs, or direct trademark impersonations are strictly blacklisted to protect registry quality." 
  },
  { 
    q: "Can buyers contact sellers directly?", 
    a: "No. Direct buyer-seller interactions are prohibited to prevent out-of-bounds dealing, coordinate leaks, and payment scams. All communications must run through supervised IDsvault broker rooms for your safety." 
  },
  { 
    q: "How long do deals and transfers take?", 
    a: "Official deal rooms are initiated within 2 to 4 hours of checking out. The entire transfer, including network security periods and holding times, completes safely within 24 to 48 hours." 
  },
  { 
    q: "What if a listing is discovered to be fake?", 
    a: "Our strict listing gate prevents invalid registrations from reaching the marketplace. If a seller's credentials change post-listing, we instantly freeze the listing, reject the seller registration, and return any buyer deposits." 
  },
  { 
    q: "Can IDsvault source specific unavailable usernames?", 
    a: "Yes. Our bespoke Outreach Sourcing Desk holds proprietary channels to map, contact, and negotiate digital acquisitions from inactive private registrants worldwide. Start a 'Commission Hunt' request to deploy an agent." 
  }
];
