import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { Message } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
}

function parseThinking(content: string): { thinking: string | null; response: string } {
  // Match <think>...</think> tags (DeepSeek R1 format)
  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/i)

  if (thinkMatch) {
    const thinking = thinkMatch[1].trim()
    const response = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
    return { thinking, response }
  }

  return { thinking: null, response: content }
}

function ThinkingBlock({ thinking }: { thinking: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-2">
      <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <span className={cn(
          "transition-transform",
          isOpen ? "rotate-90" : ""
        )}>
          ▶
        </span>
        <span className="font-medium">
          {isOpen ? 'Thinking verbergen' : 'Thinking anzeigen'}
        </span>
        <span className="opacity-60">
          ({thinking.length} Zeichen)
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-3 bg-muted/50 rounded border border-border/50 text-sm text-muted-foreground whitespace-pre-wrap max-h-[300px] overflow-y-auto">
          {thinking}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-none pl-0 mb-2">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        code: ({ children, className }) => {
          const isInline = !className
          return isInline ? (
            <code className="bg-background/50 px-1 py-0.5 rounded text-sm">{children}</code>
          ) : (
            <code className="block bg-background/50 p-2 rounded text-sm overflow-x-auto my-2">{children}</code>
          )
        },
        pre: ({ children }) => <pre className="bg-background/50 p-3 rounded overflow-x-auto my-2">{children}</pre>,
        h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-border pl-3 my-2 italic">{children}</blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  return (
    <ScrollArea className="h-full p-4">
      <div className="space-y-4 max-w-3xl mx-auto">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            Starte eine Konversation mit einem Open-Source LLM
          </div>
        )}
        {messages.map((message) => {
          const { thinking, response } = message.role === 'assistant'
            ? parseThinking(message.content)
            : { thinking: null, response: message.content }

          return (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-4 py-2',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {thinking && <ThinkingBlock thinking={thinking} />}
                <div className="break-words">
                  {message.role === 'assistant' ? (
                    <MarkdownContent content={response} />
                  ) : (
                    <p className="whitespace-pre-wrap">{response}</p>
                  )}
                </div>
                {message.model && message.role === 'assistant' && (
                  <p className="text-xs mt-1 opacity-60">
                    {message.model.split('/').pop()}
                  </p>
                )}
              </div>
            </div>
          )
        })}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2">
              <div className="flex gap-1">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce delay-100">.</span>
                <span className="animate-bounce delay-200">.</span>
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  )
}
