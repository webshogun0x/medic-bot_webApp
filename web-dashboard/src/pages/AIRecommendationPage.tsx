import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Sparkles, Loader, RefreshCw } from 'lucide-react';
import { aiAPI, readingsAPI } from '../services/api';

interface AIRecommendationPageProps {
  onBack: () => void;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
}

const AIRecommendationPage: React.FC<AIRecommendationPageProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    type: 'ai',
    content: 'Hello! 👋 I\'m your AI health assistant. I can provide personalized health recommendations based on your readings and medical history. What would you like to know about your health?',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleGenerateRecommendations = async () => {
    if (!inputValue.trim()) {
      return;
    }

    try {
      setSending(true);
      setError(null);

      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: inputValue.trim(),
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      };

      setMessages(prev => [...prev, userMessage]);
      setInputValue('');

      // Call AI API to chat
      const response = await aiAPI.chat(inputValue.trim());
      const aiResponseText = response.data.response;

      // Add AI response
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: aiResponseText,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('Error sending message:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Unable to get response. Please try again.';
      
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: '❌ ' + (err.response?.data?.message || errorMessage),
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      };

      setMessages(prev => [...prev, aiMessage]);
      setError(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = () => {
    setMessages([{
      id: 'welcome',
      type: 'ai',
      content: 'Hello! 👋 I\'m your AI health assistant. I can provide personalized health recommendations based on your readings and medical history. What would you like to know about your health?',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    }]);
  };

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      height: '100vh',
      backgroundColor: '#ffffff',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: '#ffffff'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    backButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#2563eb',
      padding: '8px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      transition: 'background-color 0.2s'
    },
    headerTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '20px',
      fontWeight: '600',
      color: '#111827'
    },
    refreshButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#2563eb',
      padding: '8px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      transition: 'transform 0.3s'
    },
    messagesContainer: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '20px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '12px',
      backgroundColor: '#ffffff'
    },
    messageGroup: {
      display: 'flex',
      gap: '8px',
      marginBottom: '8px'
    },
    messageGroupAI: {
      justifyContent: 'flex-start' as const
    },
    messageGroupUser: {
      justifyContent: 'flex-end' as const
    },
    messageBubble: {
      maxWidth: '75%',
      padding: '12px 16px',
      borderRadius: '12px',
      fontSize: '14px',
      lineHeight: '1.5',
      wordWrap: 'break-word' as const
    },
    messageBubbleAI: {
      backgroundColor: '#f3f4f6',
      color: '#111827',
      borderBottomLeftRadius: '4px'
    },
    messageBubbleUser: {
      backgroundColor: '#2563eb',
      color: '#ffffff',
      borderBottomRightRadius: '4px'
    },
    timestamp: {
      fontSize: '12px',
      color: '#9ca3af',
      marginTop: '4px'
    },
    inputContainer: {
      borderTop: '1px solid #e5e7eb',
      padding: '16px 20px',
      backgroundColor: '#ffffff'
    },
    inputWrapper: {
      display: 'flex',
      gap: '8px',
      alignItems: 'flex-end'
    },
    input: {
      flex: 1,
      padding: '12px 16px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'inherit',
      resize: 'none' as const,
      maxHeight: '100px',
      minHeight: '44px',
      transition: 'border-color 0.2s'
    },
    sendButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#2563eb',
      padding: '12px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      transition: 'background-color 0.2s'
    },
    sendButtonDisabled: {
      cursor: 'not-allowed',
      opacity: 0.5
    },
    loadingContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%'
    },
    loadingSpinner: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '16px'
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: '3px solid #e5e7eb',
      borderTop: '3px solid #2563eb',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    emptyState: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: '#6b7280',
      gap: '12px'
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            style={styles.backButton}
            onClick={onBack}
            title="Back to Dashboard"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={styles.headerTitle}>
            <Sparkles size={20} />
            AI Health Assistant
          </div>
        </div>
        <button
          style={styles.refreshButton}
          onClick={handleRefresh}
          title="Refresh recommendations"
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'rotate(180deg)')}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Messages Area */}
      {false ? (
        <div style={styles.messagesContainer}>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner}>
              <div style={styles.spinner}></div>
              <p>Loading recommendations...</p>
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.messagesContainer}>
          {messages.length === 0 ? (
            <div style={styles.emptyState}>
              <Sparkles size={32} color="#2563eb" />
              <p>No messages yet. Ask me anything about your health!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} style={{
                ...styles.messageGroup,
                ...(msg.type === 'ai' ? styles.messageGroupAI : styles.messageGroupUser)
              }}>
                <div>
                  <div style={{
                    ...styles.messageBubble,
                    ...(msg.type === 'ai' ? styles.messageBubbleAI : styles.messageBubbleUser)
                  }}>
                    {msg.content}
                  </div>
                  <div style={{
                    ...styles.timestamp,
                    textAlign: msg.type === 'user' ? 'right' as const : 'left' as const,
                    paddingRight: msg.type === 'user' ? '8px' : '0',
                    paddingLeft: msg.type === 'ai' ? '8px' : '0'
                  }}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input Area */}
      {!false && (
        <div style={styles.inputContainer}>
          <div style={styles.inputWrapper}>
            <textarea
              style={styles.input}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerateRecommendations();
                }
              }}
              placeholder="Ask me about your health... (Shift+Enter for new line)"
              disabled={sending}
            />
            <button
              style={{
                ...styles.sendButton,
                ...(sending ? styles.sendButtonDisabled : {})
              }}
              onClick={handleGenerateRecommendations}
              disabled={sending}
              title="Send message"
              onMouseEnter={(e) => {
                if (!sending) (e.currentTarget.style.backgroundColor = '#f3f4f6');
              }}
              onMouseLeave={(e) => {
                (e.currentTarget.style.backgroundColor = 'transparent');
              }}
            >
              {sending ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIRecommendationPage;
