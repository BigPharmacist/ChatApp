import { useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface MessageInputProps {
  onSend: (message: string) => void
  isLoading: boolean
}

export function MessageInput({ onSend, isLoading }: MessageInputProps) {
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim())
      setInput('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t p-4">
      <div className="max-w-3xl mx-auto flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nachricht eingeben... (Enter zum Senden, Shift+Enter für neue Zeile)"
          className="min-h-[60px] max-h-[200px] resize-none"
          disabled={isLoading}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="self-end"
        >
          {isLoading ? 'Sendet...' : 'Senden'}
        </Button>
      </div>
    </div>
  )
}
