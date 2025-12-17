import React, { useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Session } from '@supabase/supabase-js';
import { DesktopStatus } from '../lib/lcuBridge';
import { FavoriteChampionConfig } from '../lib/favoriteChampions';
import SettingsPanel from '../components/SettingsPanel';

interface DashboardProps {
    session: Session;
    desktopStatus: DesktopStatus;
    onCreateLobby: () => void;
    onSignOut: () => void;
    favoriteConfig: FavoriteChampionConfig;
    onSaveFavoriteConfig: (config: FavoriteChampionConfig) => void;
}

const BG_IMAGE = require('../../static/magic-background.jpg');
const LOGO_MARK = require('../../static/logo/AppLogo-8.png');
const ACCENT = '#3EE0C1';
const SUCCESS_GREEN = '#22C55E';
const OFFWHITE = '#F3F5F4';
const MUTED = '#8A9298';
const DARK_BG = '#0C1110';

export default function Dashboard({
    desktopStatus,
    onCreateLobby,
    onSignOut,
    favoriteConfig,
    onSaveFavoriteConfig,
}: DashboardProps) {
    const [showSettings, setShowSettings] = useState(false);

    const connected = !!desktopStatus?.lcuConnected;
    const headlineText = connected ? 'Start a Lobby' : 'Open League Client';
    const subheadText = connected
        ? 'Create a lobby to start drafting, or wait for an invite.'
        : 'Open the League client on your desktop to get started.';

    return (
        <ImageBackground source={BG_IMAGE} style={styles.bg} resizeMode="cover">
            <View style={styles.overlay} />

            {/* Background Watermark - Very low opacity logo */}
            <View style={styles.watermarkContainer}>
                <Image
                    source={LOGO_MARK}
                    style={styles.watermark}
                    resizeMode="contain"
                />
            </View>

            <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
                <View style={styles.container}>
                    {/* ===== TOP HEADER ===== */}
                    <View style={styles.topRow}>
                        <View style={styles.headerLeft}>
                            <TouchableOpacity
                                style={styles.settingsButton}
                                onPress={() => setShowSettings(true)}
                            >
                                <Text style={styles.settingsIcon}>⚙️</Text>
                            </TouchableOpacity>
                            {/* Brand Lockup */}
                            <View style={styles.brandLockup}>
                                <Image source={LOGO_MARK} style={styles.brandIcon} resizeMode="contain" />
                                <Text style={styles.brandName}>NexusPad</Text>
                            </View>
                        </View>

                        {/* Status Indicator - Redesigned */}
                        <View style={[styles.statusBadge, connected ? styles.statusBadgeOk : styles.statusBadgeWarn]}>
                            {connected && <Text style={styles.statusCheck}>✓</Text>}
                            <Text style={[styles.statusText, connected ? styles.statusTextOk : styles.statusTextWarn]}>
                                {connected ? 'Connected' : 'Waiting'}
                            </Text>
                        </View>
                    </View>

                    {/* ===== MAIN CONTENT - Tighter hierarchy ===== */}
                    <View style={styles.content}>
                        {/* LogoMark - Idle state indicator */}
                        <Image source={LOGO_MARK} style={styles.logoMark} resizeMode="contain" />

                        {/* Action-oriented headline */}
                        <Text style={styles.headline}>{headlineText}</Text>

                        {/* Directive helper text - reduced weight */}
                        <Text style={styles.subhead}>{subheadText}</Text>

                        {/* ===== PRIMARY CTA - Filled, dominant ===== */}
                        <TouchableOpacity
                            style={[styles.primaryButton, !connected && styles.disabledButton]}
                            activeOpacity={0.85}
                            disabled={!connected}
                            onPress={onCreateLobby}
                        >
                            <Text style={[styles.primaryLabel, !connected && styles.disabledLabel]}>
                                CREATE NEW LOBBY
                            </Text>
                        </TouchableOpacity>

                        {/* Secondary action - Sign Out (very subtle) */}
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            activeOpacity={0.7}
                            onPress={onSignOut}
                        >
                            <Text style={styles.secondaryLabel}>Sign Out</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ===== TRUST FOOTER ===== */}
                    <View style={styles.trustFooter}>
                        <Text style={styles.trustText}>Same team behind</Text>
                        <View style={styles.trustBrand}>
                            <Text style={styles.trustSymbol}>◆</Text>
                            <Text style={styles.trustName}>PROCOMPS</Text>
                        </View>
                    </View>
                </View>
            </SafeAreaView>

            <SettingsPanel
                visible={showSettings}
                onClose={() => setShowSettings(false)}
                favoriteConfig={favoriteConfig}
                onSaveFavoriteConfig={onSaveFavoriteConfig}
            />
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    bg: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(12, 17, 16, 0.85)',
    },
    watermarkContainer: {
        position: 'absolute',
        bottom: -120,
        right: -80,
        overflow: 'visible',
    },
    watermark: {
        width: 360,
        height: 360,
        opacity: 0.04,
    },
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    // ===== TOP HEADER =====
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingsButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(16, 20, 19, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    settingsIcon: {
        fontSize: 18,
    },
    brandLockup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    brandIcon: {
        width: 22,
        height: 22,
        opacity: 0.7,
    },
    brandName: {
        color: 'rgba(243, 245, 244, 0.6)',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    // ===== STATUS BADGE =====
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        gap: 4,
    },
    statusBadgeOk: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    statusBadgeWarn: {
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.3)',
    },
    statusCheck: {
        color: '#22C55E',
        fontSize: 11,
        fontWeight: '700',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    statusTextOk: {
        color: '#22C55E',
    },
    statusTextWarn: {
        color: '#FBBF24',
    },
    // ===== MAIN CONTENT =====
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingBottom: 40,
    },
    logoMark: {
        width: 80,
        height: 80,
        marginBottom: 24,
        opacity: 0.9,
    },
    headline: {
        color: '#F3F5F4',
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: 0.3,
        textAlign: 'center',
        marginBottom: 10,
    },
    subhead: {
        color: 'rgba(138, 146, 152, 0.85)',
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 32,
        maxWidth: 280,
    },
    // ===== PRIMARY CTA - FILLED =====
    primaryButton: {
        width: '100%',
        backgroundColor: '#3EE0C1',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#3EE0C1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 8,
    },
    disabledButton: {
        backgroundColor: 'rgba(62, 224, 193, 0.2)',
        shadowOpacity: 0,
    },
    primaryLabel: {
        color: '#0C1110',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    disabledLabel: {
        color: 'rgba(12, 17, 16, 0.5)',
    },
    // ===== SECONDARY ACTION =====
    secondaryButton: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    secondaryLabel: {
        color: 'rgba(138, 146, 152, 0.6)',
        fontSize: 13,
        fontWeight: '500',
    },
    // ===== TRUST FOOTER =====
    trustFooter: {
        alignItems: 'center',
        paddingBottom: 24,
        gap: 4,
    },
    trustText: {
        color: 'rgba(138, 146, 152, 0.4)',
        fontSize: 11,
        fontWeight: '500',
    },
    trustBrand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    trustSymbol: {
        color: 'rgba(138, 146, 152, 0.5)',
        fontSize: 10,
    },
    trustName: {
        color: 'rgba(138, 146, 152, 0.5)',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
});
