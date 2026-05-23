import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App and Auth
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Workspace scope for Sheets
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

// Internal flags and cached session token
let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize Auth listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Clear if not mid-flow
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve OAuth access token from Google sign-in response.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('IDsvault Google Auth Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Log out of session
export const logoutSession = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// Check token helper
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Creates a brand new Google Spreadsheet inside the user's Google Drive.
 */
export const createSpreadsheet = async (accessToken: string, title: string): Promise<{ id: string; url: string }> => {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Sheets creation failed: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json();
  return {
    id: data.spreadsheetId,
    url: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
};

/**
 * Formats a Google Spreadsheet Sheet1 with headers and pretty styling
 */
export const formatLedgerHeaders = async (accessToken: string, spreadsheetId: string): Promise<boolean> => {
  const range = 'Sheet1!A1:G1';
  const headers = [
    [
      'Log Timestamp',
      'Asset/ID Name',
      'Social Platform',
      'Price / Offer',
      'Transaction Status',
      'Broker Assigned',
      'IDsvault Portal Link'
    ]
  ];

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: headers,
      }),
    }
  );

  if (!response.ok) {
    console.error('Failed to append spreadsheet header rows', await response.text());
    return false;
  }

  // Format headers to look premium (bold text, customized grid)
  const formatResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 7
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.05, green: 0.05, blue: 0.07 },
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  fontSize: 10,
                  bold: true,
                  fontFamily: 'Roboto'
                },
                horizontalAlignment: 'CENTER'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
          }
        }
      ]
    })
  });

  return formatResponse.ok;
};

/**
 * Appends a log row to an existing Google Spreadsheet
 */
export const appendToLedgerSheet = async (
  accessToken: string,
  spreadsheetId: string,
  row: any[]
): Promise<boolean> => {
  const range = 'Sheet1!A:G';
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [row],
      }),
    }
  );

  return response.ok;
};

/**
 * Fetches log rows from a given spreadsheet to show in a Live Widget
 */
export const fetchLedgerSheetRows = async (accessToken: string, spreadsheetId: string): Promise<any[][] | null> => {
  const range = 'Sheet1!A2:G50';
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.values || [];
};

/**
 * Exports lists in bulk for the broker spreadsheet tracking
 */
export const exportListingsToLedger = async (
  accessToken: string,
  spreadsheetId: string,
  listings: any[]
): Promise<number> => {
  const rows = listings.map((item) => [
    new Date().toISOString(),
    `@${item.username}`,
    item.platform.toUpperCase(),
    typeof item.askingPrice === 'number' ? `$${item.askingPrice.toLocaleString()}` : item.priceDisplayType || 'Confidential',
    'Curated Listing Available',
    'Assigned Senior Broker Desk',
    `https://idsvault.in/?id=${item.id}`,
  ]);

  const range = 'Sheet1!A2:G';
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (response.ok) {
    return rows.length;
  }
  return 0;
};
