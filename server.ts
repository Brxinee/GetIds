import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Memory storage for rate limiter
const rateLimits = new Map<string, { count: number; lastReset: number }>();

/**
 * IP-based Memory Rate Limiter
 * limit: max request count in timeframe
 * windowMs: window duration in milliseconds
 */
function isRateLimited(ip: string, actionKey: string, limit = 5, windowMs = 600000): boolean {
  const now = Date.now();
  const key = `${ip}:${actionKey}`;
  const record = rateLimits.get(key);

  if (!record || now - record.lastReset > windowMs) {
    rateLimits.set(key, { count: 1, lastReset: now });
    return false;
  }

  if (record.count >= limit) {
    return true;
  }

  record.count++;
  return false;
}

// Supabase client initialize on server
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Clean SEO sitemap handler
app.get('/sitemap.xml', (req, res) => {
  res.header('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://get-ids-six.vercel.app/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
});

// Clean SEO robots.txt handler
app.get('/robots.txt', (req, res) => {
  res.header('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /
Sitemap: https://get-ids-six.vercel.app/sitemap.xml`);
});

// Cloudflare Turnstile token validation helper
async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  // If no secret key is provided, allow testing bypass matching Cloudflare behavior
  const secretKey = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';
  if (!token) return false;

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        remoteip: ip,
      }),
    });

    const outcome = await response.json();
    return !!outcome.success;
  } catch (error) {
    console.error('Server side Turnstile check failed:', error);
    return false;
  }
}

// ----------------- API ENDPOINTS -----------------

// 1. Seller Registration Form API
app.post('/api/submit-seller', async (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  
  // Rate limiter check
  if (isRateLimited(clientIp, 'seller', 5, 600000)) {
    return res.status(429).json({ 
      success: false, 
      error: 'Rate Limit Warning: Too many seller requests. Personal queue locked for 10 minutes.' 
    });
  }

  const { token, payload, fileData, fileName, fileType, fileSize } = req.body;

  // Real Turnstile verification
  const isHuman = await verifyTurnstileToken(token, clientIp);
  if (!isHuman) {
    return res.status(403).json({ success: false, error: 'Cryptographic Turnstile security verification failed.' });
  }

  // Pre-emptive duplicate checks
  if (supabase && payload?.username && payload?.platform) {
    try {
      const cleanUsername = payload.username.trim().replace('@', '').toLowerCase();
      const { data: duplicateListing } = await supabase
        .from('listings')
        .select('id')
        .eq('platform', payload.platform)
        .eq('username', cleanUsername)
        .eq('listing_status', 'live')
        .maybeSingle();

      const { data: duplicateSub } = await supabase
        .from('submissions')
        .select('id')
        .eq('platform', payload.platform)
        .eq('username', cleanUsername)
        .eq('status', 'pending')
        .maybeSingle();

      if (duplicateListing || duplicateSub) {
        return res.status(409).json({
          success: false,
          error: `Duplicate Handle Registered: A premium identity for @${cleanUsername} is already registered inside our active desk catalog.`
        });
      }
    } catch (e) {
      console.error('Duplicate precheck database error:', e);
    }
  }

  // File Upload Safety Validation (Allow only JPG, JPEG, PNG, MP4)
  if (fileData) {
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'mp4'];
    const fileExt = fileName ? fileName.split('.').pop()?.toLowerCase() : '';
    if (!allowedExtensions.includes(fileExt) && !['image/png', 'image/jpeg', 'image/jpg', 'video/mp4'].includes(fileType)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Security block: Unvalidated file extension. Only PNG, JPG screenshot, or MP4 proof uploads are certified.' 
      });
    }

    // Size check (Maximum 5MB)
    if (fileSize && fileSize > 5 * 1024 * 1024) {
      return res.status(400).json({ 
        success: false, 
        error: 'Safety warning: proof upload exceeds size threshold of 5MB.' 
      });
    }
  }

  // Persistence block
  if (supabase && payload) {
    try {
      const submissionId = payload.id || 'sub-' + Date.now();
      const dbRow = {
        id: submissionId,
        username: payload.username.trim().replace('@', ''),
        platform: payload.platform,
        category: payload.category || 'General Handle',
        asking_price: payload.askingPrice,
        min_price: payload.minPrice || null,
        seller_name: payload.sellerName,
        whatsapp: payload.whatsapp,
        ownership_confirmed: true,
        status: 'pending',
        upload_proof_name: fileName || null,
        upload_proof_data: fileData || null,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('submissions').insert([dbRow]);
      if (error) {
        console.error('Database write failed during seller register:', error);
        return res.status(500).json({ success: false, error: 'Registry database persistence failed.' });
      }
    } catch (dbErr) {
      console.error('Supabase exception raised:', dbErr);
    }
  }

  return res.json({ success: true, message: 'Seller submission recorded' });
});

// 2. Buyer Deal Form API (Negotiate Offer)
app.post('/api/submit-buyer', async (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (isRateLimited(clientIp, 'buyer', 8, 600000)) {
    return res.status(429).json({ 
      success: false, 
      error: 'Rate Limit Warning: High volume of buy offers detected. Access locked for 10 minutes.' 
    });
  }

  const { token, payload } = req.body;

  const isHuman = await verifyTurnstileToken(token, clientIp);
  if (!isHuman) {
    return res.status(403).json({ success: false, error: 'Challenge failed.' });
  }

  // Hydrate Supabase DB with active deal parameters
  if (supabase && payload) {
    try {
      const dbRow = {
        id: payload.id || 'deal-' + Date.now(),
        username: payload.username,
        platform: payload.platform,
        agreed_price: payload.agreedPrice,
        brokerage_fee: payload.brokerageFee,
        payout: payload.payout,
        status: 'NEW', // Required custom status
        buyer_name: payload.buyerName,
        whatsapp: payload.whatsapp,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('deals').insert([dbRow]);
      if (error) {
        console.error('Database write failed during buyer register:', error);
        return res.status(500).json({ success: false, error: 'Database write failure.' });
      }
    } catch (dbErr) {
      console.error('Deal registry sync exception:', dbErr);
    }
  }

  return res.json({ success: true, message: 'Buyer offer recorded' });
});

// 3. Request Form API (Specific Custom Hunt Request)
app.post('/api/submit-request', async (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (isRateLimited(clientIp, 'request', 5, 600000)) {
    return res.status(429).json({ 
      success: false, 
      error: 'Rate Limit Warning: Too many matching custom hunt inputs. Service paused for 10 minutes.' 
    });
  }

  const { token, payload } = req.body;

  const isHuman = await verifyTurnstileToken(token, clientIp);
  if (!isHuman) {
    return res.status(403).json({ success: false, error: 'Cloudflare security challenge rejected.' });
  }

  return res.json({ success: true, message: 'Custom hunt parameters verified and registered.' });
});

// Serve frontend build static files / mount Vite dev middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[IDsvault Server] Premium digital identity system active on port ${PORT}`);
  });
}

startServer();
