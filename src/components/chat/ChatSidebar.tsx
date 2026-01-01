import { Plus, Trash2, MessageSquare, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DocumentsList } from '@/components/documents/DocumentsList'
import type { Chat } from '@/lib/supabase'
import type { Document } from '@/hooks/useDocuments'
import { cn } from '@/lib/utils'

export type SidebarView = 'chats' | 'documents'

interface ChatSidebarProps {
  chats: Chat[]
  currentChatId: string | null
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
  onDeleteChat: (chatId: string) => void
  // Documents props
  activeView: SidebarView
  onViewChange: (view: SidebarView) => void
  documents: Document[]
  isLoadingDocuments: boolean
  isUploadingDocument: boolean
  uploadProgress: string | null
  onUploadDocument: (file: File) => Promise<boolean>
  onDeleteDocument: (id: string) => Promise<boolean>
  onReindexDocument: (id: string) => Promise<boolean>
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

export function ChatSidebar({
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  activeView,
  onViewChange,
  documents,
  isLoadingDocuments,
  isUploadingDocument,
  uploadProgress,
  onUploadDocument,
  onDeleteDocument,
  onReindexDocument,
}: ChatSidebarProps) {
  return (
    <div className="relative z-10 flex flex-col h-full w-64 shrink-0 border-r bg-muted/30">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors',
            activeView === 'chats'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onViewChange('chats')}
        >
          <MessageSquare className="h-4 w-4" />
          Chats
        </button>
        <button
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors',
            activeView === 'documents'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onViewChange('documents')}
        >
          <FileText className="h-4 w-4" />
          Dokumente
          {documents.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded-full">
              {documents.length}
            </span>
          )}
        </button>
      </div>

      {activeView === 'chats' ? (
        <>
          <div className="p-3 border-b">
            <Button
              onClick={onNewChat}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              Neuer Chat
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {chats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Noch keine Chats
                </p>
              ) : (
                chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={cn(
                      'group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg p-2 cursor-pointer hover:bg-muted transition-colors',
                      currentChatId === chat.id && 'bg-muted'
                    )}
                    onClick={() => onSelectChat(chat.id)}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 overflow-hidden">
                      <p className="text-sm font-medium truncate">
                        {chat.title || 'Neuer Chat'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(chat.updated_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 justify-self-end text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteChat(chat.id)
                      }}
                      aria-label="Chat löschen"
                      title="Chat löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </>
      ) : (
        <DocumentsList
          documents={documents}
          isLoading={isLoadingDocuments}
          isUploading={isUploadingDocument}
          uploadProgress={uploadProgress}
          onUpload={onUploadDocument}
          onDelete={onDeleteDocument}
          onReindex={onReindexDocument}
        />
      )}
    </div>
  )
}
