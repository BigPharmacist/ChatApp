import { useChat } from '@/hooks/useChat'
import { useSettings } from '@/hooks/useSettings'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { ModelSelector } from './ModelSelector'
import { SettingsDialog } from './SettingsDialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BookOpen, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatContainerProps {
  chatId: string | null
  onTitleGenerated: (chatId: string, title: string) => void
  ragEnabled: boolean
  onRagToggle: (enabled: boolean) => void
  documentCount: number
  webSearchEnabled: boolean
  onWebSearchToggle: (enabled: boolean) => void
}

export function ChatContainer({ chatId, onTitleGenerated, ragEnabled, onRagToggle, documentCount, webSearchEnabled, onWebSearchToggle }: ChatContainerProps) {
  const { systemPrompt, saveSystemPrompt } = useSettings()

  const {
    messages,
    isLoading,
    selectedModel,
    setSelectedModel,
    sendMessage,
    clearMessages,
    availableModels,
  } = useChat({ chatId, onTitleGenerated, systemPrompt, ragEnabled, webSearchEnabled })

  if (!chatId) {
    return (
      <Card className="flex flex-col h-full items-center justify-center">
        <p className="text-muted-foreground">
          Wähle einen Chat aus oder erstelle einen neuen
        </p>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      {/* Header - fixed */}
      <div className="shrink-0 border-b p-4 flex items-center justify-between bg-background">
        <h1 className="text-xl font-semibold">ChatApp</h1>
        <div className="flex items-center gap-2">
          <ModelSelector
            models={availableModels}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            disabled={isLoading}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => onWebSearchToggle(!webSearchEnabled)}
            disabled={isLoading}
            title={webSearchEnabled ? 'Web-Suche deaktivieren' : 'Web-Suche aktivieren'}
            className={cn(
              webSearchEnabled && 'bg-blue-500 text-white hover:bg-blue-600'
            )}
          >
            <Globe className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onRagToggle(!ragEnabled)}
            disabled={isLoading || documentCount === 0}
            title={documentCount === 0 ? 'Keine Dokumente vorhanden' : ragEnabled ? 'RAG deaktivieren' : 'RAG aktivieren'}
            className={cn(
              ragEnabled && 'bg-green-500 text-white hover:bg-green-600'
            )}
          >
            <BookOpen className="h-4 w-4" />
          </Button>
          <SettingsDialog
            systemPrompt={systemPrompt}
            onSave={saveSystemPrompt}
            disabled={isLoading}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={clearMessages}
            disabled={isLoading || messages.length === 0}
          >
            Chat leeren
          </Button>
        </div>
      </div>

      {/* Messages - scrollable */}
      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      {/* Input - fixed */}
      <div className="shrink-0">
        <MessageInput onSend={sendMessage} isLoading={isLoading} />
      </div>
    </Card>
  )
}
