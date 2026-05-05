-- Migration: Add embedding column for semantic search
-- Run this in Supabase SQL Editor

-- Add vector column (2048 dimensions for Zhipu embedding-3)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS embedding vector(2048);

-- Create HNSW index for fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_notes_embedding 
ON notes USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create RPC function to generate embedding via pg_net + OpenAI-compatible API
-- This function calls an external embedding service
-- The actual API call is made from the Next.js API route (more flexible)
-- This index is enough for the search queries

COMMENT ON COLUMN notes.embedding IS 'Zhipu embedding-3 vector (2048 dimensions)';
