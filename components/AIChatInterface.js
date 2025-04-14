import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { FiSend, FiMessageSquare, FiX, FiMinimize2, FiMaximize2 } from 'react-icons/fi';

/**
 * AI Chat Interface Component
 * 
 * A floating chat widget that allows users to interact with the AI assistant.
 * Features include:
 * - Minimizable/maximizable interface
 * - Message history with user and assistant messages
 * - Typing indicator
 * - Suggested questions
 * - Mobile-responsive design
 */
const AIChatInterface = ({ initialOpen = false }) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([
    'What furniture design services do you offer?',
    'How do I book a consultation?',
    'What are your available appointment times?',
    'Can you help me with custom furniture design?'
  ]);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const user = useUser();
  const router = useRouter();
  
  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Focus input when chat is opened
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);
  
  // Load conversation history when user is authenticated
  useEffect(() => {
    if (user && isOpen) {
      loadConversationHistory();
    }
  }, [user, isOpen]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const loadConversationHistory = async () => {
    try {
      const response = await fetch('/api/ai/history');
      if (!response.ok) {
        throw new Error('Failed to load conversation history');
      }
      
      const data = await response.json();
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages);
      } else {
        // Add welcome message if no history
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: 'Hello! I\'m your Sturij Furniture Design assistant. How can I help you today?'
        }]);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
      // Add welcome message on error
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I\'m your Sturij Furniture Design assistant. How can I help you today?'
      }]);
    }
  };
  
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue
    };
    
    // Add user message to chat
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage.content,
          path: router.asPath // Current page path for context
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response from assistant');
      }
      
      const data = await response.json();
      
      // Add assistant response to chat
      setMessages(prevMessages => [...prevMessages, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.message.content
      }]);
      
      // Update suggested questions if provided
      if (data.suggestedQuestions && data.suggestedQuestions.length > 0) {
        setSuggestedQuestions(data.suggestedQuestions);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      setMessages(prevMessages => [...prevMessages, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again later.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleSuggestedQuestionClick = (question) => {
    setInputValue(question);
    // Focus the input after setting the value
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  const toggleChat = () => {
    if (isMinimized) {
      setIsMinimized(false);
    } else {
      setIsOpen(!isOpen);
    }
    
    // If opening the chat for the first time, load initial messages
    if (!isOpen && messages.length === 0) {
      if (user) {
        loadConversationHistory();
      } else {
        // Add welcome message for non-authenticated users
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: 'Hello! I\'m your Sturij Furniture Design assistant. How can I help you today?'
        }]);
      }
    }
  };
  
  const minimizeChat = () => {
    setIsMinimized(true);
  };
  
  const maximizeChat = () => {
    setIsMinimized(false);
  };
  
  const closeChat = () => {
    setIsOpen(false);
  };
  
  // Render message content with proper formatting
  const renderMessageContent = (content) => {
    // Split content by newlines and render paragraphs
    return content.split('\n').map((paragraph, index) => (
      paragraph ? <p key={index}>{paragraph}</p> : <br key={index} />
    ));
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {/* Chat button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
          aria-label="Open chat"
        >
          <FiMessageSquare size={24} />
        </button>
      )}
      
      {/* Chat interface */}
      {isOpen && (
        <div 
          className={`bg-white rounded-lg shadow-xl flex flex-col transition-all duration-300 ${
            isMinimized 
              ? 'w-72 h-16' 
              : 'w-80 sm:w-96 h-[32rem] sm:h-[36rem]'
          }`}
        >
          {/* Chat header */}
          <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white rounded-t-lg">
            <h3 className="font-medium">Sturij Design Assistant</h3>
            <div className="flex items-center space-x-2">
              {isMinimized ? (
                <button onClick={maximizeChat} className="text-white hover:text-gray-200" aria-label="Maximize">
                  <FiMaximize2 size={18} />
                </button>
              ) : (
                <button onClick={minimizeChat} className="text-white hover:text-gray-200" aria-label="Minimize">
                  <FiMinimize2 size={18} />
                </button>
              )}
              <button onClick={closeChat} className="text-white hover:text-gray-200" aria-label="Close">
                <FiX size={20} />
              </button>
            </div>
          </div>
          
          {/* Chat content - only shown when not minimized */}
          {!isMinimized && (
            <>
              {/* Messages container */}
              <div className="flex-1 p-4 overflow-y-auto">
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`mb-4 ${
                      message.role === 'user' 
                        ? 'flex justify-end' 
                        : 'flex justify-start'
                    }`}
                  >
                    <div 
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.role === 'user' 
                          ? 'bg-blue-600 text-white rounded-br-none' 
                          : 'bg-gray-100 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      {renderMessageContent(message.content)}
                    </div>
                  </div>
                ))}
                
                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-gray-100 text-gray-800 p-3 rounded-lg rounded-bl-none">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Invisible element to scroll to */}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Suggested questions */}
              {suggestedQuestions.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestedQuestionClick(question)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded-full transition-colors"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Input area */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={1}
                    style={{ maxHeight: '100px', minHeight: '40px' }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    className={`p-2 rounded-r-lg ${
                      !inputValue.trim() || isLoading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    aria-label="Send message"
                  >
                    <FiSend size={20} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AIChatInterface;
