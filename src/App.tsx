import { useEffect, useCallback } from 'react'
import { ChatContainer, ChatSidebar } from '@/components/chat'
import { useChats } from '@/hooks/useChats'

function App() {
  const {
    chats,
    currentChatId,
    loadChats,
    createChat,
    deleteChat,
    updateChatTitle,
    selectChat,
  } = useChats()

  useEffect(() => {
    loadChats()
  }, [loadChats])

  const handleNewChat = useCallback(async () => {
    await createChat()
  }, [createChat])

  const handleDeleteChat = useCallback(async (chatId: string) => {
    await deleteChat(chatId)
  }, [deleteChat])

  const handleTitleGenerated = useCallback(async (chatId: string, title: string) => {
    await updateChatTitle(chatId, title)
  }, [updateChatTitle])

  return (
    <main className="flex h-screen w-screen">
      <ChatSidebar
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={selectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />
      <div className="flex-1 h-full">
        <ChatContainer
          chatId={currentChatId}
          onTitleGenerated={handleTitleGenerated}
        />
      </div>
    </main>
  )
}

export default App
