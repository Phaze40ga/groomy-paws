import { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { api, ConversationWithDetails, MessageWithDetails, Customer } from '../../lib/api';
import { Send, MessageSquare, User, Search, ArrowLeft } from 'lucide-react';

export function AdminMessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageWithDetails[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConversationList, setShowConversationList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
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

  async function loadData() {
    try {
      const [conversationsRes, customersRes] = await Promise.all([
        api.getConversations(),
        api.getCustomers(),
      ]);
      setConversations(conversationsRes.conversations);
      setCustomers(customersRes.customers);
      
      // Auto-select first conversation if none selected (only on desktop)
      if (!selectedConversation && conversationsRes.conversations.length > 0 && window.innerWidth >= 768) {
        setSelectedConversation(conversationsRes.conversations[0].id);
        setShowConversationList(false);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectConversation(conversationId: string) {
    setSelectedConversation(conversationId);
    setSearchTerm('');
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
      
      // Refresh conversations
      const { conversations: allConversations } = await api.getConversations();
      setConversations(allConversations);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function handleCreateConversation(customerId: string) {
    try {
      const { conversation } = await api.createConversation(customerId);
      await loadData();
      setSelectedConversation(conversation.id);
      setSelectedCustomerId(null);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  const filteredConversations = conversations.filter((conv) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      conv.customer_name?.toLowerCase().includes(search) ||
      conv.customer_email?.toLowerCase().includes(search)
    );
  });

  const filteredCustomers = customers.filter((customer) => {
    if (!searchTerm) return false; // Only show when searching
    const search = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search)
    );
  });

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
          <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm md:text-base">Chat with customers</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-[calc(100vh-200px)] md:h-[calc(100vh-250px)] transition-colors duration-200">
          <div className="flex flex-1 overflow-hidden relative">
            {/* Conversations List */}
            <div className={`absolute md:relative inset-0 md:inset-auto w-full md:w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800 z-10 md:z-auto transition-transform duration-300 ${
              showConversationList ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            }`}>
              <div className="p-3 md:p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search conversations or customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 md:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-base md:text-sm touch-manipulation bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {/* Search Results - Customers */}
                {searchTerm && filteredCustomers.length > 0 && (
                  <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 px-2">Start New Conversation</p>
                    {filteredCustomers.map((customer) => {
                      const existingConv = conversations.find(c => c.customer_id === customer.id);
                      return (
                        <button
                          key={customer.id}
                          onClick={() => {
                            if (existingConv) {
                              handleSelectConversation(existingConv.id);
                            } else {
                              handleCreateConversation(customer.id);
                            }
                          }}
                          className="w-full p-3 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 transition-colors mb-1 touch-manipulation"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{customer.name}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{customer.email}</p>
                            </div>
                            {existingConv ? (
                              <span className="text-xs text-gray-500 ml-2">Existing</span>
                            ) : (
                              <span className="text-xs text-pink-600 ml-2">New</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Conversations */}
                {filteredConversations.length === 0 && !searchTerm ? (
                  <div className="p-6 md:p-8 text-center text-gray-500">
                    <MessageSquare className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-sm md:text-base">No conversations yet</p>
                    <p className="text-xs md:text-sm mt-2">Search for a customer to start chatting</p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => {
                    const profilePicUrl = getImageUrl(conversation.customer_profile_picture_url);
                    return (
                      <button
                        key={conversation.id}
                        onClick={() => handleSelectConversation(conversation.id)}
                        className={`w-full p-3 md:p-4 text-left border-b border-gray-100 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation ${
                          selectedConversation === conversation.id ? 'bg-pink-50 border-pink-200' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {profilePicUrl ? (
                            <div className="relative flex-shrink-0">
                              <img
                                src={profilePicUrl}
                                alt={conversation.customer_name || 'Unknown Customer'}
                                className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-pink-200"
                              />
                              {conversation.is_online && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                              )}
                            </div>
                          ) : (
                            <div className="relative flex-shrink-0">
                              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-pink-100 to-blue-100 flex items-center justify-center border-2 border-pink-200">
                                <User className="w-5 h-5 md:w-6 md:h-6 text-pink-600" />
                              </div>
                              {conversation.is_online && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-gray-900 text-sm md:text-base truncate">
                                {conversation.customer_name || 'Unknown Customer'}
                              </span>
                              {conversation.unread_count && conversation.unread_count > 0 && (
                                <span className="bg-pink-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center ml-2">
                                  {conversation.unread_count}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 truncate">
                              {conversation.customer_email}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
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
                      const headerPicUrl = getImageUrl(currentConversation?.customer_profile_picture_url);
                      return (
                        <div className="relative flex-shrink-0">
                          {headerPicUrl ? (
                            <img
                              src={headerPicUrl}
                              alt={currentConversation?.customer_name || 'Customer'}
                              className="w-10 h-10 rounded-full object-cover border-2 border-pink-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-blue-100 flex items-center justify-center border-2 border-pink-200">
                              <User className="w-5 h-5 text-pink-600" />
                            </div>
                          )}
                          {currentConversation?.is_online && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">
                          {currentConversation?.customer_name || 'Customer'}
                        </h3>
                        {currentConversation?.is_online && (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-xs text-green-600 font-medium">Online</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-gray-600 truncate">
                        {currentConversation?.customer_email || ''}
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
                                    {message.sender_role && message.sender_role !== 'customer' && (
                                      <span className="ml-1 text-xs opacity-75">
                                        ({message.sender_role})
                                      </span>
                                    )}
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
                        <Send className="w-4 h-4" />
                        <span className="md:hidden">Send</span>
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500 p-4">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-sm md:text-base">Select a conversation or search for a customer</p>
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

