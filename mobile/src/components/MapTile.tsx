import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageSourcePropType } from 'react-native';



interface MapTileProps {
    icon: ImageSourcePropType;
    label: string;
    selected: boolean;
    onClick: () => void;
}

export default function MapTile({ icon, label, selected, onClick }: MapTileProps) {
    return (
        <TouchableOpacity
            style={[styles.tile, selected && styles.tileSelected]}
            onPress={onClick}
            activeOpacity={0.8}
        >
            <Image source={icon} style={styles.icon} resizeMode="contain" />
            <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    tile: {
        backgroundColor: '#101413',
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 80,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    tileSelected: {
        borderColor: '#3EE0C1',
        backgroundColor: '#101413',
        shadowColor: '#3EE0C1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    icon: {
        width: 40,
        height: 40,
        marginBottom: 8,
    },
    label: {
        color: '#8A9298',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    labelSelected: {
        color: '#F3F5F4',
    },
});
