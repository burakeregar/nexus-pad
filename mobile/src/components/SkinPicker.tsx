import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal } from 'react-native';
import { Button } from '@rneui/themed';

interface Skin {
    id: number;
    name: string;
    splashPath?: string | null;
    owned: boolean;
}

interface SkinPickerProps {
    visible: boolean;
    onSelect: (skinId: number) => void;
    onClose: () => void;
    skins: Skin[];
    currentSkinId?: number;
    championName?: string;
    fallbackSplash?: string;
    championIcon?: string;
}

const safeUri = (uri?: string | null) => {
    if (!uri || typeof uri !== 'string' || uri.trim() === '') return null;
    return uri;
};

export default function SkinPicker({ visible, onSelect, onClose, skins, currentSkinId, championName, fallbackSplash, championIcon }: SkinPickerProps) {
    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.headerRow}>
                        {championIcon ? (
                            <Image source={{ uri: championIcon }} style={styles.headerIcon} />
                        ) : null}
                        <Text style={styles.title}>{championName ? `Select Skin • ${championName}` : 'Select Skin'}</Text>
                    </View>
                    <ScrollView contentContainerStyle={styles.list}>
                        {skins.map((skin) => {
                            const uri = safeUri(skin.splashPath) || safeUri(fallbackSplash) || safeUri(championIcon);
                            return (
                                <TouchableOpacity
                                    key={skin.id}
                                    style={[
                                        styles.skinItem,
                                        currentSkinId === skin.id && styles.selectedSkin
                                    ]}
                                    onPress={() => onSelect(skin.id)}
                                >
                                    {uri ? (
                                        <Image source={{ uri }} style={styles.skinImage} />
                                    ) : (
                                        <View style={[styles.skinImage, styles.skinPlaceholder]}>
                                            <Text style={styles.placeholderText}>Image unavailable</Text>
                                        </View>
                                    )}
                                    <View style={styles.skinInfo}>
                                        <Text style={styles.skinName} numberOfLines={1}>{skin.name}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                    <Button title="Cancel" onPress={onClose} buttonStyle={styles.cancelButton} />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(12,17,16,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#101413',
        borderRadius: 14,
        padding: 20,
        width: '90%',
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    title: {
        color: '#F3F5F4',
        fontSize: 20,
        fontWeight: 'bold',
        flex: 1,
    },
    headerIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#0C1110',
    },
    list: {
        paddingBottom: 20,
    },
    skinItem: {
        marginBottom: 15,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
        backgroundColor: '#0C1110',
    },
    selectedSkin: {
        borderColor: '#3EE0C1',
        shadowColor: '#3EE0C1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    skinImage: {
        width: '100%',
        height: 150,
        resizeMode: 'cover',
    },
    skinPlaceholder: {
        backgroundColor: '#101413',
    },
    skinInfo: {
        padding: 10,
        backgroundColor: 'rgba(12,17,16,0.85)',
        position: 'absolute',
        bottom: 0,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    skinName: {
        color: '#F3F5F4',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1,
    },
    placeholderText: {
        color: '#8A9298',
        fontSize: 12,
    },
    cancelButton: {
        backgroundColor: '#101413',
        marginTop: 10,
        borderRadius: 12,
    },
});
