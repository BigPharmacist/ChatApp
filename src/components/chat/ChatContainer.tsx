import { useChat } from '@/hooks/useChat'
import { useSettings } from '@/hooks/useSettings'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { ModelSelector } from './ModelSelector'
import { SettingsDialog } from './SettingsDialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ChatContainerProps {
  chatId: string | null
  onTitleGenerated: (chatId: string, title: string) => void
}

export function ChatContainer({ chatId, onTitleGenerated }: ChatContainerProps) {
  const { systemPrompt, saveSystemPrompt } = useSettings()

  const {
    messages,
    isLoading,
    selectedModel,
    setSelectedModel,
    sendMessage,
    clearMessages,
    availableModels,
  } = useChat({ chatId, onTitleGenerated, systemPrompt })

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
