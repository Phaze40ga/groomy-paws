import { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { api, ConversationWithDetails, MessageWithDetails } from '../../lib/api';
import { Send, MessageSquare, User, ArrowLeft } from 'lucide-react';

export function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageWithDetails[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    // Update online status when component mounts
    api.updateOnlineStatus().catch(console.error);
    
    // Update online status every 30 seconds
    const onlineInterval = setInterval(() => {
      api.updateOnlineStatus().catch(console.error);
    }, 30000);

    return () => clearInterval(onlineInterval);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      // Auto-refresh messages every 5 seconds
      const interval = setInterval(() => {
        loadMessages(selectedConversation);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadConversations() {
    try {
      const { conversations: allConversations } = await api.getConversations();
      setConversations(allConversations);
      
      // Auto-select first conversation if none selected (only on desktop)
      if (!selectedConversation && allConversations.length > 0 && window.innerWidth >= 768) {
        setSelectedConversation(allConversations[0].id);
        setShowConversationList(false);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectConversation(conversationId: string) {
    setSelectedConversation(conversationId);
    // On mobile, hide conversation list when selecting a conversation
    if (window.innerWidth < 768) {
      setShowConversationList(false);
    }
  }

  function handleBackToConversations() {
    setShowConversationList(true);
  }

  async function loadMessages(conversationId: string) {
    try {
      const { messages: allMessages } = await api.getMessages(conversationId, 50);
      setMessages(allMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }

  async function handleSendMessage() {
    if (!selectedConversation || !newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { message } = await api.sendMessage(selectedConversation, newMessage);
      setMessages([...messages, message]);
      setNewMessage('');
      
      // Refresh conversations to update last_message_at
      loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function handleCreateConversation() {
    try {
      const { conversation } = await api.createConversation();
      await loadConversations();
      setSelectedConversation(conversation.id);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  const currentConversation = conversations.find(c => c.id === selectedConversation);

  // Helper function to get full image URL
  const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return `${apiBase}${url}`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading messages...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="px-2 md:px-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Messages</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm md:text-base">Chat with our grooming staff</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-[calc(100vh-200px)] md:h-[calc(100vh-250px)] transition-colors duration-200">
          <div className="flex flex-1 overflow-hidden relative">
            {/* Conversations List */}
            <div className={`absolute md:relative inset-0 md:inset-auto w-full md:w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800 z-10 md:z-auto transition-transform duration-300 ${
              showConversationList ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            }`}>
              <div className="p-3 md:p-4 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleCreateConversation}
                  className="w-full px-4 py-2.5 md:py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-semibold text-sm md:text-base"
                >
                  New Conversation
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-6 md:p-8 text-center text-gray-500 dark:text-gray-400">
                    <MessageSquare className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                    <p className="text-sm md:text-base text-gray-900 dark:text-gray-100">No conversations yet</p>
                    <p className="text-xs md:text-sm mt-2 text-gray-600 dark:text-gray-300">Start a new conversation to get help</p>
                  </div>
                ) : (
                  conversations.map((conversation) => {
                    // For customers, show staff/admin info instead of customer info
                    const displayName = conversation.staff_name || 'Groomy Paws Staff';
                    const profilePicUrl = getImageUrl(conversation.staff_profile_picture_url || conversation.customer_profile_picture_url);
                    return (
                      <button
                        key={conversation.id}
                        onClick={() => handleSelectConversation(conversation.id)}
                        className={`w-full p-3 md:p-4 text-left border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 transition-colors touch-manipulation ${
                          selectedConversation === conversation.id ? 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-700' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {profilePicUrl ? (
                            <img
                              src={profilePicUrl}
                              alt={displayName}
                              className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-pink-200 dark:border-pink-700 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-pink-100 to-blue-100 dark:from-pink-900/30 dark:to-blue-900/30 flex items-center justify-center border-2 border-pink-200 dark:border-pink-700 flex-shrink-0">
                              <User className="w-5 h-5 md:w-6 md:h-6 text-pink-600 dark:text-pink-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm md:text-base truncate">
                                {displayName}
                              </span>
                              {conversation.unread_count && conversation.unread_count > 0 && (
                                <span className="bg-pink-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center ml-2">
                                  {conversation.unread_count}
                                </span>
                              )}
                            </div>
                            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 truncate">
                              {new Date(conversation.last_message_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className={`flex-1 flex flex-col absolute md:relative inset-0 bg-white dark:bg-gray-800 z-20 md:z-auto transition-transform duration-300 ${
              selectedConversation && !showConversationList ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
            }`}>
              {selectedConversation ? (
                <>
                  {/* Messages Header */}
                  <div className="p-3 md:p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex items-center gap-3">
                    <button
                      onClick={handleBackToConversations}
                      className="md:hidden p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                    {(() => {
                      // For customers, show staff/admin info instead of customer info
                      const displayName = currentConversation?.staff_name || 'Groomy Paws Staff';
                      const headerPicUrl = getImageUrl(currentConversation?.staff_profile_picture_url || currentConversation?.customer_profile_picture_url);
                      return headerPicUrl ? (
                        <img
                          src={headerPicUrl}
                          alt={displayName}
                          className="w-10 h-10 rounded-full object-cover border-2 border-pink-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-blue-100 flex items-center justify-center border-2 border-pink-200 flex-shrink-0">
                          <User className="w-5 h-5 text-pink-600" />
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm md:text-base truncate">
                        {currentConversation?.staff_name || 'Groomy Paws Staff'}
                      </h3>
                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 truncate">
                        {currentConversation?.customer_email || 'We\'re here to help!'}
                      </p>
                    </div>
                  </div>

                  {/* Messages List */}
                  <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 md:py-12 text-gray-500">
                        <MessageSquare className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-sm md:text-base">No messages yet</p>
                        <p className="text-xs md:text-sm mt-2">Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isOwnMessage = message.sender_id === user?.id;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`flex items-start gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                              {(() => {
                                const messagePicUrl = getImageUrl(message.sender_profile_picture_url);
                                return messagePicUrl ? (
                                  <img
                                    src={messagePicUrl}
                                    alt={message.sender_name || 'Unknown'}
                                    className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border-2 border-pink-200 flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-pink-100 to-blue-100 flex items-center justify-center border-2 border-pink-200 flex-shrink-0">
                                    <User className="w-4 h-4 md:w-5 md:h-5 text-pink-600" />
                                  </div>
                                );
                              })()}
                              <div
                                className={`max-w-[85%] sm:max-w-xs md:max-w-md px-3 md:px-4 py-2 md:py-2.5 rounded-lg ${
                                  isOwnMessage
                                    ? 'bg-pink-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold truncate">
                                    {message.sender_name || 'Unknown'}
                                  </span>
                                </div>
                                <p className="text-sm md:text-base whitespace-pre-wrap break-words">{message.body}</p>
                                <p className={`text-xs mt-1 ${
                                  isOwnMessage ? 'text-pink-100' : 'text-gray-500'
                                }`}>
                                  {new Date(message.created_at).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-3 md:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-200">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-3 md:px-4 py-2.5 md:py-2 text-base md:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent touch-manipulation bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400"
                        disabled={sending}
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="px-4 md:px-6 py-2.5 md:py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 active:bg-pink-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 touch-manipulation min-w-[70px] md:min-w-auto"
                      >
                        <Send className="w-4 h-4 md:w-4 md:h-4" />
                        <span className="md:hidden">Send</span>
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500 p-4">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-sm md:text-base">Select a conversation or start a new one</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

