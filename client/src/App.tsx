import { useEffect, useRef, useState } from 'react';
import { MantineProvider, Container, Title, Text, Flex, ActionIcon, Tooltip } from '@mantine/core';
import axios from 'axios';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ChatSidebar } from './components/ChatSidebar';
import type { ChatMessage as ChatMessageType } from './types';
import { IconBrain, IconPlus } from '@tabler/icons-react';

const API_BASE_URL = 'http://localhost:3000/api';

interface ChatSession {
    id: string;
    messages: ChatMessageType[];
    createdAt: Date;
    title?: string;
}

const STORAGE_KEY = 'chat_sessions';

export default function App() {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [sessions]);

    // Load sessions from localStorage
    // Load sessions from the server
    const loadSessions = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/chat/sessions`);
            const sessions = response.data.sessions.map((session: any) => ({
                ...session,
                createdAt: new Date(session.createdAt)
            }));
            setSessions(sessions);
            if (sessions.length > 0 && !currentSessionId) {
                setCurrentSessionId(sessions[sessions.length - 1].id);
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
        }
    };

    useEffect(() => {
        loadSessions();
    }, []);

    // Load chat history when switching sessions
    useEffect(() => {
        const loadChatHistory = async () => {
            if (!currentSessionId) return;
            
            try {
                const response = await axios.get(`${API_BASE_URL}/chat/session/${currentSessionId}`);
                const session = {
                    ...response.data,
                    createdAt: new Date(response.data.createdAt)
                };
                setSessions(prev => prev.map(s => 
                    s.id === currentSessionId ? session : s
                ));
            } catch (error) {
                console.error('Error loading chat history:', error);
            }
        };

        loadChatHistory();
    }, [currentSessionId]);

    const createNewSession = async () => {
        try {
            const response = await axios.post(`${API_BASE_URL}/chat/session`);
            const newSession: ChatSession = {
                id: response.data.sessionId,
                messages: [],
                createdAt: new Date(),
                title: 'New Chat'
            };
            setSessions(prev => [...prev, newSession]);
            setCurrentSessionId(newSession.id);
        } catch (error) {
            console.error('Error creating session:', error);
        }
    };

    // useEffect(() => {
    //     if (sessions.length === 0) {
    //         createNewSession();
    //     }
    // }, []);

    const updateSessionTitle = (sessionId: string, messages: ChatMessageType[]) => {
        if (messages.length === 1 && messages[0].role === 'user') {
            const title = messages[0].content.slice(0, 30) + (messages[0].content.length > 30 ? '...' : '');
            setSessions(prev => prev.map(session => 
                session.id === sessionId 
                    ? { ...session, title }
                    : session
            ));
        }
    };

    // Add state for customerId and apiKey
    const [customerId, setCustomerId] = useState<number | undefined>(undefined);
    const [apiKey, setApiKey] = useState<string | undefined>(undefined);

    // Load customerId and apiKey from localStorage on mount
    useEffect(() => {
        const savedCustomerId = localStorage.getItem('customerId');
        const savedApiKey = localStorage.getItem('apiKey');
        if (savedCustomerId) setCustomerId(parseInt(savedCustomerId));
        if (savedApiKey) setApiKey(savedApiKey);
    }, []);

    const handleSendMessage = async (content: string) => {
        if (!currentSessionId) return;

        const userMessage: ChatMessageType = { role: 'user', content };
        
        setSessions(prev => {
            const newSessions = prev.map(session => 
                session.id === currentSessionId 
                    ? { ...session, messages: [...session.messages, userMessage] }
                    : session
            );
            const currentSession = prev.find(s => s.id === currentSessionId);
            if (currentSession) {
                updateSessionTitle(currentSessionId, [...currentSession.messages, userMessage]);
            }
            return newSessions;
        });
        
        setIsLoading(true);

        try {
            const response = await axios.post(`${API_BASE_URL}/chat/${currentSessionId}`, {
                message: content,
                customerId : 2000,
                apiKey
            });

            const assistantMessage: ChatMessageType = {
                role: 'assistant',
                content: response.data.response
            };

            setSessions(prev => prev.map(session => 
                session.id === currentSessionId 
                    ? { ...session, messages: [...session.messages, assistantMessage] }
                    : session
            ));
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: ChatMessageType = {
                role: 'assistant',
                content: 'Sorry, there was an error processing your request. Please try again.'
            };
            setSessions(prev => prev.map(session => 
                session.id === currentSessionId 
                    ? { ...session, messages: [...session.messages, errorMessage] }
                    : session
            ));
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateCredentials = (newCustomerId: number | undefined, newApiKey: string | undefined) => {
        if (newCustomerId !== undefined) {
            setCustomerId(newCustomerId);
            localStorage.setItem('customerId', newCustomerId.toString());
        }
        if (newApiKey !== undefined) {
            setApiKey(newApiKey);
            localStorage.setItem('apiKey', newApiKey);
        }
    };

    const handleDeleteChat = async (sessionId: string) => {
        try {
            await axios.delete(`${API_BASE_URL}/chat/session/${sessionId}`);
            setSessions(prev => prev.filter(session => session.id !== sessionId));
            if (currentSessionId === sessionId) {
                const remainingSessions = sessions.filter(session => session.id !== sessionId);
                if (remainingSessions.length > 0) {
                    setCurrentSessionId(remainingSessions[remainingSessions.length - 1].id);
                }
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
        }
    };

    const currentSession = sessions.find(session => session.id === currentSessionId);

  return (
        <MantineProvider
            withGlobalStyles
            withNormalizeCSS
            theme={{
                defaultRadius: 'md',
                white: '#fff',
                black: '#1A1B1E',
                primaryColor: 'teal',
                primaryShade: { light: 6, dark: 8 },
                colors: {
                    dark: [
                        '#C1C2C5',
                        '#A6A7AB',
                        '#909296',
                        '#5C5F66',
                        '#373A40',
                        '#2C2E33',
                        '#25262B',
                        '#1A1B1E',
                        '#141517',
                        '#101113',
                    ]
                },
                other: {
                    colorScheme: 'dark'
                }
            }}
        >
            <div className="app-container">
                <ChatSidebar
                    sessions={sessions}
                    currentSessionId={currentSessionId || ''}
                    onNewChat={createNewSession}
                    onSelectChat={setCurrentSessionId}
                    onDeleteChat={handleDeleteChat}
                />
                <div className="chat-container">
                    <nav className="nav-bar">
                        <Container size="lg">
                            <Flex align="center" style={{ height: '100%', display: 'flex', gap: '20px', justifyContent: 'space-between' }}>
                                <Flex align="center" style={{ height: '100%', display: 'flex', gap: '20px', justifyContent: 'space-between' ,paddingLeft: '20px'}}>
                                    <IconBrain size={32} color="#10a37f" />
                                    <Title order={1} size="h3">Payment & Checkout Assistant</Title>
                                </Flex>
                                
                            </Flex>
                        </Container>
                    </nav>

                    <main className="main-content">
                        <div className="messages-container">
                            {(!currentSession || currentSession.messages.length === 0) ? (
                                <div className="welcome-screen">
                                    <IconBrain size={64} color="#10a37f" />
                                    <Title order={2} className="welcome-title">
                                        How can I help you today?
                                    </Title>
                                    <Text size="lg" color="dimmed" className="welcome-text">
                                        Ask me anything about our products. I can help you find products,
                                        compare specifications, and make recommendations based on your needs.
                                    </Text>
                                </div>
                            ) : (
                                <div className="messages-list">
                                    {currentSession.messages.map((message, index) => (
                                        <div 
                                            key={index} 
                                            className={`message-wrapper ${message.role}`}
                                        >
                                            <Container size="lg">
                                                <ChatMessage message={message} />
                                            </Container>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>

                        <div className="input-container">
                            <Container size="lg">
                                <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
                            </Container>
                        </div>
                    </main>
      </div>
      </div>
            <style jsx>{`
                .app-container {
                    display: flex;
                    min-height: 100vh;
                }

                .chat-container {
                    flex: 1;
                    margin-left: 320px;
                    min-height: 100vh;
                    background-color: #0f0f0f;
                    position: relative;
                }

                .nav-bar {
                    position: sticky;
                    top: 0;
                    background-color: rgba(15,15,15,0.95);
                    backdrop-filter: blur(10px);
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding: 16px 0;
                    z-index: 100;
                }

                .main-content {
                    min-height: calc(100vh - 70px);
                    display: flex;
                    flex-direction: column;
                }

                .messages-container {
                    flex: 1;
                    padding: 20px 0;
                }

                .welcome-screen {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 60vh;
                    text-align: center;
                    padding: 20px;
                    gap: 20px;
                }

                .welcome-title {
                    margin-top: 24px;
                    color: rgba(255,255,255,0.9);
                }

                .welcome-text {
                    max-width: 600px;
                    line-height: 1.6;
                }

                .messages-list {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .message-wrapper {
                    width: 100%;
                    padding: 20px 0;
                }

                .message-wrapper.user {
                    background-color: rgba(255,255,255,0.02);
                }

                .message-wrapper.assistant {
                    background-color: transparent;
                }

                .input-container {
                    position: sticky;
                    bottom: 0;
                    background-color: rgba(15,15,15,0.95);
                    backdrop-filter: blur(10px);
                    border-top: 1px solid rgba(255,255,255,0.1);
                    padding: 20px 0;
                }

                .new-chat-button {
                    color: rgba(255,255,255,0.7);
                    transition: all 0.2s ease;
                }

                .new-chat-button:hover {
                    color: #10a37f;
                    transform: scale(1.1);
                }
            `}</style>
        </MantineProvider>
    );
}