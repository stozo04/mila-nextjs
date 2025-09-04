// src/components/shared/chatbot/OpenAIChatBot.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';

type Role = 'user' | 'bot';

type Message =
  | { type: 'user'; content: string }
  | { type: 'bot'; content: string; sources?: { file_id?: string; title?: string; quote?: string }[] };


const TypingIndicator = () => (
  <div className="typing-indicator">
    <span></span>
    <span></span>
    <span></span>
    <style jsx>{`
      .typing-indicator {
        display: flex;
        gap: 4px;
        padding: 2px 4px;
        align-items: center;
      }
      .typing-indicator span {
        width: 6px;
        height: 6px;
        background-color: #6c757d;
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out;
        display: inline-block;
      }
      .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
      .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
      @keyframes bounce {
        0%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-6px); }
      }
    `}</style>
  </div>
);

export default function OpenAIChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Mila transform from your original ---
  const transformMessage = (input: string): string => {
    let transformed = input.replace(/\b(you|your|yours|yourself)\b/gi, (match) => {
      const replacements: Record<string, string> = {
        'you': 'Mila',
        'your': "Mila's",
        'yours': "Mila's",
        'yourself': 'herself',
      };
      return replacements[match.toLowerCase()] || match;
    });
    transformed = transformed.replace(/\bMila are\b/gi, 'Mila is');
    return transformed;
  };

  // --- Keep scroll pinned to bottom ---
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  // --- Reset state helpers (no history retention) ---
  const resetChat = React.useCallback(() => {
    setMessages([]);
    setMessage('');
    setConversationId(null);
    setIsLoading(false);
    try { localStorage.removeItem('openai-chatbot-state'); } catch { }
  }, []);

  // Clear any persisted state on initial load so each page view is fresh
  useEffect(() => {
    resetChat();
  }, [resetChat]);

  // --- Submit handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
  
    const userMsg: Message = { type: 'user', content: message };
    setMessages(prev => [...prev, userMsg]);
  
    const outgoing = transformMessage(message.trim());
    setMessage('');
    setIsLoading(true);
  
    try {
      {
        // --- STREAMING PATH ---
        // Insert an empty bot bubble we’ll fill as tokens arrive
        const botIndex = messages.length + 1; // after pushing user
        setMessages(prev => [...prev, { type: 'bot', content: '' }]);
  
        const res = await fetch('/api/chat-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: outgoing,
            conversationId: conversationId || undefined,
          }),
        });
  
        if (!res.ok || !res.body) {
          throw new Error(`Stream request failed (${res.status})`);
        }
  
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let localSources: { file_id?: string; title?: string; quote?: string }[] = [];
  
        // Simple SSE parser: chunks split by double newline
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
  
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';
  
          for (const part of parts) {
            const lines = part.split('\n').filter(Boolean);
            const eventLine = lines.find(l => l.startsWith('event:'));
            const dataLine = lines.find(l => l.startsWith('data:')) || 'data:';
  
            const evt = eventLine?.slice(6).trim(); // after 'event:'
            const data = dataLine.slice(5); // after 'data:'
  
            if (!evt) {
              // default: token chunk
              const token = data;
              setMessages(prev => {
                const copy = [...prev];
                const current = copy[botIndex] as Message;
                const prevText = (current?.type === 'bot' ? current.content : '');
                copy[botIndex] = { type: 'bot', content: prevText + token, sources: localSources };
                return copy;
              });
            } else if (evt === 'error') {
              throw new Error(data);
            } else if (evt === 'done') {
              const payload = JSON.parse(data || '{}') as { conversationId?: string | null; sources?: any[] };
              if (payload?.conversationId != null) setConversationId(payload.conversationId);
              localSources = payload?.sources || [];
              // ensure final sources attached
              setMessages(prev => {
                const copy = [...prev];
                const current = copy[botIndex] as Message;
                copy[botIndex] = { type: 'bot', content: current?.content || '', sources: localSources };
                return copy;
              });
            }
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { type: 'bot', content: `Sorry, something went wrong: ${err?.message || 'Unknown error'}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="position-fixed bottom-0 end-0 mb-4 me-4" style={{ zIndex: 1050 }}>
      {/* Toggle Button */}
      <button
        onClick={() => {
          if (isOpen) {
            // Closing via toggle button (X)
            resetChat();
            setIsOpen(false);
          } else {
            // Opening fresh
            resetChat();
            setIsOpen(true);
          }
        }}
        className="btn btn-primary rounded-circle p-3 shadow"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        type="button"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
            <path d="m2.165 15.803.02-.004c1.83-.363 2.948-.842 3.468-1.105A9.06 9.06 0 0 0 8 15c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6a10.437 10.437 0 0 1-.524 2.318l-.003.011a10.722 10.722 0 0 1-.244.637c-.079.186.074.394.273.362a21.673 21.673 0 0 0 .693-.125zm.8-3.108a1 1 0 0 0-.287-.801C1.618 10.83 1 9.468 1 8c0-3.192 3.004-6 7-6s7 2.808 7 6c0 3.193-3.004 6-7 6a8.06 8.06 0 0 1-2.088-.272 1 1 0 0 0-.711.074c-.387.196-1.24.57-2.634.893a10.97 10.97 0 0 0 .398-2"/>
          </svg>
        )}
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="position-fixed bottom-0 end-0 mb-4 me-4">
          <div className="card shadow" style={{ width: '300px' }}>
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Chat with me</h5>
              <button
                onClick={() => { resetChat(); setIsOpen(false); }}
                className="btn btn-link text-white p-0 border-0"
                style={{ fontSize: '1.5rem', lineHeight: 1 }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="card-body d-flex flex-column" style={{ height: '400px' }}>
              <div className="flex-grow-1 overflow-auto mb-3">
                {messages.length === 0 ? (
                  <p className="text-muted">What would you like to know about me...</p>
                ) : (
                  <>
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`d-flex ${msg.type === 'user' ? 'justify-content-end' : 'justify-content-start'} mb-2`}
                      >
                        <div
                          className={`p-2 rounded ${msg.type === 'user' ? 'bg-primary text-white' : 'bg-light'}`}
                          style={{ maxWidth: '75%' }}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="d-flex justify-content-start mb-2">
                        <div className="p-2 rounded bg-light" style={{ minWidth: '4rem' }}>
                          <TypingIndicator />
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSubmit} className="mt-auto">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Type your message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isLoading || !message.trim()}
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}