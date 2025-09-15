import { useState, useEffect, type FC, type PropsWithChildren } from 'react';
import { Box, Paper, Text, Title, Badge, Group, Button, Stack, Loader } from '@mantine/core';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

interface InsightStats {
    weeklyLoss: string;
    abandonments: number;
    sessions: number;
    paymentDropoffRate: number;
    description: string;
    timestamp: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

const getSeverityColor = (severity: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (severity) {
        case 'HIGH':
            return { bg: '#FFE5E5', text: '#FF4D4D' };
        case 'MEDIUM':
            return { bg: '#FFF3E5', text: '#FF9933' };
        default:
            return { bg: '#E5F6FF', text: '#33A3FF' };
    }
};

interface InsightsScreenProps {
    apiKey?: string;
    customerId?: number;
}

const InsightsScreen: FC<InsightsScreenProps> = ({ apiKey = 'abc', customerId = 10 }) => {
    const [insightData, setInsightData] = useState<InsightStats>({
        weeklyLoss: '0',
        abandonments: 0,
        sessions: 0,
        paymentDropoffRate: 0,
        description: 'Loading insights...',
        timestamp: new Date().toLocaleString(),
        severity: 'LOW'
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const response = await axios.get(`${API_BASE_URL}/stats/insights/${apiKey}/${customerId}`);
                const data = response.data;
                
                // Calculate severity based on dropoff rate
                let severity: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
                if (data.paymentDropoffRate >= 50) {
                    severity = 'HIGH';
                } else if (data.paymentDropoffRate >= 25) {
                    severity = 'MEDIUM';
                }

                setInsightData({
                    weeklyLoss: data.weeklyLoss.toLocaleString(),
                    abandonments: data.abandonments,
                    sessions: data.sessions,
                    paymentDropoffRate: data.paymentDropoffRate,
                    description: `${data.paymentDropoffRate}% of checkout drop-offs occurring at payment step. ${data.abandonments} abandoned sessions out of ${data.sessions} total sessions.`,
                    timestamp: new Date().toLocaleString(),
                    severity
                });
            } catch (err) {
                console.error('Error fetching insights:', err);
                setError('Failed to load insights data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchInsights();
    }, [apiKey, customerId]);

    const severityColors = getSeverityColor(insightData.severity);

    const MetricBox: FC<PropsWithChildren<{ value: string | number; label: string }>> = ({ value, label }) => (
        <Box 
            component="div"
            style={{
                padding: '16px',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }
            }}
        >
            <Text 
                component="p" 
                size="xl" 
                fw={700} 
                c={label === 'Weekly Loss' ? '#ff4d4d' : '#10a37f'}
                style={{
                    fontSize: '32px',
                    lineHeight: 1.2,
                    letterSpacing: '-0.02em',
                    marginBottom: '8px'
                }}
            >
                {value}
            </Text>
            <Text 
                component="p" 
                size="sm" 
                c="dimmed" 
                tt="uppercase"
                style={{
                    letterSpacing: '0.05em',
                    opacity: 0.8
                }}
            >
                {label}
            </Text>
        </Box>
    );

    return (
        <Box component="div" p="xl" maw={1200} mx="auto">
            <Paper 
                p="xl" 
                radius="lg" 
                shadow="md"
                style={{
                    backgroundColor: 'rgba(35, 35, 35, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                    }
                }}
            >
                {isLoading ? (
                    <Box component="div" style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                        <Loader size="lg" color="#10a37f" />
                    </Box>
                ) : error ? (
                    <Box component="div" style={{ textAlign: 'center', padding: '60px' }}>
                        <Text c="red" size="lg" mb="md">{error}</Text>
                        <Button 
                            variant="light" 
                            color="red" 
                            onClick={() => window.location.reload()}
                            leftSection={<IconChartBar size={20} />}
                        >
                            Retry Loading
                        </Button>
                    </Box>
                ) : (
                    <Stack gap="xl">
                        <Box component="div">
                            <Group justify="space-between" mb="lg">
                                <Title order={2} style={{ 
                                    fontSize: '28px',
                                    background: 'linear-gradient(45deg, #10a37f, #1aebb6)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>
                                    Checkout Funnel Breakdown
                                </Title>
                                <Badge 
                                    size="lg"
                                    variant="dot"
                                    styles={{
                                        root: {
                                            backgroundColor: severityColors.bg,
                                            color: severityColors.text,
                                            textTransform: 'uppercase',
                                            padding: '8px 16px',
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                transform: 'scale(1.05)'
                                            }
                                        }
                                    }}
                                >
                                    {insightData.severity}
                                </Badge>
                            </Group>
                        </Box>

                        <Box component="div">
                            <Text 
                                component="p" 
                                size="lg" 
                                c="dimmed"
                                style={{
                                    lineHeight: 1.6,
                                    letterSpacing: '0.01em'
                                }}
                            >
                                {insightData.description}
                            </Text>
                        </Box>

                        

                        <Box 
                            component="div" 
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '12px',
                                padding: '24px'
                            }}
                        >
                            <Group grow gap="xl">
                                <MetricBox value={`₹${insightData.weeklyLoss}`} label="Weekly Loss" />
                                <MetricBox value={insightData.abandonments.toLocaleString()} label="Abandonments" />
                                <MetricBox value={insightData.sessions.toLocaleString()} label="Sessions" />
                                <MetricBox value={`${insightData.paymentDropoffRate}%`} label="At Payment" />
                            </Group>
                        </Box>

                        <Box component="div">
                          
                        </Box>
                    </Stack>
                )}
            </Paper>
        </Box>
    );
};

export default InsightsScreen;