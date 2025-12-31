import { Plus, Trash2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Chat } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface ChatSidebarProps {
  chats: Chat[]
  currentChatId: string | null
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
  onDeleteChat: (chatId: string) => void
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
}: ChatSidebarProps) {
  return (
    <div className="flex flex-col h-full w-64 border-r bg-muted/30">
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
                  'group flex items-center gap-2 rounded-lg p-2 cursor-pointer hover:bg-muted transition-colors',
                  currentChatId === chat.id && 'bg-muted'
                )}
                onClick={() => onSelectChat(chat.id)}
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
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
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteChat(chat.id)
                  }}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
