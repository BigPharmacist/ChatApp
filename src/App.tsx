import { useEffect, useCallback, useState } from 'react'
import { ChatContainer, ChatSidebar, type SidebarView } from '@/components/chat'
import { useChats } from '@/hooks/useChats'
import { useDocuments } from '@/hooks/useDocuments'

function App() {
  const [activeView, setActiveView] = useState<SidebarView>('chats')
  const [ragEnabled, setRagEnabled] = useState(false)
  const [webSearchEnabled, setWebSearchEnabled] = useState(true)

  const {
    chats,
    currentChatId,
    loadChats,
    createChat,
    deleteChat,
    updateChatTitle,
    selectChat,
  } = useChats()

  const {
    documents,
    isLoading: isLoadingDocuments,
    isUploading: isUploadingDocument,
    uploadProgress,
    loadDocuments,
    uploadDocument,
    deleteDocument,
    reindexDocument,
    documentCount,
  } = useDocuments()

  useEffect(() => {
    loadChats()
    loadDocuments()
  }, [loadChats, loadDocuments])

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
        activeView={activeView}
        onViewChange={setActiveView}
        documents={documents}
        isLoadingDocuments={isLoadingDocuments}
        isUploadingDocument={isUploadingDocument}
        uploadProgress={uploadProgress}
        onUploadDocument={uploadDocument}
        onDeleteDocument={deleteDocument}
        onReindexDocument={reindexDocument}
      />
      <div className="flex-1 h-full">
        <ChatContainer
          chatId={currentChatId}
          onTitleGenerated={handleTitleGenerated}
          ragEnabled={ragEnabled}
          onRagToggle={setRagEnabled}
          documentCount={documentCount}
          webSearchEnabled={webSearchEnabled}
          onWebSearchToggle={setWebSearchEnabled}
        />
      </div>
    </main>
  )
}

export default App
