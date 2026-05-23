import { ADMIN_PHONE } from './constants';

export function generateWhatsAppLink(text: string): string {
  // Use the verified customer WhatsApp QR shortcode link to maximize trust and instant delivery
  return `https://wa.me/qr/5BW2DSNO53KXJ1?text=${encodeURIComponent(text)}`;
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
  return `🔒 BROKER-ASSISTED PAYMENTS INITIATION REQUEST

Dear IDsvault Desk,

I would like to initiate a transaction to acquire the following premium asset under a structured payment process with human broker supervision:

• Target Username/Asset: @${params.username.replace('@', '')}
• Platform: ${params.platform.toUpperCase()}
• Listing Display Status: ${params.displayPrice}
• Submitted Binding Offer: ₹${params.offer.toLocaleString('en-IN')}
• Requested Priority: ${params.urgency || 'Standard'}
• Buyer Representative: ${params.name}
• Specific Deal Instructions: ${params.notes || 'No custom notes provided'}

I am ready to complete the standard verification of funds. Please establish a private, verified 3-party Broker-Assisted Payment Workflow deal room with a senior broker to manage the Supervised Transfer Flow safely. Thank you.`;
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
  return `📤 SELLER ASSET REGISTRATION & VERIFICATION DECK

Dear IDsvault Desk,

I am the registrant/authorized provider of the following digital asset. Please list this handle in the digital brokerage inventory:

• Target Listing Handle: @${params.username.replace('@', '')}
• Platform Network: ${params.platform.toUpperCase()}
• Category Tag classification: ${params.category}
• Target Asking Price: ₹${params.askingPrice.toLocaleString('en-IN')}
• Minimum Acceptable Limit: ${params.minPrice ? `₹${params.minPrice.toLocaleString('en-IN')}` : 'Reserved Value Only'}
• Verified Owner Name: ${params.sellerName}

I understand and consent to the standard IDsvault broker-assisted transfer terms (comprising a ${params.brokerageRate}% transaction fee upon successfully coordinated, supervised transfer). Please connect me to a manual broker on this channel to complete our seller verification workflow.`;
}

export function buildRequestMessage(params: {
  desiredUsername: string;
  platform: string;
  budget: number;
  urgency: string;
  alternatives?: string;
  whatsapp: string;
}): string {
  return `🎯 CONFIDENTIAL TARGET ACQUISITION & OUTREACH COMMISSION

Dear IDsvault Desk,

I am commissioning IDsvault to coordinate a manual, neutral acquisition outreach for the following target handle:

• Requested Username: @${params.desiredUsername.replace('@', '')}
• Platform Network: ${params.platform.toUpperCase()}
• Maximum Allocated Budget: ₹${params.budget.toLocaleString('en-IN')}
• Priority Ranking: ${params.urgency || 'Standard'}
• Alternative Handles permitted: ${params.alternatives || 'Strictly target only'}
• Fast-track Contact Phone: ${params.whatsapp}

Please inspect registry records and contact the current registrant using your secure intermediary outreach channels. I understand brokerage is only payable upon successful structured contract closure and supervised transfer flow.`;
}

