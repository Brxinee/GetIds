/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { ListingItem, SellerSubmission, DealItem } from '../types';

// Supabase Environment variables
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

// Initialize client if credentials are provided
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

/**
 * SQL SCHEMA BLUEPRINT FOR USER REFERENCE:
 * 
 * -- Create Listings Table
 * create table public.listings (
 *   id text primary key,
 *   username text not null,
 *   platform text not null,
 *   category text not null,
 *   asking_price numeric not null,
 *   min_price numeric,
 *   rarity_score text not null,
 *   verification_status boolean default true,
 *   listing_status text not null,
 *   featured boolean default false,
 *   broker_notes text,
 *   price_display_type text default 'MAKE_OFFER',
 *   estimated_range_min numeric,
 *   estimated_range_max numeric,
 *   category_descriptor text,
 *   rarity_tags text[],
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- Create Submissions Table
 * create table public.submissions (
 *   id text primary key,
 *   username text not null,
 *   platform text not null,
 *   category text not null,
 *   asking_price numeric not null,
 *   min_price numeric,
 *   seller_name text not null,
 *   whatsapp text not null,
 *   ownership_confirmed boolean default false,
 *   status text not null,
 *   upload_proof_name text,
 *   upload_proof_data text,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- Create Deals Table
 * create table public.deals (
 *   id text primary key,
 *   username text not null,
 *   platform text not null,
 *   agreed_price numeric not null,
 *   brokerage_fee numeric not null,
 *   payout numeric not null,
 *   status text not null,
 *   buyer_name text not null,
 *   whatsapp text not null,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 */

export const isSupabaseConnected = () => {
  return supabase !== null;
};

// Map ListingItem DB fields to TypeScript object
const mapListingFromDB = (row: any): ListingItem => ({
  id: row.id,
  username: row.username,
  platform: row.platform,
  category: row.category,
  askingPrice: Number(row.asking_price),
  minPrice: row.min_price ? Number(row.min_price) : undefined,
  rarityScore: row.rarity_score,
  verificationStatus: row.verification_status,
  listingStatus: row.listing_status,
  featured: row.featured,
  brokerNotes: row.broker_notes,
  priceDisplayType: row.price_display_type || 'MAKE_OFFER',
  estimatedRangeMin: row.estimated_range_min ? Number(row.estimated_range_min) : undefined,
  estimatedRangeMax: row.estimated_range_max ? Number(row.estimated_range_max) : undefined,
  categoryDescriptor: row.category_descriptor,
  rarityTags: row.rarity_tags || []
});

// Map ListingItem object to DB fields
const mapListingToDB = (item: ListingItem) => ({
  id: item.id,
  username: item.username,
  platform: item.platform,
  category: item.category,
  asking_price: item.askingPrice,
  min_price: item.minPrice,
  rarity_score: item.rarityScore,
  verification_status: item.verificationStatus,
  listing_status: item.listingStatus,
  featured: item.featured,
  broker_notes: item.brokerNotes,
  price_display_type: item.priceDisplayType || 'MAKE_OFFER',
  estimated_range_min: item.estimatedRangeMin,
  estimated_range_max: item.estimatedRangeMax,
  category_descriptor: item.categoryDescriptor,
  rarity_tags: item.rarityTags || []
});

// Map SellerSubmission DB fields to TypeScript object
const mapSubmissionFromDB = (row: any): SellerSubmission => ({
  id: row.id,
  username: row.username,
  platform: row.platform,
  category: row.category,
  askingPrice: Number(row.asking_price),
  minPrice: row.min_price ? Number(row.min_price) : undefined,
  sellerName: row.seller_name,
  whatsapp: row.whatsapp,
  ownershipConfirmed: row.ownership_confirmed,
  status: row.status,
  verificationChecklist: row.verification_checklist || {},
  uploadProofName: row.upload_proof_name,
  uploadProofData: row.upload_proof_data
});

// Map SellerSubmission object to DB fields
const mapSubmissionToDB = (sub: SellerSubmission) => ({
  id: sub.id,
  username: sub.username,
  platform: sub.platform,
  category: sub.category,
  asking_price: sub.askingPrice,
  min_price: sub.minPrice,
  seller_name: sub.sellerName,
  whatsapp: sub.whatsapp,
  ownership_confirmed: sub.ownershipConfirmed,
  status: sub.status,
  verification_checklist: sub.verificationChecklist || {},
  upload_proof_name: sub.uploadProofName,
  upload_proof_data: sub.uploadProofData
});

// Map DealItem DB fields to TypeScript object
const mapDealFromDB = (row: any): DealItem => ({
  id: row.id,
  username: row.username,
  platform: row.platform,
  agreedPrice: Number(row.agreed_price),
  brokerageFee: Number(row.brokerage_fee),
  payout: Number(row.payout),
  status: row.status,
  buyerName: row.buyer_name,
  whatsapp: row.whatsapp
});

// Map DealItem object to DB fields
const mapDealToDB = (deal: DealItem) => ({
  id: deal.id,
  username: deal.username,
  platform: deal.platform,
  agreed_price: deal.agreedPrice,
  brokerage_fee: deal.brokerageFee,
  payout: deal.payout,
  status: deal.status,
  buyer_name: deal.buyerName,
  whatsapp: deal.whatsapp
});

/* ==========================================
   CRUD INTERFACES WITH FALLBACK TO LOCALSTORAGE
   ========================================== */

export const getStoredListings = (fallback: ListingItem[]): ListingItem[] => {
  const saved = localStorage.getItem('ids_listings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse stored listings, falling back', e);
      return fallback;
    }
  }
  return fallback;
};

export const getStoredSubmissions = (fallback: SellerSubmission[]): SellerSubmission[] => {
  const saved = localStorage.getItem('ids_submissions');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse stored submissions, falling back', e);
      return fallback;
    }
  }
  return fallback;
};

export const getStoredDeals = (fallback: DealItem[]): DealItem[] => {
  const saved = localStorage.getItem('ids_deals');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse stored deals, falling back', e);
      return fallback;
    }
  }
  return fallback;
};

// Fetch Listings
export const dbFetchListings = async (fallback: ListingItem[]): Promise<ListingItem[]> => {
  if (!supabase) {
    return getStoredListings(fallback);
  }
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.warn('Supabase fetch error, using localStorage fallback', error);
      return getStoredListings(fallback);
    }
    
    if (data && data.length > 0) {
      return data.map(mapListingFromDB);
    }
    return getStoredListings(fallback);
  } catch (err) {
    console.warn('Error reading from database, using localStorage fallback', err);
    return getStoredListings(fallback);
  }
};

// Save Listing
export const dbSaveListing = async (item: ListingItem): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const payload = mapListingToDB(item);
    const { error } = await supabase
      .from('listings')
      .upsert(payload);
    
    if (error) {
      console.error('Supabase write error', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error writing to database', err);
    return false;
  }
};

// Delete Listing
export const dbDeleteListing = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Supabase delete error', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error deleting from database', err);
    return false;
  }
};

// Fetch Submissions
export const dbFetchSubmissions = async (fallback: SellerSubmission[]): Promise<SellerSubmission[]> => {
  if (!supabase) {
    return getStoredSubmissions(fallback);
  }
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.warn('Supabase fetch submissions error', error);
      return getStoredSubmissions(fallback);
    }
    
    if (data && data.length > 0) {
      return data.map(mapSubmissionFromDB);
    }
    return getStoredSubmissions(fallback);
  } catch (err) {
    console.warn('Error reading submissions DB', err);
    return getStoredSubmissions(fallback);
  }
};

// Save Submission
export const dbSaveSubmission = async (sub: SellerSubmission): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const payload = mapSubmissionToDB(sub);
    const { error } = await supabase
      .from('submissions')
      .upsert(payload);
    
    if (error) {
      console.error('Supabase save submission error', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving submission DB', err);
    return false;
  }
};

// Delete Submission
export const dbDeleteSubmission = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Supabase delete submission error', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error deleting submission DB', err);
    return false;
  }
};

// Fetch Deals
export const dbFetchDeals = async (fallback: DealItem[]): Promise<DealItem[]> => {
  if (!supabase) {
    return getStoredDeals(fallback);
  }
  try {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.warn('Supabase fetch deals error', error);
      return getStoredDeals(fallback);
    }
    
    if (data && data.length > 0) {
      return data.map(mapDealFromDB);
    }
    return getStoredDeals(fallback);
  } catch (err) {
    console.warn('Error reading deals DB', err);
    return getStoredDeals(fallback);
  }
};

// Save Deal
export const dbSaveDeal = async (deal: DealItem): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const payload = mapDealToDB(deal);
    const { error } = await supabase
      .from('deals')
      .upsert(payload);
    
    if (error) {
      console.error('Supabase save deal error', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving deal DB', err);
    return false;
  }
};

// Delete Deal
export const dbDeleteDeal = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Supabase delete deal error', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error deleting deal DB', err);
    return false;
  }
};
