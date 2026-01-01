import { useRef, useState, useCallback } from 'react'
import { FileText, Trash2, Upload, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Document } from '@/hooks/useDocuments'

interface DocumentsListProps {
  documents: Document[]
  isLoading: boolean
  isUploading: boolean
  uploadProgress: string | null
  onUpload: (file: File) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
  onReindex: (id: string) => Promise<boolean>
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Gerade eben'
  if (diffMins < 60) return `vor ${diffMins} Min.`
  if (diffHours < 24) return `vor ${diffHours} Std.`
  if (diffDays < 7) return `vor ${diffDays} Tagen`
  return date.toLocaleDateString('de-DE')
}

export function DocumentsList({
  documents,
  isLoading,
  isUploading,
  uploadProgress,
  onUpload,
  onDelete,
  onReindex,
}: DocumentsListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        await onUpload(file)
      }
    }
  }, [onUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id)
    await onDelete(id)
    setDeletingId(null)
  }, [onDelete])

  return (
    <div className="flex flex-col h-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Lade Dokumente...
            </p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Noch keine Dokumente
            </p>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg p-2 hover:bg-muted transition-colors"
              >
                <div className="relative shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {doc.indexed ? (
                    <CheckCircle className="absolute -bottom-1 -right-1 h-2.5 w-2.5 text-green-500" />
                  ) : (
                    <AlertCircle className="absolute -bottom-1 -right-1 h-2.5 w-2.5 text-yellow-500" />
                  )}
                </div>
                <div className="min-w-0 overflow-hidden">
                  <p className="text-sm font-medium truncate" title={doc.title}>
                    {doc.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)} &middot; {formatRelativeTime(doc.created_at)}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!doc.indexed && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => onReindex(doc.id)}
                      aria-label="Neu indexieren"
                      title="Neu indexieren"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    aria-label="Dokument löschen"
                    title="Dokument löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Upload Zone */}
      <div className="p-3 border-t">
        {isUploading ? (
          <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg bg-muted/50">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">{uploadProgress}</span>
          </div>
        ) : (
          <div
            className={cn(
              'flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
              isDragOver ? 'border-primary bg-primary/5' : 'hover:border-primary/50 hover:bg-muted/50'
            )}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">Dateien hierher ziehen</p>
              <p className="text-xs text-muted-foreground">oder klicken (.txt, .md)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
