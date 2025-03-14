'use client'

import React, { useState, useRef, useEffect } from 'react'

type Message = {
    type: 'user' | 'bot'
    content: string
}

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
)

export default function OpenAIChatBot() {
    const [isOpen, setIsOpen] = useState(false)
    const [message, setMessage] = useState('')
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const [threadId, setThreadId] = useState<string | null>(null);
    const [runId, setRunId] = useState<string | null>(null);
    const pollingInterval = useRef<NodeJS.Timeout | null>(null);

    // Helper function to transform message
    const transformMessage = (input: string): string => {
        // First replace pronouns with Mila
        let transformed = input.replace(/\b(you|your|yours|yourself)\b/gi, (match) => {
            const replacements: { [key: string]: string } = {
                'you': 'Mila',
                'your': "Mila's",
                'yours': "Mila's",
                'yourself': 'herself'
            };
            return replacements[match.toLowerCase()] || match;
        });

        // Then fix grammar - replace "are" with "is" when it follows Mila
        transformed = transformed.replace(/\bMila are\b/gi, 'Mila is');
        
        return transformed;
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isLoading])

    useEffect(() => {
        if (threadId && runId) {
            startPolling();
        }
        return () => stopPolling(); // Cleanup interval on unmount or threadId/runId change
    }, [threadId, runId]);

    const startPolling = () => {
        stopPolling(); // Clear any existing interval

        pollingInterval.current = setInterval(async () => {
            try {
                const pollResponse = await fetch('/api/poll-chat-status', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ threadId, runId }),
                });

                if (!pollResponse.ok) {
                    console.error('Error polling status:', pollResponse);
                    stopPolling(); // Stop polling on error
                    setIsLoading(false);
                    const errorMessage: Message = {
                        type: 'bot',
                        content: 'Sorry, I encountered an error during polling. Please try again.'
                    };
                    setMessages(prev => [...prev, errorMessage]);
                    return;
                }

                const pollData = await pollResponse.json();
                if (pollData.status === 'completed') {
                    stopPolling(); // Stop polling once completed
                    if (threadId && runId) { // Ensure threadId and runId are not null before calling
                      fetchFinalAnswer(threadId, runId);
                    } else {
                      console.error("Error: threadId or runId is null when trying to fetch final answer after polling completion.");
                      // Handle this unexpected state, maybe set an error message for the user.
                      const errorMessage: Message = {
                          type: 'bot',
                          content: 'Sorry, there was an unexpected issue retrieving the final answer. Please try again.'
                      };
                      setMessages(prev => [...prev, errorMessage]);
                      setIsLoading(false);
                  }
                } else if (pollData.status === 'failed') {
                    stopPolling();
                    setIsLoading(false);
                    const errorMessage: Message = {
                        type: 'bot',
                        content: 'Sorry, the AI run failed to complete.'
                    };
                    setMessages(prev => [...prev, errorMessage]);
                } // else status is 'queued', 'running', etc., continue polling

            } catch (error) {
                console.error('Polling error:', error);
                stopPolling();
                setIsLoading(false);
                const errorMessage: Message = {
                    type: 'bot',
                        content: 'Sorry, I encountered an error during polling. Please try again.'
                    };
                setMessages(prev => [...prev, errorMessage]);
            }
        }, 3000); // Poll every 3 seconds (adjust as needed)
    };

    const stopPolling = () => {
        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
        }
    };


    const fetchFinalAnswer = async (currentThreadId: string, currentRunId: string) => {
        try {
            const response = await fetch('/api/chat', { // Call /api/chat to get final answer
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ threadId: currentThreadId, runId: currentRunId, getAnswer: true }), // Include getAnswer: true
            });

            if (!response.ok) {
                throw new Error('Failed to get final answer');
            }

            const data = await response.json();
            const botMessage: Message = {
                type: 'bot',
                content: data.answer
            };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('Error fetching final answer:', error);
            const errorMessage: Message = {
                type: 'bot',
                content: 'Sorry, I failed to retrieve the final answer.'
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            setThreadId(null); // Clear thread and run IDs after completion/error
            setRunId(null);
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!message.trim() || isLoading) return

        // Add user message
        const userMessage: Message = { type: 'user', content: message }
        setMessages(prev => [...prev, userMessage])
        setMessage('')
        setIsLoading(true)
        setThreadId(null); // Clear any previous thread and run IDs for a new request
        setRunId(null);

        try {
            const transformedMessage = transformMessage(message.trim());
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question: transformedMessage }),
            });

            if (!response.ok && response.status !== 202) { // Check for 202 Accepted status
                throw new Error(`Failed to start chat processing, status: ${response.status}`);
            }

            const data = await response.json();
            if (data.threadId && data.runId) {
                setThreadId(data.threadId); // Store threadId for polling
                setRunId(data.runId);     // Store runId for polling
            } else {
                throw new Error('Did not receive threadId and runId from /api/chat');
            }


        } catch (error: any) {
            console.error('Error starting chat:', error);
            setIsLoading(false);
            const errorMessage: Message = {
                type: 'bot',
                content: 'Sorry, I encountered an error starting the chat. Please try again.'
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    }

    return (
        <div className="position-fixed bottom-0 end-0 mb-4 me-4">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="btn btn-primary rounded-circle p-3 shadow"
            >
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
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
                                onClick={() => setIsOpen(false)}
                                className="btn btn-link text-white p-0 border-0"
                                style={{ fontSize: '1.5rem', lineHeight: 1 }}
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
                                        {messages.map((msg, index) => (
                                            <div
                                                key={index}
                                                className={`d-flex ${msg.type === 'user' ? 'justify-content-end' : 'justify-content-start'} mb-2`}
                                            >
                                                <div
                                                    className={`p-2 rounded ${
                                                        msg.type === 'user' ? 'bg-primary text-white' : 'bg-light'
                                                    }`}
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
    )
}