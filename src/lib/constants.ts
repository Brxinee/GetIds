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
    q: "How does the secure transfer process work?", 
    a: "We coordinate a structured 6-step human broker-assisted handover. Once an offer is approved, we establish a private WhatsApp deal room to manually supervise ownership verification, coordinate registered backup mailboxes switchovers, close active session links, and release payouts once the buyer confirms complete control." 
  },
  { 
    q: "Why should I use IDsvault instead of contacting sellers directly?", 
    a: "Direct peer-to-peer deals carry significant fraud exposure such as account callback fraud (using original registration details), hidden backdoor recovery phone links, and payment double-spending. IDsvault acts as an independent intermediary broker, ensuring the buyer's funds are securely held in structured administration and only released to the seller after complete handover checkups." 
  },
  { 
    q: "How are sellers verified?", 
    a: "Sellers must complete a multi-point verification checklist, including submitting administrative control screenshots, platform configuration audits, and declaring legally binding ownership and rights of transfer prior to list approval." 
  },
  { 
    q: "What if the transfer fails?", 
    a: "If the seller is unable to complete the supervised credential transfer or fails our manual broker security checks, the deal is instantly canceled. Under our structured payment safety rules, 100% of the buyer's deposited funds are returned immediately with zero processing fees." 
  },
  { 
    q: "Does IDsvault guarantee future platform access?", 
    a: "No. Because third-party social media networks and domain registries are owned by private entities with independent terms of service, IDsvault makes no guarantees of future account retention, platform policy compliance, or continued ownership access. All risks following successful switchover reside with the buyer." 
  },
  { 
    q: "Are you affiliated with Instagram, X, or Telegram?", 
    a: "No. IDsvault is an entirely independent digital identity brokerage workspace. We are not officially represented by, endorsed by, or partnered with Meta Platforms, Instagram, X Corp, Telegram Inc, or any other third-party platform registry." 
  },
  { 
    q: "How long do deals usually take?", 
    a: "Most brokerage handovers are completed within 12 to 24 hours. The precise timeline depends on the responsiveness of both parties and the specific platform's security mechanisms. All sessions are expedited under standard business hours." 
  },
  { 
    q: "What types of usernames qualify as premium?", 
    a: "We accept highly rare short-form handles (typically under 6 characters), dictionary words, memorable acronyms, established niche community handles, or prime geographic domain pairs. Generic handles with random numeric strings are ineligible." 
  },
  { 
    q: "What if a seller provides inaccurate information?", 
    a: "Sellers are bound by legally strict declarations. If our brokers detect falsification of credentials, hidden registration claims, or active disputes mid-transaction, the seller listing is instantly deactivated, the deal is canceled, and the seller is blacklisted." 
  },
  { 
    q: "How do payments work?", 
    a: "We handle payments through a supervised, structured brokerage method. Buyers allocate funds into a secure administration vault. The funds are held safely under broker observation and are only released to the seller after the buyer completes device testing and signs off on transfer confirmation." 
  }
];
