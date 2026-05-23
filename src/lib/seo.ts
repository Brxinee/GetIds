/**
 * IDsvault Production SEO, Schema Markup, and GA4 Analytics Manager
 */

export interface SEOMetadata {
  title: string;
  description: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  schemaType?: 'Organization' | 'WebSite' | 'WebPage' | 'FAQPage' | 'Offer';
  listingData?: {
    username: string;
    platform: string;
    category: string;
    price?: number;
  };
}

// 1. GA4 Google Analytics Integration
export const initGA = (measurementId = 'G-IDSVAULT88') => {
  if (typeof window === 'undefined') return;

  // Ensure old scripts are purged if the measurement ID changes
  const oldScript1 = document.getElementById('google-analytics-script');
  const oldScript2 = document.getElementById('google-analytics-config-script');
  if (oldScript1) oldScript1.remove();
  if (oldScript2) oldScript2.remove();

  const script1 = document.createElement('script');
  script1.async = true;
  script1.id = 'google-analytics-script';
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  const script2 = document.createElement('script');
  script2.id = 'google-analytics-config-script';
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}', { 'send_page_view': false });
  `;
  document.head.appendChild(script2);
};

// Log GA Event safely
export const logGAEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined') {
    if ((window as any).gtag) {
      (window as any).gtag('event', eventName, params);
    }
    console.log(`[GA EVENT LOGGED]: ${eventName}`, params);
    
    // Dispatch custom event for real-time reactive visual logs in workspace hub
    const event = new CustomEvent('ga_log_captured', {
      detail: {
        eventName,
        params,
        timestamp: new Date().toLocaleTimeString()
      }
    });
    window.dispatchEvent(event);
  }
};

// 2. Dynamic Technical SEO & Meta Tags Manager
export const updateSEO = (meta: SEOMetadata) => {
  if (typeof window === 'undefined') return;

  // Track canonical URL
  const canonicalUrl = meta.canonical || window.location.origin + window.location.pathname;

  // A. Set document title
  document.title = meta.title;

  // B. Manage main description
  let descTag = document.querySelector('meta[name="description"]');
  if (!descTag) {
    descTag = document.createElement('meta');
    descTag.setAttribute('name', 'description');
    document.head.appendChild(descTag);
  }
  descTag.setAttribute('content', meta.description);

  // C. Manage Canonical Tag
  let canonicalTag = document.querySelector('link[rel="canonical"]');
  if (!canonicalTag) {
    canonicalTag = document.createElement('link');
    canonicalTag.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalTag);
  }
  canonicalTag.setAttribute('href', canonicalUrl);

  // D. Manage Open Graph (Meta Platforms / OpenAI / LinkedIn)
  const ogTags = {
    'og:title': meta.ogTitle || meta.title,
    'og:description': meta.ogDescription || meta.description,
    'og:url': canonicalUrl,
    'og:type': 'website',
    'og:site_name': 'IDsvault',
    'og:image': 'https://get-ids-six.vercel.app/og-banner.png',
    'twitter:card': 'summary_large_image',
    'twitter:title': meta.ogTitle || meta.title,
    'twitter:description': meta.ogDescription || meta.description,
  };

  Object.entries(ogTags).forEach(([property, value]) => {
    let tag = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(property.startsWith('twitter:') ? 'name' : 'property', property);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', value);
  });

  // E. Dynamic JSON-LD Structured Schema Integration
  let schemaScript = document.getElementById('idsvault-schema-jsonld') as HTMLScriptElement;
  if (!schemaScript) {
    schemaScript = document.createElement('script');
    schemaScript.id = 'idsvault-schema-jsonld';
    schemaScript.type = 'application/ld+json';
    document.head.appendChild(schemaScript);
  }

  // Construct comprehensive multi index schema representing Organization, WebSite, FAQPage, Offer
  const schemaContext: Array<Record<string, any>> = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": "https://get-ids-six.vercel.app/#organization",
      "name": "IDsvault",
      "url": "https://get-ids-six.vercel.app/",
      "logo": "https://get-ids-six.vercel.app/logo.png",
      "description": "Premium digital identity brokerage marketplace for verified usernames, digital handles, and brandable identities with human broker-assisted transfers.",
      "sameAs": [
        "https://twitter.com/idsvault",
        "https://instagram.com/idsvault"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": "https://get-ids-six.vercel.app/#website",
      "name": "IDsvault",
      "url": "https://get-ids-six.vercel.app/",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://get-ids-six.vercel.app/?search={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
  ];

  if (meta.listingData) {
    // Inject dynamic search/offer schema representing listing purchase opportunity
    schemaContext.push({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": `@${meta.listingData.username} ${meta.listingData.platform} Account Username`,
      "description": `Acquire the premium brandable ${meta.listingData.category} handle: @${meta.listingData.username} on ${meta.listingData.platform} with high security broker-assisted transfer.`,
      "brand": {
        "@type": "Brand",
        "name": "IDsvault"
      },
      "offers": {
        "@context": "https://schema.org",
        "@type": "Offer",
        "priceCurrency": "INR",
        "price": meta.listingData.price || "0",
        "priceValidUntil": "2027-12-31",
        "itemCondition": "https://schema.org/NewCondition",
        "availability": "https://schema.org/InStock",
        "url": canonicalUrl
      }
    });
  }

  schemaScript.innerHTML = JSON.stringify(schemaContext, null, 2);
};
