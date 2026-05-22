export type PlatformType = 'instagram' | 'x' | 'telegram' | 'brandable' | 'custom';

export type RarityType = 'Grail' | 'Legendary' | 'Ultra Rare' | 'Rare' | 'Common';

export type ListingStatusType = 'pending_verification' | 'live' | 'paused' | 'sold' | 'rejected';

export type DealStatusType = 'NEW' | 'VERIFYING' | 'LIVE' | 'NEGOTIATING' | 'PAYMENT_RECEIVED' | 'TRANSFER_LIVE' | 'COMPLETED' | 'DISPUTE';

export type PriceDisplayType = 
  | 'MAKE_OFFER' 
  | 'PRICE_ON_REQUEST' 
  | 'BROKER_VALUATION_RANGE' 
  | 'HOT_DEMAND' 
  | 'RARITY_SCORE' 
  | 'CATEGORY_VALUE' 
  | 'STARTING_BID' 
  | 'CONFIDENTIAL';

export interface ListingItem {
  id: string;
  username: string;
  platform: PlatformType;
  category: string;
  askingPrice: number;
  minPrice?: number;
  description?: string;
  rarityScore: RarityType;
  verificationStatus: boolean;
  listingStatus: ListingStatusType;
  featured: boolean;
  brokerNotes?: string;
  
  // Custom display strategies
  priceDisplayType?: PriceDisplayType;
  estimatedRangeMin?: number;
  estimatedRangeMax?: number;
  categoryDescriptor?: string;
  rarityTags?: string[];
}

export interface SellerSubmission {
  id: string;
  username: string;
  platform: PlatformType;
  category: string;
  askingPrice: number;
  minPrice?: number;
  sellerName: string;
  whatsapp: string;
  ownershipConfirmed: boolean;
  status: 'pending' | 'approved' | 'rejected';
  
  // High fidelity checklist
  verificationChecklist?: {
    ownershipChecked?: boolean;
    historyChecked?: boolean;
    backendRiskChecked?: boolean;
    approvedNotes?: string;
  };
  
  // ID Upload parameters
  uploadProofName?: string;
  uploadProofData?: string; // base64 or mockup URL
}

export interface BuyerLead {
  id: string;
  listingId: string;
  buyerName: string;
  whatsapp: string;
  offer: number;
  urgency: string;
  notes?: string;
}

export interface DealItem {
  id: string;
  username: string;
  platform: PlatformType;
  agreedPrice: number;
  brokerageFee: number;
  payout: number;
  status: DealStatusType;
  buyerName: string;
  whatsapp: string;
}

