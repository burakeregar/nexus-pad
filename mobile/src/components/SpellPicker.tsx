import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal } from 'react-native';

interface Spell {
    id: number;
    name: string;
    iconPath: string;
}

interface SpellPickerProps {
    visible: boolean;
    onSelect: (spellId: number) => void;
    onClose: () => void;
    spells: Spell[];
    currentSpellId?: number;
    allowedSpellIds?: number[] | null;
}

export default function SpellPicker({ visible, onSelect, onClose, spells, currentSpellId, allowedSpellIds }: SpellPickerProps) {
    const allowedSet = allowedSpellIds && allowedSpellIds.length > 0 ? new Set(allowedSpellIds) : null;
    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>Select Summoner Spell</Text>
                    <ScrollView contentContainerStyle={styles.grid}>
                        {spells.map((spell) => {
                            const isAllowed = allowedSet ? allowedSet.has(spell.id) : true;
                            const isSelected = currentSpellId === spell.id;
                            const iconUri = spell.iconPath && spell.iconPath.trim().length > 0 ? spell.iconPath : undefined;
                            return (
                                <TouchableOpacity
                                    key={spell.id}
                                    style={[
                                        styles.spellItem,
                                        isSelected && styles.selectedSpell,
                                        !isAllowed && styles.disabledSpell
                                    ]}
                                    onPress={() => {
                                        if (!isAllowed) return;
                                        onSelect(spell.id);
                                    }}
                                    disabled={!isAllowed}
                                >
                                    <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
                                        {iconUri ? (
                                            <Image source={{ uri: iconUri }} style={styles.spellIcon} />
                                        ) : (
                                            <View style={[styles.spellIcon, styles.spellPlaceholder]} />
                                        )}
                                    </View>
                                    <Text style={[styles.spellName, !isAllowed && styles.spellNameDisabled]}>{spell.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                    <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(12, 17, 16, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#101413',
        borderRadius: 14,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
        width: '92%',
        maxHeight: '70%',
    },
    title: {
        color: '#8A9298',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 16,
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 4,
    },
    spellItem: {
        width: 72,
        alignItems: 'center',
        marginBottom: 10,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'transparent',
        overflow: 'hidden',
        marginBottom: 4,
    },
    iconContainerSelected: {
        borderColor: '#3EE0C1',
    },
    selectedSpell: {},
    disabledSpell: {
        opacity: 0.35,
    },
    spellIcon: {
        width: '100%',
        height: '100%',
    },
    spellPlaceholder: {
        backgroundColor: '#0C1110',
    },
    spellName: {
        color: '#6B7280',
        fontSize: 10,
        textAlign: 'center',
    },
    spellNameDisabled: {
        color: '#4B5563',
    },
    cancelButton: {
        marginTop: 16,
        paddingVertical: 10,
        alignItems: 'center',
    },
    cancelText: {
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '500',
    },
});
