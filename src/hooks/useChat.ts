import { useState, useCallback, useEffect } from 'react'
import { supabase, type Message } from '@/lib/supabase'

const AVAILABLE_MODELS = [
  { id: 'meta-llama/Llama-3.3-70B-Instruct-fast', name: 'Llama 3.3 70B (Fast)' },
  { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-fast', name: 'Llama 3.1 8B (Fast)' },
  { id: 'deepseek-ai/DeepSeek-V3-0324-fast', name: 'DeepSeek V3 (Fast)' },
  { id: 'deepseek-ai/DeepSeek-R1-0528-fast', name: 'DeepSeek R1 (Fast)' },
  { id: 'Qwen/Qwen3-32B-fast', name: 'Qwen3 32B (Fast)' },
  { id: 'Qwen/Qwen3-235B-A22B-Instruct-2507', name: 'Qwen3 235B' },
  { id: 'Qwen/Qwen3-235B-A22B-Thinking-2507', name: 'Qwen3 235B (Reasoning)' },
  { id: 'google/gemma-3-27b-it-fast', name: 'Gemma 3 27B (Fast)' },
  { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B' },
  { id: 'moonshotai/Kimi-K2-Instruct', name: 'Kimi K2' },
  { id: 'moonshotai/Kimi-K2-Thinking', name: 'Kimi K2 (Reasoning)' },
  { id: 'zai-org/GLM-4.5', name: 'GLM 4.5' },
]

interface UseChatOptions {
  chatId: string | null
  onTitleGenerated?: (chatId: string, title: string) => void
}

export function useChat({ chatId, onTitleGenerated }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id)

  const loadMessages = useCallback(async () => {
    if (!chatId) {
      setMessages([])
      return
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading messages:', error)
      return
    }

    setMessages(data || [])
  }, [chatId])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  const saveMessage = useCallback(async (message: Omit<Message, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single()

    if (error) {
      console.error('Error saving message:', error)
      return null
    }

    return data
  }, [])

  const generateTitle = useCallback(async (userMessage: string, assistantMessage: string) => {
    if (!chatId || !onTitleGenerated) return

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Generiere einen sehr kurzen Titel (maximal 30 Zeichen) für folgendes Gespräch. Antworte NUR mit dem Titel, ohne Anführungszeichen oder zusätzlichen Text.

Benutzer: ${userMessage.slice(0, 200)}
Assistent: ${assistantMessage.slice(0, 200)}`,
            },
          ],
          model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-fast',
          stream: false,
          enableTools: false,  // Keine Tools für Titel-Generierung
        }),
      })

      if (!response.ok) return

      const data = await response.json()
      const title = data.choices?.[0]?.message?.content?.trim()?.slice(0, 50)

      if (title) {
        onTitleGenerated(chatId, title)
      }
    } catch (error) {
      console.error('Error generating title:', error)
    }
  }, [chatId, onTitleGenerated])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || !chatId) return

    setIsLoading(true)

    const isFirstMessage = messages.length === 0

    // Add user message locally
    const userMessage: Message = {
      id: crypto.randomUUID(),
      chat_id: chatId,
      role: 'user',
      content,
      model: selectedModel,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])

    // Save user message to DB
    await saveMessage({ chat_id: chatId, role: 'user', content, model: selectedModel })

    // Prepare messages for API
    const apiMessages = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          model: selectedModel,
          stream: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      // Check if response contains error (returned as 200 with error in body)
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const jsonData = await response.json()
        if (jsonData.error) {
          throw new Error(jsonData.error)
        }
        // Non-streaming response
        const assistantContent = jsonData.choices?.[0]?.message?.content || ''
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          chat_id: chatId,
          role: 'assistant',
          content: assistantContent,
          model: selectedModel,
          created_at: new Date().toISOString(),
        }])
        await saveMessage({ chat_id: chatId, role: 'assistant', content: assistantContent, model: selectedModel })

        if (isFirstMessage) {
          generateTitle(content, assistantContent)
        }
        return
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Keine Stream-Antwort erhalten')
      }

      const decoder = new TextDecoder()
      let assistantContent = ''
      const assistantId = crypto.randomUUID()

      // Add placeholder for assistant message
      setMessages(prev => [...prev, {
        id: assistantId,
        chat_id: chatId,
        role: 'assistant',
        content: '',
        model: selectedModel,
        created_at: new Date().toISOString(),
      }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content || ''
            assistantContent += delta

            // Update assistant message
            setMessages(prev => prev.map(m =>
              m.id === assistantId ? { ...m, content: assistantContent } : m
            ))
          } catch {
            // Skip invalid JSON
          }
        }
      }

      // Save assistant message to DB
      await saveMessage({ chat_id: chatId, role: 'assistant', content: assistantContent, model: selectedModel })

      // Generate title after first message exchange
      if (isFirstMessage) {
        generateTitle(content, assistantContent)
      }

    } catch (error) {
      console.error('Error sending message:', error)
      // Add error message
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        chat_id: chatId,
        role: 'assistant',
        content: `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        created_at: new Date().toISOString(),
      }])
    } finally {
      setIsLoading(false)
    }
  }, [messages, selectedModel, isLoading, saveMessage, chatId, generateTitle])

  const clearMessages = useCallback(async () => {
    if (!chatId) return

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('chat_id', chatId)

    if (error) {
      console.error('Error clearing messages:', error)
    }
    setMessages([])
  }, [chatId])

  return {
    messages,
    isLoading,
    selectedModel,
    setSelectedModel,
    sendMessage,
    loadMessages,
    clearMessages,
    availableModels: AVAILABLE_MODELS,
  }
}
