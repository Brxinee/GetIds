import React from 'react';
import { ShieldCheck, Check, ArrowUpRight } from 'lucide-react';
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
        subtitle: 'Luxury Asset Psychology',
        ctaLabel: 'Inquire Price'
      };
    case 'BROKER_VALUATION_RANGE':
      const min = item.estimatedRangeMin || Math.round(item.askingPrice * 0.85);
      const max = item.estimatedRangeMax || Math.round(item.askingPrice * 1.15);
      return {
        displayPrice: `${formatINR(min)} – ${formatINR(max)}`,
        subtitle: 'Estimated Broker Value',
        ctaLabel: 'Submit Range Offer'
      };
    case 'HOT_DEMAND':
      return {
        displayPrice: 'High Buyer Interest',
        subtitle: 'Negotiation In Progress',
        ctaLabel: 'Acquire Details'
      };
    case 'RARITY_SCORE':
      return {
        displayPrice: 'ULTRA RARE OG SHORT HANDLE',
        subtitle: 'Verified Brand Asset',
        ctaLabel: 'Offer Handover'
      };
    case 'CATEGORY_VALUE':
      return {
        displayPrice: item.categoryDescriptor || 'Premium Digital Asset',
        subtitle: 'Market Category Value',
        ctaLabel: 'Inspect Registry'
      };
    case 'STARTING_BID':
      return {
        displayPrice: `Starts from ${formatINR(item.askingPrice)}`,
        subtitle: 'Active Auction Bid Vibe',
        ctaLabel: 'Place Base Bid'
      };
    case 'CONFIDENTIAL':
      return {
        displayPrice: 'Confidential Pricing',
        subtitle: 'Direct Inquiries Only',
        ctaLabel: 'Direct Inquiry'
      };
    case 'MAKE_OFFER':
    default:
      return {
        displayPrice: 'Make an Offer',
        subtitle: 'Hides seller anchor pricing',
        ctaLabel: 'MAKE OFFER'
      };
  }
}

export default function ListingCard({ item, onClick, onQuickDeal }: ListingCardProps) {
  const { displayPrice, subtitle, ctaLabel } = getDisplayPriceAndCTA(item);

  return (
    <div
      onClick={() => onClick(item.id)}
      className="group relative border border-white/[0.08] bg-[#0c0c0e] rounded-xl p-5 sm:p-6 flex flex-col justify-between hover:border-zinc-700 hover:bg-[#111113] active:scale-[0.99] transition-all duration-300 cursor-pointer shadow-lg hover:shadow-blue-900/5 select-none"
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="px-2.5 py-0.5 text-[8px] uppercase tracking-wider font-extrabold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded">
            {item.rarityScore} Rank
          </span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-semibold">
            {item.platform}
          </span>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center space-x-1.5">
            <h3 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white group-hover:text-blue-400 transition-colors">
              @{item.username}
            </h3>
            {item.verificationStatus && (
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-500 shrink-0" title="Vetted Ownership Verified" />
            )}
          </div>
          
          <div className="flex items-center space-x-1.5 text-[11px] text-zinc-400">
            <span className="font-semibold text-zinc-300">{item.category}</span>
            <span>•</span>
            <span className="text-[10px] uppercase text-zinc-500 font-mono">Verified</span>
          </div>
        </div>

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
            className="w-full text-center py-2.5 bg-zinc-900 border border-white/10 group-hover:bg-blue-600 group-hover:border-blue-600 hover:text-white rounded-lg text-[10px] uppercase font-extrabold tracking-widest transition-all shadow-sm flex items-center justify-center gap-1"
          >
            <span>{ctaLabel}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
          
          {onQuickDeal && (
            <button
              onClick={(e) => onQuickDeal(e, item)}
              className="w-full py-1.5 bg-blue-950/20 text-[9px] uppercase text-blue-400 border border-blue-500/10 hover:border-blue-500/20 hover:bg-blue-950/40 font-bold rounded tracking-widest transition-colors"
            >
              [ START SECURE DEAL ]
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
