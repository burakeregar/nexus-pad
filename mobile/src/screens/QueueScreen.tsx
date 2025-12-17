import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@rneui/themed';

interface QueueScreenProps {
    onCancelQueue: () => void;
    timeInQueue: number;
    estimatedQueueTime?: number | null;
    penaltySeconds?: number;
    readyCheck?: any;
    onAccept?: () => void;
    onDecline?: () => void;
    autoAccept: boolean;
    onToggleAutoAccept: (value: boolean) => void;
}

export default function QueueScreen({ onCancelQueue, timeInQueue, estimatedQueueTime, penaltySeconds = 0, readyCheck, onAccept, onDecline, autoAccept, onToggleAutoAccept }: QueueScreenProps) {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const isReadyCheck = readyCheck?.state === 'InProgress';
    const playerResponse = readyCheck?.playerResponse;
    const READY_CHECK_LIMIT = 12; // LCU timer counts up; we show countdown from expected max

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatEstimatedTime = (seconds: number): string => {
        if (seconds < 60) {
            return `${Math.round(seconds)} saniye`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        if (remainingSeconds === 0) {
            return `${minutes} dakika`;
        }
        return `${minutes} dakika ${remainingSeconds} saniye`;
    };

    const getReadyCheckRemaining = () => {
        if (!readyCheck?.timer && readyCheck?.timer !== 0) return READY_CHECK_LIMIT;
        const remaining = READY_CHECK_LIMIT - readyCheck.timer;
        return Math.max(0, Math.round(remaining));
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.content}>
                    <Animated.View style={[styles.pulseContainer, { transform: [{ scale: pulseAnim }] }]}>
                        <View style={styles.logoContainer}>
                            <Text style={styles.logoText}>LoL</Text>
                        </View>
                    </Animated.View>

                    <Text style={styles.statusText}>
                        {isReadyCheck ? 'Match Found!' : 'Finding Match...'}
                    </Text>

                    <View style={styles.autoAcceptRow}>
                        <Text style={styles.autoAcceptLabel}>Auto Accept</Text>
                        <Switch
                            value={autoAccept}
                            onValueChange={onToggleAutoAccept}
                            thumbColor={autoAccept ? '#22c55e' : '#f4f3f4'}
                            trackColor={{ true: '#166534', false: '#555' }}
                        />
                    </View>
                    {!isReadyCheck && (
                        <View style={styles.timeContainer}>
                            <Text style={styles.timerText}>Time in Queue: {formatTime(timeInQueue)}</Text>
                            {estimatedQueueTime !== null && estimatedQueueTime !== undefined && (
                                <Text style={styles.estimatedTimeText}>
                                    Estimated: {formatEstimatedTime(estimatedQueueTime)}
                                </Text>
                            )}
                            {penaltySeconds > 0 && (
                                <View style={styles.penaltyBanner}>
                                    <Text style={styles.penaltyTitle}>Queue Penalty Active</Text>
                                    <Text style={styles.penaltyText}>Waiting {formatTime(penaltySeconds)} before matchmaking starts.</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {isReadyCheck && (
                        <View style={styles.readyCheckContainer}>
                            <Text style={styles.timerText}>{getReadyCheckRemaining()}s</Text>
                            <View style={styles.readyCheckButtons}>
                                <Button
                                    title="Accept"
                                    onPress={onAccept}
                                    disabled={playerResponse !== 'None'}
                                    buttonStyle={[styles.acceptButton, playerResponse === 'Accepted' && styles.acceptedButton]}
                                    titleStyle={styles.buttonTitle}
                                />
                                <Button
                                    title="Decline"
                                    onPress={onDecline}
                                    disabled={playerResponse !== 'None'}
                                    buttonStyle={[styles.declineButton, playerResponse === 'Declined' && styles.declinedButton]}
                                    titleStyle={styles.buttonTitle}
                                />
                            </View>
                        </View>
                    )}
                </View>

                {!isReadyCheck && (
                    <View style={styles.footer}>
                        <Button
                            title="Cancel Queue"
                            onPress={onCancelQueue}
                            buttonStyle={styles.cancelButton}
                            containerStyle={styles.buttonContainer}
                            icon={{
                                name: 'times',
                                type: 'font-awesome',
                                size: 15,
                                color: 'white',
                            }}
                        />
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0C1110',
    },
    container: {
        flex: 1,
        backgroundColor: '#0C1110',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: '#101413',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 24,
        paddingBottom: 40,
        alignItems: 'center',
    },
    pulseContainer: {
        marginBottom: 24,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#101413',
        borderWidth: 2,
        borderColor: '#3EE0C1',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#3EE0C1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    logoText: {
        color: '#F3F5F4',
        fontSize: 20,
        fontWeight: 'bold',
    },
    statusText: {
        color: '#F3F5F4',
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
    },
    timeContainer: {
        alignItems: 'center',
        marginTop: 8,
    },
    autoAcceptRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#101413',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    autoAcceptLabel: {
        color: '#8A9298',
        fontSize: 14,
        fontWeight: '500',
    },
    timerText: {
        color: '#8A9298',
        fontSize: 16,
        fontVariant: ['tabular-nums'],
        marginBottom: 4,
    },
    estimatedTimeText: {
        color: '#8A9298',
        fontSize: 13,
        fontWeight: '400',
    },
    penaltyBanner: {
        marginTop: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ef4444',
        width: '100%',
    },
    penaltyTitle: {
        color: '#fca5a5',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
        textAlign: 'center',
    },
    penaltyText: {
        color: '#fca5a5',
        fontSize: 12,
        textAlign: 'center',
    },
    footer: {
        marginTop: 24,
        gap: 12,
        width: '100%',
    },
    buttonContainer: {
        width: '100%',
    },
    cancelButton: {
        backgroundColor: '#101413',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingVertical: 16,
        borderRadius: 14,
    },
    readyCheckContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 16,
    },
    readyCheckButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
        width: '100%',
        justifyContent: 'center',
    },
    acceptButton: {
        backgroundColor: '#3EE0C1',
        paddingVertical: 16,
        paddingHorizontal: 28,
        borderRadius: 14,
        minWidth: 120,
        shadowColor: '#3EE0C1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    acceptedButton: {
        backgroundColor: '#32B89E',
        opacity: 0.8,
        shadowOpacity: 0,
    },
    declineButton: {
        backgroundColor: '#101413',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingVertical: 16,
        paddingHorizontal: 28,
        borderRadius: 14,
        minWidth: 120,
    },
    declinedButton: {
        backgroundColor: '#2A2E31',
        opacity: 0.8,
    },
    buttonTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0C1110',
    },
});
