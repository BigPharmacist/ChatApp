import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { rag, prepareDocument } from '@/lib/rag'

const RAG_COLLECTION = 'global_documents'

export interface Document {
  id: string
  title: string
  filename: string
  content: string
  file_size: number | null
  indexed: boolean
  created_at: string
}

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading documents:', error)
      setIsLoading(false)
      return
    }

    setDocuments(data || [])
    setIsLoading(false)
  }, [])

  const uploadDocument = useCallback(async (file: File): Promise<boolean> => {
    setIsUploading(true)
    setUploadProgress('Datei wird gelesen...')

    try {
      // Read file content
      const content = await file.text()
      const title = file.name.replace(/\.(txt|md)$/i, '')

      setUploadProgress('Dokument wird gespeichert...')

      // Save to database
      const { data: doc, error: dbError } = await supabase
        .from('documents')
        .insert({
          title,
          filename: file.name,
          content,
          file_size: file.size,
          indexed: false
        })
        .select()
        .single()

      if (dbError) {
        console.error('Error saving document:', dbError)
        setUploadProgress(null)
        setIsUploading(false)
        return false
      }

      setUploadProgress('Dokument wird indexiert...')

      // Prepare chunks and index
      const chunks = prepareDocument(content, doc.id, {
        document_id: doc.id,
        title,
        filename: file.name
      })

      const { error: ragError } = await rag.index(RAG_COLLECTION, chunks)

      if (ragError) {
        console.error('Error indexing document:', ragError)
        // Document saved but not indexed - update status
        await supabase
          .from('documents')
          .update({ indexed: false })
          .eq('id', doc.id)
      } else {
        // Mark as indexed
        await supabase
          .from('documents')
          .update({ indexed: true })
          .eq('id', doc.id)
        doc.indexed = true
      }

      setDocuments(prev => [doc, ...prev])
      setUploadProgress(null)
      setIsUploading(false)
      return true
    } catch (err) {
      console.error('Upload error:', err)
      setUploadProgress(null)
      setIsUploading(false)
      return false
    }
  }, [])

  const deleteDocument = useCallback(async (docId: string): Promise<boolean> => {
    try {
      // Delete from Qdrant (filter by document_id in metadata)
      await rag.delete(RAG_COLLECTION, undefined, {
        must: [{ key: 'document_id', match: { value: docId } }]
      })

      // Delete from database
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId)

      if (error) {
        console.error('Error deleting document:', error)
        return false
      }

      setDocuments(prev => prev.filter(d => d.id !== docId))
      return true
    } catch (err) {
      console.error('Delete error:', err)
      return false
    }
  }, [])

  const reindexDocument = useCallback(async (docId: string): Promise<boolean> => {
    const doc = documents.find(d => d.id === docId)
    if (!doc) return false

    try {
      // Delete old vectors
      await rag.delete(RAG_COLLECTION, undefined, {
        must: [{ key: 'document_id', match: { value: docId } }]
      })

      // Re-index
      const chunks = prepareDocument(doc.content, doc.id, {
        document_id: doc.id,
        title: doc.title,
        filename: doc.filename
      })

      const { error } = await rag.index(RAG_COLLECTION, chunks)

      if (error) {
        console.error('Error reindexing:', error)
        return false
      }

      // Update indexed status
      await supabase
        .from('documents')
        .update({ indexed: true })
        .eq('id', docId)

      setDocuments(prev => prev.map(d =>
        d.id === docId ? { ...d, indexed: true } : d
      ))

      return true
    } catch (err) {
      console.error('Reindex error:', err)
      return false
    }
  }, [documents])

  const reindexAll = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    try {
      // Delete entire collection
      await rag.deleteCollection(RAG_COLLECTION)

      // Re-index all documents
      for (const doc of documents) {
        const chunks = prepareDocument(doc.content, doc.id, {
          document_id: doc.id,
          title: doc.title,
          filename: doc.filename
        })

        await rag.index(RAG_COLLECTION, chunks)

        await supabase
          .from('documents')
          .update({ indexed: true })
          .eq('id', doc.id)
      }

      setDocuments(prev => prev.map(d => ({ ...d, indexed: true })))
      setIsLoading(false)
      return true
    } catch (err) {
      console.error('Reindex all error:', err)
      setIsLoading(false)
      return false
    }
  }, [documents])

  return {
    documents,
    isLoading,
    isUploading,
    uploadProgress,
    loadDocuments,
    uploadDocument,
    deleteDocument,
    reindexDocument,
    reindexAll,
    documentCount: documents.length,
    indexedCount: documents.filter(d => d.indexed).length
  }
}
