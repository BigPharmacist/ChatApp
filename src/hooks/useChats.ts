import { useState, useCallback } from 'react'
import { supabase, type Chat } from '@/lib/supabase'

export function useChats() {
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)

  const loadChats = useCallback(async () => {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error loading chats:', error)
      return
    }

    setChats(data || [])

    // Select first chat if none selected
    if (!currentChatId && data && data.length > 0) {
      setCurrentChatId(data[0].id)
    }
  }, [currentChatId])

  const createChat = useCallback(async () => {
    const { data, error } = await supabase
      .from('chats')
      .insert({ title: null })
      .select()
      .single()

    if (error) {
      console.error('Error creating chat:', error)
      return null
    }

    setChats(prev => [data, ...prev])
    setCurrentChatId(data.id)
    return data
  }, [])

  const deleteChat = useCallback(async (chatId: string) => {
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId)

    if (error) {
      console.error('Error deleting chat:', error)
      return
    }

    setChats(prev => {
      const newChats = prev.filter(c => c.id !== chatId)
      // Select another chat if current was deleted
      if (currentChatId === chatId) {
        setCurrentChatId(newChats.length > 0 ? newChats[0].id : null)
      }
      return newChats
    })
  }, [currentChatId])

  const updateChatTitle = useCallback(async (chatId: string, title: string) => {
    const { error } = await supabase
      .from('chats')
      .update({ title })
      .eq('id', chatId)

    if (error) {
      console.error('Error updating chat title:', error)
      return
    }

    setChats(prev => prev.map(c =>
      c.id === chatId ? { ...c, title } : c
    ))
  }, [])

  const selectChat = useCallback((chatId: string) => {
    setCurrentChatId(chatId)
  }, [])

  return {
    chats,
    currentChatId,
    loadChats,
    createChat,
    deleteChat,
    updateChatTitle,
    selectChat,
  }
}
