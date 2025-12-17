import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Overlay } from '@rneui/themed';

// Role icons
const ROLE_ICONS = {
    TOP: require('../../static/roles/role-top.png'),
    JUNGLE: require('../../static/roles/role-jungle.png'),
    MIDDLE: require('../../static/roles/role-mid.png'),
    BOTTOM: require('../../static/roles/role-bot.png'),
    UTILITY: require('../../static/roles/role-support.png'),
    FILL: require('../../static/roles/role-fill.png'),
    UNSELECTED: require('../../static/roles/role-unselected.png'),
};

export const ROLES = [
    { id: 'TOP', name: 'Top', icon: ROLE_ICONS.TOP },
    { id: 'JUNGLE', name: 'Jungle', icon: ROLE_ICONS.JUNGLE },
    { id: 'MIDDLE', name: 'Mid', icon: ROLE_ICONS.MIDDLE },
    { id: 'BOTTOM', name: 'Bot', icon: ROLE_ICONS.BOTTOM },
    { id: 'UTILITY', name: 'Support', icon: ROLE_ICONS.UTILITY },
    { id: 'FILL', name: 'Fill', icon: ROLE_ICONS.FILL },
];

interface RolePickerProps {
    visible: boolean;
    onSelect: (role: string) => void;
    onClose: () => void;
    currentRole?: string;
}

export default function RolePicker({ visible, onSelect, onClose, currentRole }: RolePickerProps) {
    return (
        <Overlay isVisible={visible} onBackdropPress={onClose} overlayStyle={styles.overlay}>
            <View style={styles.container}>
                <Text style={styles.title}>Select Role</Text>
                <View style={styles.grid}>
                    {ROLES.map((role) => (
                        <TouchableOpacity
                            key={role.id}
                            style={[
                                styles.roleItem,
                                currentRole === role.id && styles.selectedRole
                            ]}
                            onPress={() => onSelect(role.id)}
                        >
                            <Image source={role.icon} style={styles.roleIconImage} />
                            <Text style={styles.roleName}>{role.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </Overlay>
    );
}

const styles = StyleSheet.create({
    overlay: {
        backgroundColor: '#101413',
        borderRadius: 14,
        padding: 20,
        width: '80%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    container: {
        alignItems: 'center',
    },
    title: {
        color: '#F3F5F4',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
    },
    roleItem: {
        width: 80,
        height: 80,
        backgroundColor: '#101413',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedRole: {
        borderColor: '#3EE0C1',
        backgroundColor: '#101413',
        shadowColor: '#3EE0C1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    roleIconImage: {
        width: 40,
        height: 40,
        marginBottom: 5,
        resizeMode: 'contain',
    },
    roleName: {
        color: '#8A9298',
        fontSize: 12,
    },
});
