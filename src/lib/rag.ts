export interface DocumentChunk {
  id: string
  content: string
  metadata?: Record<string, unknown>
}

export interface SearchResult {
  id: string
  score: number
  content: string
  metadata: Record<string, unknown>
}

export interface RAGResponse<T> {
  data: T | null
  error: string | null
}

/**
 * RAG Client - Interagiert mit der Qdrant Vector Database via Supabase Edge Function
 */
export const rag = {
  /**
   * Indexiert Dokumente in einer Collection
   */
  async index(
    collection: string,
    documents: DocumentChunk[]
  ): Promise<RAGResponse<{ indexed: number }>> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag/index`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ collection, documents })
        }
      )

      if (!response.ok) {
        const err = await response.json()
        return { data: null, error: err.error || 'Indexing failed' }
      }

      const result = await response.json()
      return { data: { indexed: result.indexed }, error: null }
    } catch (err) {
      return { data: null, error: (err as Error).message }
    }
  },

  /**
   * Sucht nach ähnlichen Dokumenten
   */
  async query(
    collection: string,
    query: string,
    limit = 5,
    filter?: Record<string, unknown>
  ): Promise<RAGResponse<SearchResult[]>> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag/query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ collection, query, limit, filter })
        }
      )

      if (!response.ok) {
        const err = await response.json()
        return { data: null, error: err.error || 'Query failed' }
      }

      const result = await response.json()
      return { data: result.results, error: null }
    } catch (err) {
      return { data: null, error: (err as Error).message }
    }
  },

  /**
   * Löscht Dokumente aus einer Collection
   */
  async delete(
    collection: string,
    ids?: string[],
    filter?: Record<string, unknown>
  ): Promise<RAGResponse<{ success: boolean }>> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag/delete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ collection, ids, filter })
        }
      )

      if (!response.ok) {
        const err = await response.json()
        return { data: null, error: err.error || 'Delete failed' }
      }

      return { data: { success: true }, error: null }
    } catch (err) {
      return { data: null, error: (err as Error).message }
    }
  },

  /**
   * Listet alle Collections
   */
  async listCollections(): Promise<RAGResponse<string[]>> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag/collections`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        }
      )

      if (!response.ok) {
        const err = await response.json()
        return { data: null, error: err.error || 'Failed to list collections' }
      }

      const result = await response.json()
      return { data: result.collections, error: null }
    } catch (err) {
      return { data: null, error: (err as Error).message }
    }
  },

  /**
   * Löscht eine komplette Collection
   */
  async deleteCollection(collection: string): Promise<RAGResponse<{ success: boolean }>> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag/collections/${collection}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        }
      )

      if (!response.ok) {
        const err = await response.json()
        return { data: null, error: err.error || 'Failed to delete collection' }
      }

      return { data: { success: true }, error: null }
    } catch (err) {
      return { data: null, error: (err as Error).message }
    }
  },

  /**
   * Health Check
   */
  async health(): Promise<RAGResponse<{ status: string; qdrant: string; collections: number }>> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag/health`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        }
      )

      const result = await response.json()

      if (!response.ok) {
        return { data: null, error: result.error || 'Health check failed' }
      }

      return { data: result, error: null }
    } catch (err) {
      return { data: null, error: (err as Error).message }
    }
  }
}

/**
 * Hilfsfunktion: Text in Chunks aufteilen
 */
export function chunkText(
  text: string,
  chunkSize = 500,
  overlap = 50
): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end))
    start = end - overlap
    if (start >= text.length - overlap) break
  }

  return chunks
}

/**
 * Hilfsfunktion: Dokument in indexierbare Chunks umwandeln
 */
export function prepareDocument(
  text: string,
  baseId: string,
  metadata: Record<string, unknown> = {},
  chunkSize = 500,
  overlap = 50
): DocumentChunk[] {
  const chunks = chunkText(text, chunkSize, overlap)

  return chunks.map((content, index) => ({
    id: `${baseId}_chunk_${index}`,
    content,
    metadata: {
      ...metadata,
      chunk_index: index,
      total_chunks: chunks.length
    }
  }))
}
