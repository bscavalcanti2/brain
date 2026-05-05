export interface Note {
  id: string;
  title: string;
  content: string;
  source: 'auto_claw' | 'claude_code' | 'codex' | 'manual';
  metadata: Record<string, unknown>;
  tags: Tag[];
  linksFrom: NoteLink[];
  linksTo: NoteLink[];
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface NoteLink {
  sourceId: string;
  targetId: string;
  createdAt: string;
}

export interface CreateNoteInput {
  title: string;
  content?: string;
  source?: string;
  tags?: string[];
  linksTo?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  tags: Tag[];
  source: string;
  rank: number;
}

export interface GraphNode {
  id: string;
  title: string;
  tags: string[];
  source: string;
}

export interface GraphEdge {
  source: string;
  target: string;
}
