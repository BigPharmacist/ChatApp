import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const NEBIUS_EMBEDDING_URL = "https://api.tokenfactory.nebius.com/v1/embeddings"
const EMBEDDING_MODEL = "BAAI/bge-multilingual-gemma2"  // Multilingual - besser für Deutsch
const EMBEDDING_DIMENSION = 3584  // bge-multilingual-gemma2 dimension

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface DocumentChunk {
  id: string
  content: string
  metadata?: Record<string, unknown>
}

interface IndexRequest {
  collection: string
  documents: DocumentChunk[]
}

interface QueryRequest {
  collection: string
  query: string
  limit?: number
  filter?: Record<string, unknown>
}

interface DeleteRequest {
  collection: string
  ids?: string[]
  filter?: Record<string, unknown>
}

// Qdrant REST API Helper
class QdrantClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "")
  }

  async collectionExists(name: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/collections/${name}`)
      return response.ok
    } catch {
      return false
    }
  }

  async createCollection(name: string, vectorSize: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/collections/${name}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vectors: {
          size: vectorSize,
          distance: "Cosine"
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create collection: ${error}`)
    }
  }

  async ensureCollection(name: string, vectorSize: number): Promise<void> {
    const exists = await this.collectionExists(name)
    if (!exists) {
      await this.createCollection(name, vectorSize)
    }
  }

  async upsertPoints(collection: string, points: Array<{
    id: string
    vector: number[]
    payload: Record<string, unknown>
  }>): Promise<void> {
    const response = await fetch(`${this.baseUrl}/collections/${collection}/points`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        points: points.map(p => ({
          id: crypto.randomUUID(),  // Qdrant needs UUID, store original_id in payload
          vector: p.vector,
          payload: { ...p.payload, original_id: p.id }
        }))
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to upsert points: ${error}`)
    }
  }

  async search(collection: string, vector: number[], limit: number, filter?: Record<string, unknown>): Promise<Array<{
    id: string
    score: number
    payload: Record<string, unknown>
  }>> {
    const body: Record<string, unknown> = {
      vector,
      limit,
      with_payload: true
    }

    if (filter) {
      body.filter = filter
    }

    const response = await fetch(`${this.baseUrl}/collections/${collection}/points/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to search: ${error}`)
    }

    const data = await response.json()
    return data.result || []
  }

  async deletePoints(collection: string, ids?: string[], filter?: Record<string, unknown>): Promise<void> {
    const body: Record<string, unknown> = {}

    if (ids && ids.length > 0) {
      body.points = ids
    } else if (filter) {
      body.filter = filter
    } else {
      throw new Error("Either ids or filter must be provided for deletion")
    }

    const response = await fetch(`${this.baseUrl}/collections/${collection}/points/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to delete points: ${error}`)
    }
  }

  async deleteCollection(collection: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/collections/${collection}`, {
      method: "DELETE"
    })

    if (!response.ok && response.status !== 404) {
      const error = await response.text()
      throw new Error(`Failed to delete collection: ${error}`)
    }
  }

  async getCollectionInfo(collection: string): Promise<Record<string, unknown> | null> {
    const response = await fetch(`${this.baseUrl}/collections/${collection}`)
    if (!response.ok) {
      return null
    }
    const data = await response.json()
    return data.result
  }

  async listCollections(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/collections`)
    if (!response.ok) {
      throw new Error("Failed to list collections")
    }
    const data = await response.json()
    return (data.result?.collections || []).map((c: { name: string }) => c.name)
  }
}

// Nebius Embeddings API
async function getEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
  const response = await fetch(NEBIUS_EMBEDDING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Embedding API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.data.map((item: { embedding: number[] }) => item.embedding)
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get("NEBIUS_API_KEY")
    const qdrantUrl = Deno.env.get("QDRANT_URL") || "http://localhost:6333"

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "NEBIUS_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const qdrant = new QdrantClient(qdrantUrl)
    const url = new URL(req.url)
    const path = url.pathname.replace(/^\/rag/, "")

    console.log(`RAG Request: ${req.method} ${path}`)

    // GET /collections - Liste alle Collections
    if (req.method === "GET" && path === "/collections") {
      const collections = await qdrant.listCollections()
      return new Response(
        JSON.stringify({ collections }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // GET /collections/:name - Collection Info
    if (req.method === "GET" && path.startsWith("/collections/")) {
      const collectionName = path.split("/")[2]
      const info = await qdrant.getCollectionInfo(collectionName)
      if (!info) {
        return new Response(
          JSON.stringify({ error: "Collection not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
      return new Response(
        JSON.stringify(info),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // POST /index - Dokumente indexieren
    if (req.method === "POST" && path === "/index") {
      const { collection, documents }: IndexRequest = await req.json()

      if (!collection || !documents || documents.length === 0) {
        return new Response(
          JSON.stringify({ error: "collection and documents are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Collection erstellen falls nicht vorhanden
      await qdrant.ensureCollection(collection, EMBEDDING_DIMENSION)

      // Embeddings generieren
      const texts = documents.map(d => d.content)
      console.log(`Generating embeddings for ${texts.length} documents...`)
      const embeddings = await getEmbeddings(texts, apiKey)

      // Punkte in Qdrant speichern
      const points = documents.map((doc, i) => ({
        id: doc.id,
        vector: embeddings[i],
        payload: {
          content: doc.content,
          ...doc.metadata
        }
      }))

      await qdrant.upsertPoints(collection, points)

      return new Response(
        JSON.stringify({
          success: true,
          indexed: documents.length,
          collection
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // POST /query - Ähnliche Dokumente suchen
    if (req.method === "POST" && path === "/query") {
      const { collection, query, limit = 5, filter }: QueryRequest = await req.json()

      if (!collection || !query) {
        return new Response(
          JSON.stringify({ error: "collection and query are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Query Embedding generieren
      console.log(`Generating query embedding for: "${query.substring(0, 50)}..."`)
      const [queryEmbedding] = await getEmbeddings([query], apiKey)

      // Suche in Qdrant
      const results = await qdrant.search(collection, queryEmbedding, limit, filter)

      return new Response(
        JSON.stringify({
          results: results.map(r => ({
            id: r.id,
            score: r.score,
            content: r.payload.content,
            metadata: Object.fromEntries(
              Object.entries(r.payload).filter(([k]) => k !== "content")
            )
          }))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // DELETE /delete - Dokumente löschen
    if (req.method === "POST" && path === "/delete") {
      const { collection, ids, filter }: DeleteRequest = await req.json()

      if (!collection) {
        return new Response(
          JSON.stringify({ error: "collection is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      await qdrant.deletePoints(collection, ids, filter)

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // DELETE /collections/:name - Collection löschen
    if (req.method === "DELETE" && path.startsWith("/collections/")) {
      const collectionName = path.split("/")[2]
      await qdrant.deleteCollection(collectionName)

      return new Response(
        JSON.stringify({ success: true, deleted: collectionName }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Health check
    if (req.method === "GET" && (path === "" || path === "/" || path === "/health")) {
      try {
        const collections = await qdrant.listCollections()
        return new Response(
          JSON.stringify({
            status: "healthy",
            qdrant: "connected",
            collections: collections.length
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      } catch (error) {
        return new Response(
          JSON.stringify({
            status: "unhealthy",
            qdrant: "disconnected",
            error: error.message
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: "Not found", path }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("RAG Error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
