import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@rneui/themed';
import { getLCUBridge } from '../lib/lcuBridge';
import MapTile from '../components/MapTile';
import GameModeCard from '../components/GameModeCard';

interface GameQueue {
    category: string;
    gameMode: string;
    description: string;
    id: number;
    queueAvailability: string;
    mapId: number;
    isCustom?: boolean;
    shortName?: string;
    name?: string;
    // Additional optional fields from various LCU payload shapes
    queueId?: number;
    queueType?: string;
    type?: string;
    map?: { id?: number; mapId?: number };
    showQuickPlaySlotSelection?: boolean;
}

interface CreateLobbyScreenProps {
    onClose: () => void;
    onSuccess: () => void;
    onError?: (message: string) => void;
    onLeaveLobby?: () => void;
}

const ACCENT = '#3EE0C1';
const OFFWHITE = '#f0e6d2';

const mapIcons: Record<string, { default: any; active: any }> = {
    sr: {
        default: require('../../static/maps/sr-default.png'),
        active: require('../../static/maps/sr-active.png')
    },
    ha: {
        default: require('../../static/maps/ha-default.png'),
        active: require('../../static/maps/ha-active.png')
    },
    tt: {
        default: require('../../static/maps/tt-default.png'),
        active: require('../../static/maps/tt-active.png')
    },
    tft: {
        default: require('../../static/maps/tft-default.png'),
        active: require('../../static/maps/tft-active.png')
    },
    rgm: {
        default: require('../../static/maps/rgm-default.png'),
        active: require('../../static/maps/rgm-active.png')
    }
};

const mapBackgrounds: Record<number | 'default', any> = {
    10: require('../../static/magic-background.jpg'),
    11: require('../../static/magic-background.jpg'),
    12: require('../../static/magic-background.jpg'),
    22: require('../../static/magic-background.jpg'),
    default: require('../../static/magic-background.jpg')
};

const isShamataQueue = (q: GameQueue): boolean => {
    const mapIdNum = Number(q.mapId ?? q.map?.id ?? q.map?.mapId);
    if (mapIdNum !== 12) return false;
    const gmUpper = (q.gameMode || '').toUpperCase();
    const text = `${q.description || ''} ${q.shortName || ''}`.toLowerCase();
    return gmUpper === 'KIWI' ||
        text.includes('şamata') ||
        text.includes('samata') ||
        text.includes('shamata');
    return gmUpper === 'KIWI' ||
        text.includes('şamata') ||
        text.includes('samata') ||
        text.includes('shamata');
};

let cachedQueues: GameQueue[] | null = null;

export default function CreateLobbyScreen({ onClose, onSuccess, onError, onLeaveLobby }: CreateLobbyScreenProps) {
    const lcuBridge = getLCUBridge();

    const [queues, setQueues] = useState<GameQueue[]>([]);
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [selectedQueueId, setSelectedQueueId] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [now, setNow] = useState(new Date());
    console.log("DEBUG - selectedSection:", selectedSection);
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        loadQueues();
    }, []);

    const loadQueues = async () => {
        if (!lcuBridge.getIsConnected()) {
            if (onError) onError('Not connected to desktop client.');
            return;
        }

        if (cachedQueues && cachedQueues.length > 0) {
            setQueues(cachedQueues);
            return;
        }

        setLoading(true);
        try {
            const queuesRes = await lcuBridge.request('/lol-game-queues/v1/queues');
            const normalizeQueues = (items: any[]): GameQueue[] =>
                (items || []).map((q: any) => {
                    const idNum = Number(q.id ?? q.queueId);
                    const mapIdNum = Number(q.mapId ?? q.map?.id ?? q.map?.mapId);
                    const gameMode = (q.gameMode || q.queueType || q.type || '').toString();
                    return {
                        ...q,
                        id: isNaN(idNum) ? q.id : idNum,
                        mapId: isNaN(mapIdNum) ? q.mapId : mapIdNum,
                        gameMode
                    };
                });

            if (queuesRes?.status === 200) {
                const content = queuesRes.content;
                let normalized: GameQueue[] = [];
                if (Array.isArray(content)) {
                    normalized = normalizeQueues(content);
                } else if (content && typeof content === 'object') {
                    normalized = normalizeQueues(Object.values(content));
                } else if (typeof content === 'string') {
                    try {
                        const parsed = JSON.parse(content);
                        if (Array.isArray(parsed)) {
                            normalized = normalizeQueues(parsed);
                        } else if (parsed && typeof parsed === 'object') {
                            normalized = normalizeQueues(Object.values(parsed));
                        }
                    } catch {
                        normalized = [];
                    }
                }

                setQueues(normalized);
                cachedQueues = normalized; // Cache the result
                console.log('[CreateLobbyScreen] queues loaded', normalized.length);
                const swift = normalized.filter(q => (q.gameMode || '').toUpperCase() === 'SWIFTPLAY');
                if (swift.length) {
                    console.log('[CreateLobbyScreen] swiftplay queues', swift.map(q => ({ id: q.id, desc: q.description, name: q.name })));
                }
            } else {
                setQueues([]);
            }
        } catch (error) {
            console.error('[CreateLobbyScreen] Failed to load queues', error);
            if (onError) onError('Failed to load queues');
        } finally {
            setLoading(false);
        }
    };

    const availableQueues = useMemo(() => {
        const ret: Record<string, GameQueue[]> = {};

        for (const queue of queues) {
            const idNum = Number(queue.id ?? queue.queueId);
            const mapIdNum = Number(queue.mapId ?? queue.map?.id ?? queue.map?.mapId);
            const originalGameMode = (queue.gameMode || '').toUpperCase();
            let gameMode = originalGameMode;

            // Only drop queues that are explicitly not available.
            if (queue.queueAvailability && queue.queueAvailability.toLowerCase() !== 'available') continue;

            // Filter out custom queues
            if (queue.isCustom) continue;

            // Hide special/tournament Summoner's Rift queues.
            const text = `${queue.description || ''} ${queue.name || ''} ${queue.shortName || ''}`.toLowerCase();
            // Hide training/education queues anywhere.
            if (text.includes('eğitim') || text.includes('egitim')) continue;
            if (text.includes('giriş') || text.includes('giris') || text.includes('başlang') || text.includes('baslang') || text.includes('orta')) continue;
            if (text.includes('clash')) continue;

            if (mapIdNum === 11 && gameMode !== 'URF' && (text.includes('özel') || text.includes('ozel') || text.includes('turnuva') || text.includes('rastgele') || text.includes('rasgele'))) continue;


            // Treat Swiftplay (Tam Gaz) as SR classic so it shows with ranked/normal queues.
            if (mapIdNum === 11 && gameMode === 'SWIFTPLAY') {
                gameMode = 'CLASSIC';
            }

            const sectionGameMode = isShamataQueue(queue) ? 'ARAM' : gameMode;

            // Group URF and Arena (CHERRY) into RGM section (Map 30)
            const isURF = gameMode === 'URF';
            const isArena = gameMode === 'CHERRY' || mapIdNum === 30;

            let keyMapId = mapIdNum;
            let keyGameMode = sectionGameMode;

            if (isURF || isArena) {
                keyMapId = 30;
                keyGameMode = 'RGM';
            }

            const key = `${isNaN(keyMapId) ? 0 : keyMapId}-${keyGameMode || 'UNKNOWN'}`;
            if (!ret[key]) ret[key] = [];
            ret[key].push({ ...queue, id: idNum, mapId: mapIdNum, gameMode });
        }

        // Sort within each section alphabetically and dedupe.
        Object.values(ret).forEach(sectionQueues => {
            // Sort by category first (PvP > Custom) to ensure we keep the official queue
            // when deduplicating by name/description
            sectionQueues.sort((a, b) => {
                const catA = (a.category || '').toUpperCase();
                const catB = (b.category || '').toUpperCase();
                if (catA === 'PVP' && catB !== 'PVP') return -1;
                if (catB === 'PVP' && catA !== 'PVP') return 1;
                return 0;
            });

            const original = [...sectionQueues];
            const unique: GameQueue[] = [];
            const seen = new Set<string>();
            let aramClassicKept = false;
            let aramShamataKept = false;
            let firstAramSource: GameQueue | null = null;

            sectionQueues.forEach(q => {
                const mapId = Number(q.mapId);
                const gm = (q.gameMode || '').toUpperCase();
                if (mapId === 12 && !firstAramSource) firstAramSource = q;

                // Special-case ARAM: keep max one ARAM and one Shamata (KIWI)
                if (mapId === 12) {
                    if (gm === 'ARAM') {
                        if (aramClassicKept) return;
                        aramClassicKept = true;
                        unique.push(q);
                        return;
                    }
                    const isShamata = isShamataQueue(q);
                    if (isShamata) {
                        if (aramShamataKept) return;
                        aramShamataKept = true;
                        unique.push(q);
                        return;
                    }
                }

                const sig = `${(q.description || q.shortName || q.name || q.id || '').toString().toLowerCase()}`;
                if (seen.has(sig)) return;
                seen.add(sig);
                unique.push(q);
            });

            if (firstAramSource && !aramClassicKept && Number(firstAramSource.mapId) === 12) {
                unique.unshift({
                    ...firstAramSource,
                    gameMode: 'ARAM',
                    description: firstAramSource.description || firstAramSource.shortName || 'ARAM'
                });
            }

            unique.sort((a, b) => (a.shortName || a.description || a.gameMode).localeCompare(b.shortName || b.description || b.gameMode));
            sectionQueues.splice(0, sectionQueues.length, ...unique);
        });

        return ret;
    }, [queues]);

    const sections = useMemo(() => {
        return Object.keys(availableQueues).sort((a, b) => {
            const [aMap, aGameMode] = a.split('-');
            const [bMap, bGameMode] = b.split('-');

            if (aMap === '11' && bMap !== '11') return -1;
            if (bMap === '11' && aMap !== '11') return 1;

            if (aGameMode === 'CLASSIC' && bGameMode !== 'CLASSIC') return -1;
            if (bGameMode === 'CLASSIC' && aGameMode !== 'CLASSIC') return 1;

            if (aGameMode === 'ARAM' && bGameMode !== 'ARAM') return -1;
            if (bGameMode === 'ARAM' && aGameMode !== 'ARAM') return 1;

            return 0;
        });
    }, [availableQueues]);

    useEffect(() => {
        if (!sections.length) {
            setSelectedSection('');
            setSelectedQueueId(0);
            return;
        }

        // Preserve selection if still valid
        if (selectedSection && availableQueues[selectedSection]) {
            const currentQueues = availableQueues[selectedSection];
            if (currentQueues.some(q => q.id === selectedQueueId)) return;
        }

        const firstSection = sections[0];
        setSelectedSection(firstSection);
        const firstQueue = (availableQueues[firstSection] || [])[0];
        setSelectedQueueId(firstQueue ? firstQueue.id : 0);
    }, [sections, availableQueues, selectedSection, selectedQueueId]);

    const selectedQueues = selectedSection ? availableQueues[selectedSection] || [] : [];

    const sectionSlug = (section: string): keyof typeof mapIcons => {
        const [mapId] = section.split('-');
        if (mapId === '10') return 'tt';
        if (mapId === '11') return 'sr';
        if (mapId === '12') return 'ha';
        if (mapId === '22') return 'tft';
        return 'rgm';
    };

    const mapLabel = (section: string): string => {
        const [mapId, gameMode] = section.split('-');
        if (mapId === '10') return 'Twisted Treeline';
        if (mapId === '11') return 'Classic';
        if (mapId === '12') return 'ARAM';
        if (mapId === '22') return 'TFT';
        if (mapId === '30' || gameMode === 'RGM') return 'Arena';
        return 'RGM';
    };

    const backgroundSource = (): any => {
        if (!selectedSection) return mapBackgrounds.default;
        const [mapIdStr] = selectedSection.split('-');
        const mapId = parseInt(mapIdStr, 10);
        return mapBackgrounds[mapId as keyof typeof mapBackgrounds] || mapBackgrounds.default;
    };

    const queueDisplayName = (q: GameQueue): string => {
        const base = q.description || q.shortName || q.name || q.gameMode;
        const desc = (q.description || '').toLowerCase();
        const mode = (q.gameMode || '').toLowerCase();

        // Map-specific overrides
        const isShamata = isShamataQueue(q);
        const isAramMap = Number(q.mapId ?? q.map?.id ?? q.map?.mapId) === 12;
        if (isShamata) {
            return 'ARAM: \u015eamata';
        }
        if (isAramMap && q.gameMode === 'ARAM') {
            return 'ARAM';
        }

        // Quickplay / Tam Gaz (e.g., queue id 490 or strings containing tam gaz/quick)
        const isTamGaz =
            q.id === 490 ||
            mode.includes('quick') ||
            desc.includes('tam gaz') ||
            desc.includes('quick');
        if (isTamGaz) {
            return 'Tam Gaz';
        }

        if (q.gameMode === 'URF') {
            return 'URF';
        }

        if (q.gameMode === 'CHONCC') {
            return "Mekacık'ın Sınavı";
        }

        return base;
    };

    const findQueueById = (id: number): GameQueue | undefined => {
        for (const qList of Object.values(availableQueues)) {
            const match = qList.find(q => q.id === id);
            if (match) return match;
        }
        return undefined;
    };

    const queueDescription = (q: GameQueue): string => {
        const name = queueDisplayName(q).toLowerCase();
        const desc = (q.description || '').toLowerCase();

        if (name.includes('dereceli esnek') || desc.includes('flex')) return 'Play ranked with your team';
        if (name.includes('dereceli tek') || desc.includes('solo/duo')) return 'Play competitively alone or with a friend';
        if (name.includes('sıralı seçim') || desc.includes('draft')) return 'Ban and pick phase simulation';
        if (name.includes('tam gaz') || desc.includes('quick')) return 'Faster games with quick picks';
        if (name.includes('aram') && name.includes('şamata')) return 'Chaotic ARAM with special rules';
        if (name.includes('aram')) return 'All random champions, one lane';
        if (name.includes('urf')) return 'Ultra Rapid Fire mode';
        if (name.includes('arena') || q.gameMode === 'CHERRY') return '2v2v2v2 Arena battles';
        if (name.includes('mekacık')) return "Test your skills in Choncc's Trial";

        return 'Standard gameplay experience';
    };

    const handleCreateLobby = async () => {
        if (!selectedQueueId || creating) return;
        if (!lcuBridge.getIsConnected()) {
            if (onError) onError('Not connected to desktop client.');
            return;
        }

        // Check gameflow phase to prevent creating lobby while in game
        try {
            const phaseResult = await lcuBridge.request('/lol-gameflow/v1/gameflow-phase');
            if (phaseResult.status === 200 && typeof phaseResult.content === 'string') {
                const phase = phaseResult.content;
                if (phase === 'InProgress' || phase === 'ChampSelect' || phase === 'GameStart' || phase === 'Reconnect') {
                    if (onError) onError('Cannot create lobby while in game.');
                    return;
                }
            }
        } catch (e) {
            console.warn('[CreateLobbyScreen] Failed to check gameflow phase', e);
        }

        try {
            setCreating(true);
            const selectedQueue = findQueueById(selectedQueueId);
            const requestBody: any = { queueId: selectedQueueId };
            if (selectedQueue?.isCustom && selectedQueue?.gameMode === 'PRACTICETOOL' && selectedQueue.mapId) {
                requestBody.mapId = selectedQueue.mapId;
            }

            // Try to create lobby directly
            let result = await lcuBridge.request('/lol-lobby/v2/lobby', 'POST', requestBody);

            // If failed (likely because lobby exists), try to delete and recreate
            if (result.status >= 400) {
                console.log('[CreateLobbyScreen] POST failed, trying DELETE then POST');
                await lcuBridge.request('/lol-lobby/v2/lobby', 'DELETE');
                // Small delay to ensure cleanup
                await new Promise(r => setTimeout(r, 500));
                result = await lcuBridge.request('/lol-lobby/v2/lobby', 'POST', requestBody);
            }

            if (result.status >= 400) {
                // Fallback to PATCH if DELETE+POST failed (unlikely but safe)
                console.log('[CreateLobbyScreen] DELETE+POST failed, trying PATCH');
                result = await lcuBridge.request('/lol-lobby/v2/lobby', 'PATCH', requestBody);
            }

            if (result.content && result.content.error) {
                throw new Error(result.content.error);
            }

            // Check status again just in case
            if (result.status >= 400) {
                throw new Error(result.content?.message || 'Failed to create lobby');
            }

            onSuccess();
        } catch (error: any) {
            console.error('[CreateLobbyScreen] Failed to create/switch lobby', error);
            if (onError) {
                const message =
                    error?.content?.error ||
                    error?.content?.message ||
                    error?.message ||
                    'Failed to create lobby';
                onError(message);
            }
        } finally {
            setCreating(false);
        }
    };

    const formatTime = (date: Date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={onClose} style={styles.backRow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={styles.backIcon}>{'\u2039'}</Text>
                        <Text style={styles.backText}>Create Lobby</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.title}>Select Game Mode</Text>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={ACCENT} />
                        <Text style={styles.loadingText}>Loading queues...</Text>
                    </View>
                ) : (
                    <>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ flexGrow: 0, marginBottom: 8 }}
                            contentContainerStyle={styles.mapTilesRow}
                        >
                            {sections.map(section => {
                                const slug = sectionSlug(section);
                                const active = section === selectedSection;
                                const icon = mapIcons[slug][active ? 'active' : 'default'];
                                return (
                                    <MapTile
                                        key={section}
                                        icon={icon}
                                        label={mapLabel(section)}
                                        selected={active}
                                        onClick={() => {
                                            setSelectedSection(section);
                                            const firstQueue = (availableQueues[section] || [])[0];
                                            setSelectedQueueId(firstQueue ? firstQueue.id : 0);
                                        }}
                                    />
                                );
                            })}
                        </ScrollView>

                        {/* Divider between map selection and variants */}
                        <View style={styles.dividerContainer}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>Choose game variant</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <ScrollView style={styles.queueList} contentContainerStyle={styles.queueListContent}>
                            {selectedQueues.map(queue => {
                                const isSelected = queue.id === selectedQueueId;
                                return (
                                    <GameModeCard
                                        key={queue.id}
                                        title={queueDisplayName(queue)}
                                        description={queueDescription(queue)}
                                        selected={isSelected}
                                        onClick={() => setSelectedQueueId(queue.id)}
                                    />
                                );
                            })}

                            {!selectedQueues.length && (
                                <Text style={styles.emptyText}>No queues available for this map right now.</Text>
                            )}
                        </ScrollView>
                    </>
                )}

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.primaryButton, (!selectedQueueId || creating || loading) && styles.primaryButtonDisabled]}
                        onPress={handleCreateLobby}
                        disabled={!selectedQueueId || creating || loading}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryButtonText}>{creating ? 'Creating...' : 'Continue'}</Text>
                    </TouchableOpacity>
                    {onLeaveLobby && (
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={onLeaveLobby}
                            activeOpacity={0.6}
                        >
                            <Text style={styles.secondaryButtonText}>Leave Lobby</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0C1110' },
    container: {
        flex: 1,
        backgroundColor: '#0C1110',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    backRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    backIcon: {
        color: '#8A9298',
        fontSize: 24,
        fontWeight: '900'
    },
    backText: {
        color: '#8A9298',
        fontSize: 16,
        fontWeight: '700',
    },
    sectionHeader: {
        alignItems: 'center',
        marginBottom: 12
    },
    title: {
        color: '#F3F5F4',
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: 0.6,
        textTransform: 'uppercase'
    },
    mapTilesRow: {
        paddingVertical: 12,
        gap: 12,
        paddingHorizontal: 4,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 16,
        paddingHorizontal: 4,
        gap: 12,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(138, 146, 152, 0.15)',
    },
    dividerText: {
        color: '#6B7280',
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    queueList: {
        flex: 1
    },
    queueListContent: {
        paddingBottom: 12,
        paddingHorizontal: 0,
    },
    emptyText: {
        color: '#8A9298',
        fontSize: 14,
        paddingVertical: 12
    },
    footer: {
        marginTop: 16,
        gap: 12,
        paddingHorizontal: 4,
    },
    primaryButton: {
        backgroundColor: '#3EE0C1',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonDisabled: {
        backgroundColor: 'rgba(62, 224, 193, 0.3)',
    },
    primaryButtonText: {
        color: '#0C1110',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    secondaryButtonText: {
        color: '#8A9298',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10
    },
    loadingText: {
        color: '#F3F5F4'
    }
});
