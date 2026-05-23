import React from 'react';
import { ShieldCheck, Check, ArrowUpRight, Flame, ShieldAlert, BadgeInfo } from 'lucide-react';
import { ListingItem } from '../types';

interface ListingCardProps {
  item: ListingItem;
  onClick: (id: string) => void;
  onQuickDeal?: (e: React.MouseEvent, item: ListingItem) => void;
  key?: React.Key;
}

export function formatINR(val?: number): string {
  if (val === undefined || isNaN(val)) return '₹0';
  return '₹' + val.toLocaleString('en-IN');
}

export function getDisplayPriceAndCTA(item: ListingItem): { displayPrice: string; subtitle: string; ctaLabel: string } {
  switch (item.priceDisplayType) {
    case 'PRICE_ON_REQUEST':
      return {
        displayPrice: 'Price on Request',
        subtitle: 'Official Broker Quote Only',
        ctaLabel: 'Request Price'
      };
    case 'BROKER_VALUATION_RANGE':
      const min = item.estimatedRangeMin || Math.round(item.askingPrice * 0.82);
      const max = item.estimatedRangeMax || Math.round(item.askingPrice * 1.12);
      return {
        displayPrice: `${formatINR(min)} – ${formatINR(max)}`,
        subtitle: 'Estimated Broker Value Range',
        ctaLabel: 'Submit Offer in Range'
      };
    case 'HOT_DEMAND':
      return {
        displayPrice: 'High Buyer Interest',
        subtitle: 'Direct Broker Assisted Transfer Only',
        ctaLabel: 'Acquire Secure Deal'
      };
    case 'RARITY_SCORE':
      return {
        displayPrice: 'Ultra-Rare Short Handle',
        subtitle: 'Vetted Premium Acquisition',
        ctaLabel: 'Direct Broker Handoff'
      };
    case 'CATEGORY_VALUE':
      return {
        displayPrice: item.categoryDescriptor || 'Brandable Premium Identity',
        subtitle: 'Exclusive Verified Asset',
        ctaLabel: 'Start Supervised Deal'
      };
    case 'STARTING_BID':
      return {
        displayPrice: `Floor Target: ${formatINR(item.askingPrice)}`,
        subtitle: 'Supervised Broker Valuation',
        ctaLabel: 'Submit Buyer Offer'
      };
    case 'CONFIDENTIAL':
      return {
        displayPrice: 'Confidential Valuation',
        subtitle: 'Private Broker-Assisted Transfer',
        ctaLabel: 'Request Confidential Deal'
      };
    case 'MAKE_OFFER':
    default:
      return {
        displayPrice: 'Make Offer • Live Handover',
        subtitle: 'Secure Deal Workflow',
        ctaLabel: 'Talk to Broker'
      };
  }
}

export default function ListingCard({ item, onClick, onQuickDeal }: ListingCardProps) {
  const { displayPrice, subtitle, ctaLabel } = getDisplayPriceAndCTA(item);

  // Compute luxury badges/tags
  const computedTags: string[] = [];
  computedTags.push('VERIFIED');
  
  if (item.featured) {
    computedTags.push('HOT');
  }

  if (item.username.length <= 3) {
    computedTags.push('OG');
    computedTags.push('SHORT');
  } else if (item.username.length === 4) {
    computedTags.push('SHORT');
  } else if (item.username.length <= 6) {
    computedTags.push('BRANDABLE');
  }
  
  const catLower = item.category.toLowerCase();
  if (catLower.includes('media') || catLower.includes('news') || catLower.includes('broadcast')) {
    computedTags.push('MEDIA');
  }
  if (catLower.includes('finance') || catLower.includes('crypto') || catLower.includes('wealth') || catLower.includes('money')) {
    computedTags.push('FINANCE');
  }
  if (catLower.includes('city') || catLower.includes('location') || catLower.includes('travel')) {
    computedTags.push('CITY');
  }
  if (catLower.includes('tech') || catLower.includes('dictionary') || catLower.includes('trending')) {
    computedTags.push('TRENDING');
  }

  if (item.rarityScore === 'Grail' || item.rarityScore === 'Legendary') {
    computedTags.push('PREMIUM');
  }

  const isHot = item.featured || item.rarityScore === 'Grail' || item.priceDisplayType === 'PRICE_ON_REQUEST';

  return (
    <div
      onClick={() => onClick(item.id)}
      className="group relative border border-white/[0.08] bg-[#0c0c0e] rounded-xl p-5 sm:p-6 flex flex-col justify-between hover:border-blue-500/50 hover:bg-[#101013] active:scale-[0.99] transition-all duration-300 cursor-pointer shadow-lg hover:shadow-blue-900/5 select-none overflow-hidden"
    >
      {/* Decorative radial subtle background glow on hover */}
      <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-blue-600/5 to-transparent blur-xl pointer-events-none transition-opacity opacity-0 group-hover:opacity-100" />
      
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 text-[8px] uppercase tracking-wider font-extrabold rounded ${
              item.rarityScore === 'Grail' 
                ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.05)]' 
                : item.rarityScore === 'Legendary' 
                ? 'text-purple-400 bg-purple-500/10 border border-purple-500/20' 
                : 'text-blue-400 bg-blue-500/10 border border-blue-500/20'
            }`}>
              {item.rarityScore}
            </span>
            {isHot && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[8px] uppercase tracking-wider font-extrabold text-red-400 bg-red-500/10 border border-red-500/20 rounded animate-pulse">
                <Flame className="w-2 h-2 shrink-0 fill-red-400" /> HOT
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-semibold bg-white/5 px-2 py-0.5 rounded border border-white/5">
            {item.platform}
          </span>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center space-x-1.5 flex-wrap">
            <h3 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white group-hover:text-blue-400 transition-colors">
              @{item.username}
            </h3>
            {item.verificationStatus && (
              <div className="flex items-center" title="Broker Vetted & Verified Owner">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-500 shrink-0 filter drop-shadow-[0_0_4px_rgba(16,185,129,0.3)]" />
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-1.5 text-[11px] text-zinc-400">
            <span className="font-semibold text-zinc-300">{item.category}</span>
            <span>•</span>
            <span className="text-[10px] uppercase text-emerald-400 font-mono flex items-center gap-1 font-extrabold tracking-wider bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded-md">
              <ShieldCheck className="w-3 h-3 shrink-0" /> Broker Reviewed Listing
            </span>
          </div>
        </div>

        {/* Beautiful tags display */}
        {computedTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {computedTags.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 text-[8px] font-mono tracking-widest text-[#a1a1aa] bg-zinc-900 border border-white/5 rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {item.brokerNotes && (
          <div className="mt-4 p-3.5 rounded bg-[#070708] border border-white/5 font-serif italic text-[11px] text-zinc-400 leading-relaxed font-light">
            &ldquo;{item.brokerNotes}&rdquo;
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex flex-col border-t border-white/5 pt-4">
          <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider mb-0.5">{subtitle}</span>
          <span className="text-base sm:text-lg font-mono font-bold text-white tracking-tight">{displayPrice}</span>
        </div>
        
        <div className="flex flex-col gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(item.id);
            }}
            className="w-full text-center py-2.5 bg-zinc-900 border border-white/10 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white rounded-lg text-[10px] uppercase font-extrabold tracking-widest transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>{ctaLabel}</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
