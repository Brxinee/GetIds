import { ADMIN_PHONE } from './constants';

export function generateWhatsAppLink(text: string): string {
  return `https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(text)}`;
}

export function buildBuyerMessage(params: {
  username: string;
  platform: string;
  displayPrice: string;
  offer: number;
  urgency: string;
  name: string;
  notes?: string;
}): string {
  return `Hi IDsvault, I want to acquire a premium digital asset.

📝 BROKER DEAL REQUEST
• Username: @${params.username.replace('@', '')}
• Platform: ${params.platform.toUpperCase()}
• Listed Status: ${params.displayPrice}
• My Offer: ₹${params.offer.toLocaleString('en-IN')}
• Urgency Level: ${params.urgency}
• Buyer Name: ${params.name}
• Buyer Message/Notes: ${params.notes || 'None'}

Please establish a private deal room on WhatsApp. I am prepared to initiate standard escrow audit checks.`;
}

export function buildSellerMessage(params: {
  username: string;
  platform: string;
  category: string;
  askingPrice: number;
  minPrice?: number;
  sellerName: string;
  brokerageRate: number;
}): string {
  return `Hi IDsvault, I want to list a premium digital ID.

📤 NEW SELLER SUBMISSION
• Username: @${params.username.replace('@', '')}
• Platform: ${params.platform.toUpperCase()}
• Category Tag: ${params.category}
• Target Asking: ₹${params.askingPrice.toLocaleString('en-IN')}
• Direct Min: ${params.minPrice ? `₹${params.minPrice.toLocaleString('en-IN')}` : 'Not Specified'}
• Seller Name: ${params.sellerName}

I understand that IDsvault takes a ${params.brokerageRate}% fee on final successfully completed escrow amounts. Please add my handle to the vetting queue.`;
}

export function buildRequestMessage(params: {
  desiredUsername: string;
  platform: string;
  budget: number;
  urgency: string;
  alternatives?: string;
  whatsapp: string;
}): string {
  return `Hi IDsvault, I want to commission an acquisition request.

🎯 TARGET ACQUISITION HUNT
• Desired Handle: @${params.desiredUsername.replace('@', '')}
• Platform: ${params.platform.toUpperCase()}
• Maximum Budget: ₹${params.budget.toLocaleString('en-IN')}
• Urgent Rank: ${params.urgency}
• Variations: ${params.alternatives || 'None'}
• Contact Phone: ${params.whatsapp}

Please negotiate with the current registrant dynamically. I understand IDsvault will charge brokerage when the handover completes.`;
}
