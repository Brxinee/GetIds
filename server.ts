import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json({ limit: '15mb' }));

// Set up Gemini Client lazily to prevent crashing if API key is not yet set
let aiClient: GoogleGenAI | null = null;
const api_key = process.env.GEMINI_API_KEY;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && api_key) {
    aiClient = new GoogleGenAI({
      apiKey: api_key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// ----------------- OFFLINE HIGH-QUALITY REGEX PARSER FALLBACK -----------------
// This isolates IDs when Gemini is missing (or fails) to keep the app 100% functional
function offlineRegexExtract(text: string, selectedTypes: string[], customPattern?: string): any[] {
  const matches: any[] = [];
  const textLen = text.length;

  function addMatch(id: string, type: string, category: string, description: string, confidence: number = 0.85) {
    if (matches.some(m => m.id === id)) return; // Deduplicate
    const index = text.indexOf(id);
    const start = Math.max(0, index - 30);
    const end = Math.min(textLen, index + id.length + 30);
    const context = `...${text.substring(start, end).replace(/\n/g, ' ')}...`;
    matches.push({
      id,
      type,
      category,
      context,
      confidence,
      description
    });
  }

  // Common patterns
  const patterns: { [key: string]: { regex: RegExp; type: string; category: string; desc: string } } = {
    email: {
      regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      type: 'email',
      category: 'Email Address',
      desc: 'Extracted active communication mailbox address coordinate.'
    },
    uuid: {
      regex: /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
      type: 'database_resource',
      category: 'UUIDv4 / Database Primary Key',
      desc: 'Standard database primary key identifier (Universally Unique ID).'
    },
    mongodb_id: {
      regex: /\b[0-9a-fA-F]{24}\b/g,
      type: 'database_resource',
      category: 'MongoDB ObjectId',
      desc: 'Standard MongoDB document identity token hash.'
    },
    stripe_id: {
      regex: /\b(ch|re|py|cus|sub|price|prod|evt|txn|ti|chv|tok)_[a-zA-Z0-9]{14,24}\b/g,
      type: 'database_resource',
      category: 'Stripe Resource ID',
      desc: 'Financial gateway entity token configuration identifier.'
    },
    github_handle: {
      regex: /github\.com\/([a-zA-Z0-9-]{1,39})/g,
      type: 'user',
      category: 'GitHub Profile Username',
      desc: 'Platform profile index handle target extracted via absolute web URL.'
    },
    telegram_id: {
      regex: /t\.me\/([a-zA-Z0-9_]{5,32})\b/g,
      type: 'channel',
      category: 'Telegram Chat Coordinate',
      desc: 'Instant message handle identifier coordinates.'
    },
    ipv4: {
      regex: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
      type: 'other',
      category: 'IPv4 Node Coordinate',
      desc: 'System networking interface address indicator.'
    },
    discord_snowflake: {
      regex: /\b\d{17,19}\b/g,
      type: 'user',
      category: 'Discord Snowflake / Entity ID',
      desc: 'Unique Discord entity coordinates sequence.'
    }
  };

  // Run selected type matches
  for (const [key, model] of Object.entries(patterns)) {
    // Check if the general classification list allows the test type
    const isAllowed = selectedTypes.length === 0 || 
      selectedTypes.includes(model.type) || 
      (model.type === 'email' && selectedTypes.includes('email')) ||
      (model.type === 'database_resource' && selectedTypes.includes('database_resource')) ||
      (model.type === 'user' && selectedTypes.includes('user')) ||
      (model.type === 'channel' && selectedTypes.includes('channel')) ||
      selectedTypes.includes('other');

    if (isAllowed) {
      let match;
      // Reset last index
      model.regex.lastIndex = 0;
      while ((match = model.regex.exec(text)) !== null) {
        let extractedVal = match[0];
        // Capture inner group if exists for URLs
        if (match[1]) {
          extractedVal = match[1];
        }
        addMatch(extractedVal, model.type, model.category, model.desc, 0.9);
      }
    }
  }

  // Attempt custom regex pattern if provided
  if (customPattern) {
    try {
      const cleanRegex = new RegExp(customPattern, 'g');
      let customMatch;
      while ((customMatch = cleanRegex.exec(text)) !== null) {
        const extractedVal = customMatch[0];
        addMatch(
          extractedVal, 
          'other', 
          'Custom Rule Identifier', 
          'ID extracted cleanly using custom developer regex parameter verification.',
          0.95
        );
      }
    } catch (e: any) {
      console.warn('Custom pattern failure on regex fallback processing:', e.message);
    }
  }

  // High quality generic fallback matching alphanumeric coordinate hashes if nothing matched so far
  if (matches.length === 0) {
    const rawTokens = text.split(/[\s,;=\[\]"'{()}]/);
    for (const token of rawTokens) {
      const clean = token.replace(/['"():;,.!&]/g, '').trim();
      const isCandidate = /^[a-zA-Z0-9_-]{8,64}$/.test(clean) && 
        /[0-9]/.test(clean) && 
        /[a-zA-Z]/.test(clean) &&
        !['process', 'localhost', 'undefined', 'env', 'package', 'node_modules', 'webpack', 'strict', 'true', 'false', 'null'].includes(clean.toLowerCase());
      
      if (isCandidate) {
        addMatch(
          clean, 
          'other', 
          'Generic System ID Code', 
          'Identified as a prospective serial config code or token coordinate string.', 
          0.65
        );
      }
    }
  }

  return matches;
}

// ----------------- HEALTH & CONFIG CHECK -----------------
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    isGeminiReady: !!process.env.GEMINI_API_KEY,
    message: process.env.GEMINI_API_KEY 
      ? "Gemini API integration active." 
      : "Gemini API key is not configured. Falling back to local regex-based engine."
  });
});

// ----------------- EXTRACTION API PROXY -----------------
app.post('/api/extract', async (req, res) => {
  try {
    const { text, types = [], customPattern } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Text input payload is empty' });
    }

    const ai = getGeminiClient();

    // Fallback path if Gemini key is missing
    if (!ai) {
      console.log('No GEMINI_API_KEY detected. Running local regex model processor...');
      const results = offlineRegexExtract(text, types, customPattern);
      return res.json({
        success: true,
        isMock: true,
        count: results.length,
        results
      });
    }

    // Call real Gemini API
    const typePromptStr = types.length > 0 ? types.join(', ') : 'any system, database, user, channel, log, configuration or custom IDs';
    const customPromptStr = customPattern ? `Carefully match the following custom structure or user definition pattern rules: "${customPattern}".` : '';

    const systemInstruction = `You are an elite automated security, database, and log auditing parser of extreme precision. 
Your objective is to review the user's raw unstructured logs, documents, configs, database exports, or text block, and extract ALL unique IDs matching these classifications: [${typePromptStr}].
${customPromptStr}

For every single match, resolve the following schema parameters with absolute accuracy:
- id: The exact literal ID, key, token, uuid, email, or credential hash code extracted.
- type: Categorize strictly into one of: 'user', 'channel', 'database_resource', 'email', 'other'.
- category: A specific human classification name, e.g. 'Stripe Customer ID', 'MongoDB ObjectID', 'AWS VPC ARN', 'Git Commit Hash', 'Email Coordinates', 'IPv4 Coordinates', etc.
- context: A short readable snippet showing the surrounding log or text coordinates so the developer understands where it exists in the raw input (truncate to max 80 chars, pad with triple dots).
- confidence: Coefficient decimal between 0.0 and 1.0 indicating your certainty.
- description: A concise explanation specifying what this ID coordinates or represents in context, like "Extracted as server host identity indicator." or "Database unique primary index record token."

Deduplicate matching values. Do not extract configuration commands, system variables (like NODE_ENV, PORT), or standard vocabulary unless they explicitly act as database or user ids in context.`;

    const modelToUse = 'gemini-3.5-flash';

    console.log(`Querying ${modelToUse} for automated extraction... Type Scope: [${types.join(',')}]`);

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: `Here is the target document/logs:
---
${text}
---`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "The literal target ID/key extracted." },
              type: { type: Type.STRING, description: "Classification category: user, channel, database_resource, email, or other." },
              category: { type: Type.STRING, description: "Highly specific classification tag name." },
              context: { type: Type.STRING, description: "Snippet showing matching context lines." },
              confidence: { type: Type.NUMBER, description: "Confidence decimal from 0.0 to 1.0." },
              description: { type: Type.STRING, description: "Dynamic guess indicating the function of this key." }
            },
            required: ["id", "type", "category", "context", "confidence", "description"]
          }
        }
      }
    });

    const textOutput = response.text || "[]";
    const results = JSON.parse(textOutput.trim());

    return res.json({
      success: true,
      isMock: false,
      count: results.length,
      results
    });

  } catch (error: any) {
    console.error('Gemini extraction processing failed:', error);
    
    // In event of API rate-limiting or network blockades, run Regex as robust disaster backup
    try {
      const { text, types = [], customPattern } = req.body;
      const results = offlineRegexExtract(text, types, customPattern);
      return res.json({
        success: true,
        isMock: true,
        errorMsg: error.message || 'Gemini transaction was blocked. Offline Regex extraction was launched as a sandbox proxy.',
        count: results.length,
        results
      });
    } catch (fallbackError: any) {
      return res.status(500).json({
        success: false,
        error: `Core system error: ${error.message || error}`
      });
    }
  }
});

// Configure Vite middleware in development or direct static asset servers
if (process.env.NODE_ENV !== 'production') {
  createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  }).then((vite) => {
    app.use(vite.middlewares);
  }).catch((err) => {
    console.error('Error starting Vite middleware dev environment', err);
  });
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Wrap listen loop inside development checks for Vercel Serverless optimization
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GetIds Server] Dev backend started on port ${PORT}`);
  });
}

export default app;
