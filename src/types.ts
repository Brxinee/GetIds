export interface ExtractedId {
  id: string;
  type: 'user' | 'channel' | 'database_resource' | 'email' | 'other';
  category: string;
  context: string;
  confidence: number;
  description: string;
}

export interface ParseHistoryItem {
  id: string;
  timestamp: string;
  title: string;
  inputSnippet: string;
  rawText: string;
  count: number;
  results: ExtractedId[];
  isMock: boolean;
}

export interface SampleDataset {
  name: string;
  type: string;
  icon: string;
  text: string;
}
