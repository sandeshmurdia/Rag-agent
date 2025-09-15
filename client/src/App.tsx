import { useEffect, useRef, useState, Fragment, type FC, type ReactElement } from 'react';
import { MantineProvider, Container, Title, Text, Button, Box, Group } from '@mantine/core';
import type { MantineThemeOverride, MantineProviderProps } from '@mantine/core';
import axios from 'axios';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ChatSidebar } from './components/ChatSidebar';
import type { ChatMessage as ChatMessageType } from './types';
import { IconBrain, IconChartBar } from '@tabler/icons-react';
import InsightsScreen from './components/InsightsScreen';

const API_BASE_URL = 'http://localhost:3000/api';

interface ChatSession {
    id: string;
    messages: ChatMessageType[];
    createdAt: Date;
    title?: string;
}

const App: FC = (): ReactElement => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showInsights, setShowInsights] = useState(false);
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
                customerId : 10,
                apiKey : "abc"
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

  const theme: MantineThemeOverride = {
    defaultRadius: 'md',
    white: '#fff',
    black: '#1A1B1E',
    primaryColor: 'teal',
    primaryShade: 6,
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
    }
  };

  const content: ReactElement = (
        <MantineProvider theme={theme}>
            <Box className="app-container">
                <ChatSidebar
                    sessions={sessions}
                    currentSessionId={currentSessionId || ''}
                    onNewChat={createNewSession}
                    onSelectChat={setCurrentSessionId}
                    onDeleteChat={handleDeleteChat}
                />
                <Box className="chat-container">
                    <Box 
                        component="nav" 
                        className="nav-bar"
                        style={{
                            height: '64px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <Container 
                            size="lg" 
                            px="md" 
                            style={{
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <Group 
                                justify="space-between" 
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    alignItems: 'center',
                                    display: 'flex',
                                    gap: '10px'
                                }}
                            >
                                <Group gap="md" align="center"style={{ display: 'flex' }}>
                                    <Group gap="sm" align="center" style={{ display: 'flex' }}>
                                        <IconBrain size={28} color="#10a37f" style={{ flexShrink: 0 }} />
                                        <Title 
                                            order={1} 
                                            size="h3" 
                                            style={{ 
                                                whiteSpace: 'nowrap',
                                                fontSize: '20px',
                                                lineHeight: '28px',
                                                margin: 0
                                            }}
                                        >
                                            Payment & Checkout Assistant
                                        </Title>
                                    </Group>
                                </Group>
                                <Group gap="md" align="center">
                                    <Button
                                        variant={showInsights ? "light" : "subtle"}
                                        onClick={() => setShowInsights(!showInsights)}
                                        leftSection={<IconChartBar size={18} />}
                                        styles={(theme) => ({
                                            root: {
                                                height: '36px',
                                                padding: '0 16px',
                                                backgroundColor: showInsights ? 'rgba(16, 163, 127, 0.15)' : 'transparent',
                                                color: showInsights ? '#10a37f' : theme.colors.gray[5],
                                                '&:hover': {
                                                    backgroundColor: showInsights 
                                                        ? 'rgba(16, 163, 127, 0.25)' 
                                                        : 'rgba(255, 255, 255, 0.05)',
                                                }
                                            },
                                            inner: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }
                                        })}
                                    >
                                        Insights
                                    </Button>
                                </Group>
                            </Group>
                        </Container>
                    </Box>

                    <Box component="main" className="main-content">
                        {showInsights ? (
                            <InsightsScreen />
                        ) : (
                            <Fragment>
                                <Box className="messages-container">
                                    {(!currentSession || currentSession.messages.length === 0) ? (
                                        <Box className="welcome-screen">
                                            <IconBrain size={64} color="#10a37f" />
                                            <Title order={2} className="welcome-title">
                                                How can I help you today?
                                            </Title>
                                            <Text size="lg" color="dimmed" className="welcome-text">
                                                Ask me anything about checkout flows, payment issues, or revenue impact.
                                                I can help analyze patterns, identify issues, and suggest improvements.
                                            </Text>
                                        </Box>
                                    ) : (
                                        <Box className="messages-list">
                                            {currentSession.messages.map((message, index) => (
                                                <Box 
                                                    key={index} 
                                                    className={`message-wrapper ${message.role}`}
                                                >
                                                    <Container size="lg">
                                                        <ChatMessage message={message} />
                                                    </Container>
                                                </Box>
                                            ))}
                                            <Box ref={messagesEndRef} />
                                        </Box>
                                    )}
                                </Box>

                                <Box className="input-container">
                                    <Container size="lg">
                                        <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
                                    </Container>
                                </Box>
                            </Fragment>
                        )}
                    </Box>
                </Box>
            </Box>
            <style>{`
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
                    z-index: 100;
                    transition: all 0.3s ease;
                    min-height: 64px;
                    display: flex;
                    align-items: center;
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

  return content;
};

export default App;