import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';



interface GameModeCardProps {
    title: string;
    description?: string;
    selected: boolean;
    onClick: () => void;
}

export default function GameModeCard({ title, description, selected, onClick }: GameModeCardProps) {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.card,
                selected && styles.cardSelected,
                pressed && styles.cardPressed,
            ]}
            onPress={onClick}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
        >
            <View style={styles.content}>
                <Text style={[styles.title, selected && styles.titleSelected]}>{title}</Text>
                {description && (
                    <Text style={[styles.description, selected && styles.descriptionSelected]}>
                        {description}
                    </Text>
                )}
            </View>
            <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <View style={styles.radioInner} />}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#101413',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.06)',
        paddingVertical: 18,
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    cardSelected: {
        backgroundColor: 'rgba(62, 224, 193, 0.08)',
        borderColor: '#3EE0C1',
        shadowColor: '#3EE0C1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
    },
    cardPressed: {
        backgroundColor: 'rgba(62, 224, 193, 0.05)',
        borderColor: 'rgba(62, 224, 193, 0.4)',
    },
    content: {
        flex: 1,
        marginRight: 16,
    },
    title: {
        color: '#F3F5F4',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 3,
    },
    titleSelected: {
        color: '#FFFFFF',
    },
    description: {
        color: '#6B7280',
        fontSize: 13,
        fontWeight: '500',
    },
    descriptionSelected: {
        color: '#8A9298',
    },
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: 'rgba(138, 146, 152, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioSelected: {
        borderColor: '#3EE0C1',
        backgroundColor: 'rgba(62, 224, 193, 0.1)',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#3EE0C1',
    },
});
