import { TextInput, ActionIcon, Paper, Tooltip, Flex } from '@mantine/core';
import { IconSend, IconBrain } from '@tabler/icons-react';
import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
    onSend: (message: string) => void;
    isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && !isLoading) {
            onSend(message.trim());
            setMessage('');
            // Reset textarea height
            if (inputRef.current) {
                inputRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const adjustTextareaHeight = () => {
        const textarea = inputRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    };

    useEffect(() => {
        adjustTextareaHeight();
    }, [message]);

    const exampleQueries = [
        "What was the total revenue?",
        "What items were added to the cart?",
    ];

    return (
        <div className="chat-input-container">
            <Paper className="chat-input-wrapper">
                <form ref={formRef} onSubmit={handleSubmit}>
                    <div className="input-content">
                        {!isFocused && message.length === 0 && document.querySelectorAll('.message-wrapper').length === 0 && (
                            <div className="example-queries">
                                {exampleQueries.map((query, index) => (
                                    <Tooltip 
                                        key={index} 
                                        label="Click to use this query"
                                        openDelay={300}
                                        closeDelay={100}
                                    >
                                        <div 
                                            className="example-query"
                                            onClick={() => {
                                                setMessage(query);
                                                inputRef.current?.focus();
                                            }}
                                        >
                                            {query}
                                        </div>
                                    </Tooltip>
                                ))}
                            </div>
                        )}
                        <div className="input-row">
                            <TextInput
                                component="textarea"
                                ref={inputRef}
                                placeholder="Message Product Assistant..."
                                value={message}
                                onChange={(e) => setMessage(e.currentTarget.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                onKeyDown={handleKeyDown}
                                className="chat-input"
                                disabled={isLoading}
                                styles={{
                                    input: {
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        padding: '0',
                                        fontSize: '16px',
                                        lineHeight: '1.5',
                                        minHeight: '24px',
                                        maxHeight: '200px',
                                        width: '100%',
                                        resize: 'none',
                                        '&:focus': {
                                            border: 'none',
                                            outline: 'none'
                                        }
                                    },
                                    wrapper: {
                                        flex: 1
                                    }
                                }}
                            />
                            <ActionIcon 
                                type="submit" 
                                variant="filled" 
                                disabled={!message.trim() || isLoading}
                                loading={isLoading}
                                className={`send-button ${message.trim() && !isLoading ? 'active' : ''}`}
                            >
                                {isLoading ? <IconBrain size={20} /> : <IconSend size={20} />}
                            </ActionIcon>
                        </div>
                    </div>
                </form>
            </Paper>
            <div className="input-footer">
                <span>Press Enter to send, Shift + Enter for new line</span>
            </div>
        </div>
    );
}