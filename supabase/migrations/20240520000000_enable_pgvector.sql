-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to document_chunks table
ALTER TABLE public.document_chunks ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx ON public.document_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create a function to handle vector operations
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.content,
    document_chunks.metadata,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity
  FROM document_chunks
  WHERE 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
