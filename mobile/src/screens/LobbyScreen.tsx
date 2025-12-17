import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Modal, TextInput, Switch, ImageBackground, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@rneui/themed';
import RolePicker, { ROLES } from '../components/RolePicker';
import QuickplaySetup from '../components/QuickplaySetup';
import { getLCUBridge } from '../lib/lcuBridge';
import { useAppStore } from '../state/appStore';
import ChampionGrid from '../components/ChampionGrid';
import { FavoriteChampionConfig, Lane, lanes, updateLanePreference } from '../lib/favoriteChampions';


const ACCENT = '#3EE0C1';
const OFFWHITE = '#e8e2cf';

const mapBackgrounds: Record<number | 'default', any> = {
    10: require('../../static/magic-background.jpg'),
    11: require('../../static/magic-background.jpg'),
    12: require('../../static/magic-background.jpg'),
    22: require('../../static/magic-background.jpg'),
    default: require('../../static/magic-background.jpg')
};

interface LobbyScreenProps {
    lobby: any;
    onEnterQueue: () => void;
    onLeaveLobby: () => void;
    onUpdateRoles: (first: string, second: string) => void;
    onOpenCreateLobby?: () => void;
    estimatedQueueTime?: number | null;
    favoriteConfig: FavoriteChampionConfig;
    onSaveFavoriteConfig: (config: FavoriteChampionConfig) => void;
    favoritesLoaded?: boolean;
    onError?: (message: string) => void;
    onSuccess?: (message: string) => void;
    gamePhase?: string;
    timeInQueue?: number;
    onCancelQueue?: () => void;
    readyCheck?: any;
    onAcceptMatch?: () => void;
    onDeclineMatch?: () => void;
    queuePenaltySeconds?: number;
}

export default function LobbyScreen({
    lobby,
    onEnterQueue,
    onLeaveLobby,
    onUpdateRoles,
    onOpenCreateLobby,
    estimatedQueueTime,
    favoriteConfig,
    onSaveFavoriteConfig,
    favoritesLoaded,
    onError,
    onSuccess,
    gamePhase,
    timeInQueue,
    onCancelQueue,
    readyCheck,
    onAcceptMatch,
    onDeclineMatch,
    queuePenaltySeconds = 0,
}: LobbyScreenProps) {
    const [showRolePicker, setShowRolePicker] = useState(false);
    const [pickingFirstRole, setPickingFirstRole] = useState(true);
    const [memberNames, setMemberNames] = useState<{ [summonerId: number]: string }>({});
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [friends, setFriends] = useState<any[]>([]);
    const [suggestedPlayers, setSuggestedPlayers] = useState<any[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [invitingId, setInvitingId] = useState<number | null>(null);
    const [friendSearch, setFriendSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'suggested' | 'friends'>('suggested');
    const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'online'>('all');
    const [queueInfo, setQueueInfo] = useState<any>(null);
    const [friendSortMode, setFriendSortMode] = useState<'availability' | 'name'>('availability');
    const fetchedIdsRef = useRef<Set<number>>(new Set());
    const [localPendingInvites, setLocalPendingInvites] = useState<any[]>([]);
    const cachedFriendsRef = useRef<any[]>([]);
    const [editingFavorites, setEditingFavorites] = useState<FavoriteChampionConfig>(favoriteConfig);
    const [ddragonVersion, setDdragonVersion] = useState('14.23.1');
    const [champions, setChampions] = useState<any[]>([]);
    const [championMap, setChampionMap] = useState<{ [key: number]: any }>({});
    const [loadingChamps, setLoadingChamps] = useState(false);
    const [activeLane, setActiveLane] = useState<Lane | null>(null);
    const [showFavoriteGrid, setShowFavoriteGrid] = useState(false);
    const [clock, setClock] = useState(() => new Date());
    const [memberMenu, setMemberMenu] = useState<{ visible: boolean; member: any | null }>({ visible: false, member: null });
    const [eligibilityWarnings, setEligibilityWarnings] = useState<string[]>([]);
    const setSharedMapId = useAppStore((state: any) => state.setMapId);

    const lcuBridge = getLCUBridge();
    const localMember = lobby?.members?.find((m: any) => m.puuid === lobby?.localMember?.puuid) || lobby?.localMember;
    const hasQuickplaySlots = Array.isArray(localMember?.playerSlots) && localMember.playerSlots.length > 0;
    const gameModeStr = (lobby?.gameConfig?.gameMode || '').toLowerCase();
    const isQuickplay = !!(
        hasQuickplaySlots ||
        lobby?.gameConfig?.showQuickPlaySlotSelection ||
        gameModeStr.includes('quick') ||
        gameModeStr.includes('tam') || // locale variant for Tam Gaz
        [480, 490].includes(lobby?.gameConfig?.queueId)
    );

    const showPositionSelector = lobby?.gameConfig?.showPositionSelector || false;

    // Determine background based on mapId
    const mapId = queueInfo?.mapId || lobby?.gameConfig?.mapId;
    const bgSource = mapBackgrounds[mapId] || mapBackgrounds.default;
    // Fetch queue information to get shortName
    useEffect(() => {
        const fetchQueueInfo = async () => {
            const queueId = lobby?.gameConfig?.queueId;
            if (!queueId || !lcuBridge.getIsConnected()) {
                setQueueInfo(null);
                setSharedMapId(lobby?.gameConfig?.mapId ?? null);
                return;
            }

            try {
                const result = await lcuBridge.request(`/lol-game-queues/v1/queues/${queueId}`);
                if (result.status === 200 && result.content) {
                    setQueueInfo(result.content);
                    if (result.content?.mapId) {
                        setSharedMapId(result.content.mapId);
                    }
                } else {
                    setQueueInfo(null);
                    setSharedMapId(lobby?.gameConfig?.mapId ?? null);
                }
            } catch (error) {
                console.error('[LobbyScreen] Failed to fetch queue info:', error);
                setQueueInfo(null);
                setSharedMapId(lobby?.gameConfig?.mapId ?? null);
            }
        };

        fetchQueueInfo();
    }, [lobby?.gameConfig?.queueId, lobby?.gameConfig?.mapId, lcuBridge, setSharedMapId]);

    // Fetch party eligibility warnings
    useEffect(() => {
        const fetchEligibility = async () => {
            if (!lcuBridge.getIsConnected() || !lobby) {
                setEligibilityWarnings([]);
                return;
            }

            try {
                const warnings: string[] = [];

                // Log full lobby object for debugging
                console.log('[LobbyScreen] Full lobby object keys:', Object.keys(lobby || {}));
                console.log('[LobbyScreen] lobby.restrictions:', JSON.stringify(lobby?.restrictions));
                console.log('[LobbyScreen] lobby.warnings:', JSON.stringify(lobby?.warnings));
                console.log('[LobbyScreen] lobby.canStartActivity:', lobby?.canStartActivity);

                // Check lobby.gatekeeperRestrictions - this is THE LCU field for restrictions
                if (lobby.gatekeeperRestrictions && Array.isArray(lobby.gatekeeperRestrictions)) {
                    console.log('[LobbyScreen] Found gatekeeperRestrictions:', JSON.stringify(lobby.gatekeeperRestrictions));
                    for (const restriction of lobby.gatekeeperRestrictions) {
                        // Get the reason/message from the restriction object
                        const message = restriction.reason || restriction.message || restriction.payload ||
                            (typeof restriction === 'string' ? restriction : '');
                        if (message && !warnings.includes(message)) {
                            warnings.push(message);
                        }
                    }
                }

                // Check lobby.restrictions - the actual LCU format uses restrictionCode and restrictionArgs
                if (lobby.restrictions && Array.isArray(lobby.restrictions) && lobby.restrictions.length > 0) {
                    console.log('[LobbyScreen] Processing restrictions:', JSON.stringify(lobby.restrictions));
                    for (const restriction of lobby.restrictions) {
                        const code = restriction.restrictionCode || '';
                        const args = restriction.restrictionArgs || {};
                        const summonerIds = restriction.summonerIds || [];

                        let message = '';

                        // Handle PlayerMinLevelRestriction - the most common case
                        if (code === 'PlayerMinLevelRestriction' || code.includes('MinLevel')) {
                            const minLevel = args.playerMinLevelRestriction || args.minLevel || args.requiredLevel || '30';
                            // Get summoner names from memberNames state or show summoner IDs
                            const affectedNames = summonerIds
                                .map((id: number) => memberNames[id] || `Summoner ${id}`)
                                .join(', ');
                            message = `Level ${minLevel} required for this queue${affectedNames ? `: ${affectedNames}` : ''}`;
                        }
                        // Handle other restriction types
                        else if (code === 'RankedRestriction') {
                            message = 'Ranked restriction active';
                        } else if (code === 'QueueDisabled') {
                            message = 'This queue is currently disabled';
                        } else if (code === 'TeamSizeLimit') {
                            message = 'Party size exceeds the limit for this queue';
                        } else if (code) {
                            // Convert camelCase to readable text
                            message = code.replace(/([A-Z])/g, ' $1').trim();
                        }

                        if (message && !warnings.includes(message)) {
                            warnings.push(message);
                        }
                    }
                }

                // Check lobby.warnings - try multiple formats
                if (lobby.warnings && Array.isArray(lobby.warnings) && lobby.warnings.length > 0) {
                    console.log('[LobbyScreen] Processing warnings:', JSON.stringify(lobby.warnings));
                    for (const warning of lobby.warnings) {
                        const message = warning.message || warning.text || warning.reason ||
                            (typeof warning === 'string' ? warning : null);
                        if (message && !warnings.includes(message)) {
                            warnings.push(message);
                        }
                    }
                }

                // Always fetch eligibility from API to get restrictions
                const result = await lcuBridge.request('/lol-lobby/v2/eligibility/party');
                console.log('[LobbyScreen] Eligibility API response status:', result?.status);
                console.log('[LobbyScreen] Eligibility API response:', JSON.stringify(result?.content)?.substring(0, 1000));

                if (result.status === 200 && result.content) {
                    const content = result.content;

                    // Handle array format
                    if (Array.isArray(content)) {
                        for (const entry of content) {
                            console.log('[LobbyScreen] Entry eligible:', entry.eligible, 'restrictions:', entry.restrictions?.length);
                            if (!entry.eligible && Array.isArray(entry.restrictions)) {
                                for (const restriction of entry.restrictions) {
                                    console.log('[LobbyScreen] Restriction object:', JSON.stringify(restriction));
                                    // Try to get message from various fields
                                    let message = restriction.restrictionReason ||
                                        restriction.reason ||
                                        restriction.message ||
                                        restriction.displayMessage;

                                    // Handle restrictionCode format
                                    const code = restriction.restrictionCode || restriction.code || '';
                                    const args = restriction.restrictionArgs || restriction.args || {};

                                    if (!message && code) {
                                        if (code.includes('Level') || code.includes('MinSummonerLevel')) {
                                            const minLevel = args.minLevel || args.requiredLevel || 30;
                                            const players = Object.values(args).filter(v => typeof v === 'string').join(', ') || '';
                                            message = `Level ${minLevel} required for this queue${players ? `: ${players}` : ''}`;
                                        } else {
                                            // Convert camelCase to readable text
                                            message = code.replace(/([A-Z])/g, ' $1').trim();
                                        }
                                    }

                                    if (message && !warnings.includes(message)) {
                                        warnings.push(message);
                                    }
                                }
                            }
                        }
                    }
                    // Handle object format
                    else if (typeof content === 'object') {
                        if (!content.eligible && Array.isArray(content.restrictions)) {
                            for (const restriction of content.restrictions) {
                                const message = restriction.restrictionReason || restriction.reason || restriction.message;
                                if (message && !warnings.includes(message)) {
                                    warnings.push(message);
                                }
                            }
                        }
                    }
                }

                console.log('[LobbyScreen] Final eligibility warnings:', warnings);
                setEligibilityWarnings(warnings);
            } catch (error) {
                console.warn('[LobbyScreen] Failed to fetch eligibility:', error);
                setEligibilityWarnings([]);
            }
        };

        fetchEligibility();
    }, [lobby, lcuBridge]);

    useEffect(() => {
        setEditingFavorites(favoriteConfig);
    }, [favoriteConfig]);

    useEffect(() => {
        const id = setInterval(() => setClock(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const loadChamps = async () => {
            try {
                setLoadingChamps(true);
                const versionRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
                const versions = await versionRes.json();
                const version = versions?.[0] || '14.23.1';
                setDdragonVersion(version);

                const champsRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
                const champsData = await champsRes.json();
                const champList = Object.values(champsData.data).map((c: any) => ({
                    id: parseInt(c.key),
                    key: c.id,
                    name: c.name,
                    image: c.image
                })).sort((a: any, b: any) => a.name.localeCompare(b.name));
                setChampions(champList);
                const map: { [key: number]: any } = {};
                champList.forEach((c: any) => { map[c.id] = c; });
                setChampionMap(map);
            } catch (error) {
                console.warn('[LobbyScreen] Failed to load champions for favorites', error);
            } finally {
                setLoadingChamps(false);
            }
        };

        loadChamps();
        loadChamps();
    }, []);

    // Sync with LCU lobby state
    useEffect(() => {
        if (!lcuBridge.getIsConnected()) return;

        let active = true;
        const checkLobbyState = async () => {
            try {
                const result = await lcuBridge.request('/lol-lobby/v2/lobby');
                if (!active) return;

                // If lobby is gone (404) or null content, leave
                if (result.status === 404 || !result.content) {
                    console.log('[LobbyScreen] Lobby no longer exists, leaving screen');
                    onLeaveLobby();
                }
            } catch (error) {
                console.warn('[LobbyScreen] Failed to check lobby state', error);
            }
        };

        // Check immediately
        checkLobbyState();

        // And poll every 2 seconds
        const interval = setInterval(checkLobbyState, 2000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [onLeaveLobby]);

    // Fetch summoner names for all members
    useEffect(() => {
        const hasMembers = lobby?.members && lobby.members.length > 0;
        const hasInvites = lobby?.invitations && lobby.invitations.length > 0;

        if (!hasMembers && !hasInvites) {
            setMemberNames({});
            fetchedIdsRef.current.clear();
            return;
        }

        const fetchSummonerNames = async () => {
            const names: { [summonerId: number]: string } = {};
            const idsToFetch = new Set<number>();

            lobby?.members?.forEach((member: any) => {
                if (member.summonerId) idsToFetch.add(member.summonerId);
            });
            lobby?.invitations?.forEach((invite: any) => {
                if (invite.toSummonerId) idsToFetch.add(invite.toSummonerId);
            });
            suggestedPlayers?.forEach((player: any) => {
                if (player.summonerId && !player.summonerName) idsToFetch.add(player.summonerId);
            });

            const idsNeedingFetch = Array.from(idsToFetch).filter(id => !fetchedIdsRef.current.has(id));

            if (idsNeedingFetch.length === 0) {
                return;
            }

            console.log(`[LobbyScreen] Fetching names for ${idsNeedingFetch.length} players...`);

            const fetchPromises = idsNeedingFetch.map(async (summonerId: number) => {
                try {
                    console.log(`[LobbyScreen] Fetching name for summoner ${summonerId}...`);
                    const result = await lcuBridge.request(`/lol-summoner/v1/summoners/${summonerId}`);
                    console.log(`[LobbyScreen] Response for ${summonerId}:`, result.status, result.content);

                    if (result.status === 200 && result.content) {
                        const displayName = result.content.displayName ||
                            result.content.gameName ||
                            result.content.summonerName ||
                            result.content.name;
                        if (displayName) {
                            names[summonerId] = displayName;
                            fetchedIdsRef.current.add(summonerId);
                            console.log(`[LobbyScreen] ✓ Fetched name for ${summonerId}: ${displayName}`);
                        } else {
                            console.warn(`[LobbyScreen] No name found in response for ${summonerId}:`, result.content);
                        }
                    } else {
                        console.warn(`[LobbyScreen] Failed to fetch summoner ${summonerId}: status ${result.status}`);
                    }
                } catch (error: any) {
                    console.error(`[LobbyScreen] Error fetching summoner name for ${summonerId}:`, error?.message || error);
                }
            });

            await Promise.all(fetchPromises);

            // Update state with newly fetched names
            if (Object.keys(names).length > 0) {
                console.log(`[LobbyScreen] Updating state with ${Object.keys(names).length} new names`);
                setMemberNames(prev => ({ ...prev, ...names }));
            } else {
                console.warn('[LobbyScreen] No names were fetched');
            }
        };

        fetchSummonerNames();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lobby?.members, lobby?.invitations, suggestedPlayers]);

    const loadData = async () => {
        if (!lcuBridge.getIsConnected()) {
            return;
        }
        try {
            setLoadingFriends(true);
            const result = await lcuBridge.request('/lol-chat/v1/friends');
            console.log('[LobbyScreen] Friends result:', result.status, result.content?.length);
            if (result.status === 200 && Array.isArray(result.content)) {
                const availabilityOrder: Record<string, number> = {
                    chat: 0,
                    mobile: 1,
                    away: 2,
                    dnd: 3,
                    offline: 4
                };
                const byAvailability = [...result.content].sort((a: any, b: any) => {
                    const aStatus = (a.availability || '').toLowerCase();
                    const bStatus = (b.availability || '').toLowerCase();
                    const aRank = availabilityOrder[aStatus] ?? 5;
                    const bRank = availabilityOrder[bStatus] ?? 5;
                    if (aRank !== bRank) return aRank - bRank;
                    const aName = (a.gameName || a.name || '').toLowerCase();
                    const bName = (b.gameName || b.name || '').toLowerCase();
                    return aName.localeCompare(bName);
                });
                const byName = [...result.content].sort((a: any, b: any) => {
                    const aName = (a.gameName || a.name || '').toLowerCase();
                    const bName = (b.gameName || b.name || '').toLowerCase();
                    return aName.localeCompare(bName);
                });
                const sorted = friendSortMode === 'availability' ? byAvailability : byName;
                setFriends(sorted);
                cachedFriendsRef.current = sorted;
            } else {
                setFriends(cachedFriendsRef.current || []);
            }

            // Load suggested players
            const suggestedResult = await lcuBridge.request('/lol-suggested-players/v1/suggested-players');
            console.log('[LobbyScreen] Suggested result:', suggestedResult.status, suggestedResult.content?.length, suggestedResult.content?.[0]);
            if (suggestedResult.status === 200 && Array.isArray(suggestedResult.content)) {
                setSuggestedPlayers(suggestedResult.content);
            }
        } catch (error) {
            console.error('[LobbyScreen] Failed to load friends list:', error);
            setFriends(cachedFriendsRef.current || []);
        } finally {
            setLoadingFriends(false);
        }
    };

    useEffect(() => {
        if (showInviteModal) {
            loadData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showInviteModal]);

    const handleRoleSelect = (role: string) => {
        const first = pickingFirstRole ? role : localMember?.firstPositionPreference || 'UNSELECTED';
        const second = !pickingFirstRole ? role : localMember?.secondPositionPreference || 'UNSELECTED';
        onUpdateRoles(first, second);
        setShowRolePicker(false);
    };

    const openRolePicker = (isFirst: boolean) => {
        setPickingFirstRole(isFirst);
        setShowRolePicker(true);
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

    const formatTimeInQueue = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getMapName = (mapId: number | null | undefined): string => {
        if (!mapId) return 'Unknown Map';

        switch (mapId) {
            case 10:
                return 'Twisted Treeline';
            case 11:
                return 'Summoner\'s Rift';
            case 12:
                return 'Howling Abyss';
            case 22:
                return 'Teamfight Tactics';
            case 30:
                return 'Arena';
            default:
                return `Map ${mapId}`;
        }
    };

    const getSubtitle = (): string => {
        // Prioritize shortName from queue info, then description, then name
        const queueName = queueInfo?.shortName || queueInfo?.description || queueInfo?.name;
        const mapId = lobby?.gameConfig?.mapId;
        const mapName = getMapName(mapId);

        // If we have queue name and map, show both
        if (queueName && mapId) {
            return `${queueName} - ${mapName}`;
        }

        // If we have queue name, show just that
        if (queueName) {
            return queueName;
        }

        // Fallback to gameMode if queue info not available yet
        const gameMode = lobby?.gameConfig?.gameMode;
        if (gameMode && mapId) {
            return `${gameMode} - ${mapName}`;
        }

        if (gameMode) {
            return gameMode;
        }

        if (mapId) {
            return mapName;
        }

        // Final fallback
        return 'Lobby';
    };

    const laneLabel = (lane: Lane) => {
        switch (lane) {
            case 'TOP':
                return 'Top';
            case 'JUNGLE':
                return 'Jungle';
            case 'MIDDLE':
                return 'Mid';
            case 'BOTTOM':
                return 'Bot';
            case 'UTILITY':
                return 'Support';
            default:
                return 'Fill';
        }
    };

    const updateFavoriteToggle = (key: 'autoHover' | 'autoLock' | 'allowFillFallback', value: boolean) => {
        const updated = { ...editingFavorites, [key]: value };
        setEditingFavorites(updated);
        onSaveFavoriteConfig(updated);
    };

    const openFavoritesForLane = (lane: Lane) => {
        setActiveLane(lane);
        setShowFavoriteGrid(true);
    };

    const handleFavoriteSelect = (championId: number) => {
        if (!activeLane) return;
        const updated = updateLanePreference(editingFavorites, activeLane, championId);
        setEditingFavorites(updated);
        onSaveFavoriteConfig(updated);
        setShowFavoriteGrid(false);
    };

    const handleRemoveFavorite = (lane: Lane, championId: number) => {
        const preferences = { ...editingFavorites.preferences };
        preferences[lane] = (preferences[lane] || []).filter((id) => id !== championId);
        const updated = { ...editingFavorites, preferences };
        setEditingFavorites(updated);
        onSaveFavoriteConfig(updated);
    };

    const sendInvite = async (toSummonerId: number) => {
        if (!toSummonerId || !lcuBridge.getIsConnected()) {
            if (onError) onError('Not connected to desktop client');
            return;
        }

        const alreadyInvited = lobby?.invitations?.some((invite: any) => invite.toSummonerId === toSummonerId && invite.state === 'Pending');
        if (alreadyInvited) {
            if (onError) onError('Invite already pending for this player');
            return;
        }

        try {
            setInvitingId(toSummonerId);
            const result = await lcuBridge.request('/lol-lobby/v2/lobby/invitations', 'POST', [{ toSummonerId }]);
            if (result.status >= 400) {
                const message = result.content?.message || result.content?.error || 'Failed to send invite';
                throw new Error(message);
            }
            // Optimistically track pending invite locally
            setLocalPendingInvites(prev => {
                if (prev.some(p => p.toSummonerId === toSummonerId)) return prev;
                return [...prev, { toSummonerId, state: 'Pending', invitationId: `local-${Date.now()}` }];
            });
            // Suppress lobby-level success modal
        } catch (error: any) {
            const message = error.message || 'Failed to send invite';
            console.error('[LobbyScreen] Error sending invite:', message);
        } finally {
            setInvitingId(null);
        }
    };

    // Clean up local pending invites once they appear in the actual lobby state
    useEffect(() => {
        if (lobby?.invitations && localPendingInvites.length > 0) {
            setLocalPendingInvites(prev => prev.filter(p => !lobby.invitations.some((i: any) => i.toSummonerId === p.toSummonerId)));
        }
    }, [lobby?.invitations, localPendingInvites.length]);

    const renderInviteState = (state: string) => {
        if (!state) return 'Pending';
        return state;
    };

    const sentInvites = (lobby?.invitations || []).filter((invite: any) => invite.toSummonerId !== localMember?.summonerId);
    const combinedInvites = [
        ...sentInvites,
        ...localPendingInvites.filter((p: any) => !sentInvites.some((i: any) => i.toSummonerId === p.toSummonerId)),
    ];
    const pendingInvites = sentInvites.filter((i: any) => i.state === 'Pending').length;
    const acceptedInvites = sentInvites.filter((i: any) => i.state === 'Accepted').length;
    const declinedInvites = sentInvites.filter((i: any) => i.state === 'Declined').length;

    const renderFriendName = (friend: any) => {
        return friend?.gameName || friend?.name || friend?.summonerName || memberNames[friend?.summonerId] || 'Unknown player';
    };

    const renderFriendStatus = (friend: any) => {
        const status = (friend?.availability || '').toLowerCase();
        if (!status) return activeTab === 'suggested' ? 'Suggested' : 'offline';
        return status;
    };

    const filteredFriends = (activeTab === 'suggested' ? suggestedPlayers : friends).filter((f) => {
        const name = (f.gameName || f.name || f.summonerName || '').toLowerCase();
        const matchesSearch = name.includes(friendSearch.trim().toLowerCase());
        return matchesSearch;
    });


    const availabilityColor = (availability?: string) => {
        const status = (availability || '').toLowerCase();
        if (status === 'chat' || status === 'online') return '#22c55e';
        if (status === 'mobile') return '#a855f7';
        if (status === 'away') return '#3EE0C1';
        if (status === 'dnd') return '#ef4444';
        return '#6b7280';
    };

    const closeInviteModal = () => {
        setShowInviteModal(false);
        setFriendSearch('');
        setActiveTab('suggested');
        setInvitingId(null);
    };

    // Ensure no lingering overlay blocks touches if the modal state ever desyncs
    useEffect(() => {
        if (!showInviteModal) {
            setInvitingId(null);
        }
    }, [showInviteModal]);

    const isMatchmaking = gamePhase === 'Matchmaking';
    const isReadyCheck = gamePhase === 'ReadyCheck';

    // Animation for progress bar
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isReadyCheck) {
            // Reset and start animation
            progressAnim.setValue(0);
            Animated.timing(progressAnim, {
                toValue: 1,
                duration: 10000, // 10 seconds
                useNativeDriver: false,
                easing: Easing.linear
            }).start();
        } else {
            // Reset when not in ready check
            progressAnim.setValue(0);
        }
    }, [isReadyCheck, progressAnim]);



    // Show loading state if lobby is null
    if (!lobby) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={ACCENT} />
                    <Text style={styles.loadingText}>Loading lobby...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const clockLabel = clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const subtitle = getSubtitle();
    const disableFindMatch = !localMember?.isLeader || queuePenaltySeconds > 0;

    const handleEnterQueue = async () => {
        if (!lcuBridge.getIsConnected()) {
            if (onError) onError('Not connected to desktop client');
            return;
        }

        // Check gameflow phase to prevent entering queue while in game
        try {
            const phaseResult = await lcuBridge.request('/lol-gameflow/v1/gameflow-phase');
            if (phaseResult.status === 200 && typeof phaseResult.content === 'string') {
                const phase = phaseResult.content;
                if (phase === 'InProgress' || phase === 'ChampSelect' || phase === 'GameStart' || phase === 'Reconnect') {
                    if (onError) onError('Cannot start queue while in game.');
                    return;
                }
            }
        } catch (e) {
            console.warn('[LobbyScreen] Failed to check gameflow phase', e);
        }

        onEnterQueue();
    };

    const handlePromoteMember = async (member: any) => {
        if (!localMember?.isLeader) return;
        if (!member?.summonerId) return;
        try {
            const res = await lcuBridge.request(`/lol-lobby/v2/lobby/members/${member.summonerId}/promote`, 'POST');
            if (res.status && res.status >= 400) {
                throw new Error(res.content?.message || `Failed to promote (${res.status})`);
            }
            if (onSuccess) onSuccess(`Promoted ${member.gameName || member.summonerName || 'player'}`);
        } catch (error: any) {
            console.error('[LobbyScreen] Failed to promote member:', error);
            if (onError) onError(error?.message || 'Failed to promote member');
        }
    };

    const handleKickMember = async (member: any) => {
        if (!localMember?.isLeader) return;
        if (!member?.summonerId) return;
        try {
            // LCU expects POST to /kick; DELETE on the member root often 500s
            const res = await lcuBridge.request(`/lol-lobby/v2/lobby/members/${member.summonerId}/kick`, 'POST');
            if (res.status && res.status >= 400) {
                throw new Error(res.content?.message || `Failed to remove (${res.status})`);
            }
            if (onSuccess) onSuccess(`Removed ${member.gameName || member.summonerName || 'player'}`);
        } catch (error: any) {
            console.error('[LobbyScreen] Failed to remove member:', error);
            if (onError) onError(error?.message || 'Failed to remove member');
        }
    };

    const isFriendMember = (member: any) => {
        if (!member) return false;
        return friends.some((f) => {
            if (member.puuid && f.puuid && member.puuid === f.puuid) return true;
            if (member.summonerId && f.summonerId && member.summonerId === f.summonerId) return true;
            return false;
        });
    };

    const handleSendFriendRequest = async (member: any) => {
        if (!member) return;
        const tag = member.gameTag || member.tagLine;
        const name = member.gameName || member.summonerName || member.displayName;
        if (!name || !tag) {
            if (onError) onError('Cannot send friend request without Riot ID and tag.');
            return;
        }
        try {
            const res = await lcuBridge.request('/lol-chat/v1/friend-requests', 'POST', {
                name,
                gameName: name,
                tagline: tag,
            });
            if (res.status && res.status >= 400) {
                throw new Error(res.content?.message || `Failed to send friend request (${res.status})`);
            }
            if (onSuccess) onSuccess(`Friend request sent to ${name}#${tag}`);
        } catch (error: any) {
            console.error('[LobbyScreen] Failed to send friend request:', error);
            if (onError) onError(error?.message || 'Failed to send friend request');
        }
    };



    // Determine progress bar color based on response
    let progressBarColor = '#f0e6d2'; // Default beige/white
    if (readyCheck?.playerResponse === 'Accepted') {
        progressBarColor = ACCENT; // Yellow
    } else if (readyCheck?.playerResponse === 'Declined') {
        progressBarColor = '#ef4444'; // Red
    }

    // Get map name for Ready Check
    const readyCheckMapName = getMapName(lobby?.gameConfig?.mapId);



    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Back Button at Top Left - styled like primary button */}
                {onOpenCreateLobby && (
                    <TouchableOpacity
                        style={styles.createLobbyButton}
                        onPress={onOpenCreateLobby}
                    >
                        <Text style={styles.createLobbyButtonText}>← Create Lobby</Text>
                    </TouchableOpacity>
                )}

                {/* Header Section */}
                <View style={styles.headerSection}>
                    <View style={styles.headerTopRow}>
                        <Text style={styles.contextLabel}>LOBBY</Text>
                        <Text style={styles.partyCounter}>
                            {lobby?.members?.length || 1}/{queueInfo?.maximumParticipantListSize || lobby?.gameConfig?.maxLobbySize || 5}
                        </Text>
                    </View>
                    <Text style={styles.modeTitle}>{queueInfo?.shortName || queueInfo?.description || lobby?.gameConfig?.gameMode || 'Game Mode'}</Text>
                </View>

                {/* Eligibility Warnings Banner */}
                {eligibilityWarnings.length > 0 && (
                    <View style={styles.warningBanner}>
                        <Text style={styles.warningIcon}>⚠️</Text>
                        <View style={styles.warningTextContainer}>
                            {eligibilityWarnings.map((warning, index) => (
                                <Text key={index} style={styles.warningText}>{warning}</Text>
                            ))}
                        </View>
                    </View>
                )}

                {/* Quickplay Setup (if applicable) */}
                {isQuickplay && (
                    <View style={styles.quickplayCard}>
                        <Text style={styles.quickplayTitle}>Quickplay Setup</Text>
                        <Text style={styles.quickplaySubtitle}>Pick 2 roles, champions, runes, and skins before queue</Text>
                        <QuickplaySetup
                            lobby={lobby}
                            onReady={onEnterQueue}
                            onError={onError}
                            onSuccess={onSuccess}
                        />
                    </View>
                )}

                {/* Team Section - Individual Player Cards */}
                <View style={styles.teamSection}>
                    {(lobby?.members || []).map((member: any, index: number) => {
                        const isLocalUser = member.summonerId === localMember?.summonerId;
                        const name =
                            member.gameName ||
                            member.summonerName ||
                            member.displayName ||
                            memberNames[member.summonerId] ||
                            member.name ||
                            'Unknown';
                        const status = member.ready ? 'Ready' : (member.isLeader ? 'Leader' : 'In Lobby');

                        return (
                            <View key={member.puuid || member.summonerId} style={styles.playerCard}>
                                {/* Left side: Avatar + Name */}
                                <View style={styles.playerInfoRow}>
                                    <Image
                                        source={{ uri: `https://ddragon.leagueoflegends.com/cdn/14.23.1/img/profileicon/${member.summonerIconId || 29}.png` }}
                                        style={styles.playerAvatar}
                                    />
                                    <Text style={styles.playerName}>{name}</Text>
                                </View>

                                {/* Right side: Lane Selectors (for local user) or Options (for others) */}
                                {isLocalUser && showPositionSelector ? (
                                    <View style={styles.laneSelectorsRow}>
                                        <TouchableOpacity style={styles.laneSelector} onPress={() => openRolePicker(true)}>
                                            <Image
                                                source={ROLES.find(r => r.id === localMember?.firstPositionPreference)?.icon || require('../../static/roles/role-unselected.png')}
                                                style={styles.laneSelectorIcon}
                                            />
                                        </TouchableOpacity>
                                        {localMember?.firstPositionPreference !== 'FILL' && (
                                            <TouchableOpacity style={styles.laneSelector} onPress={() => openRolePicker(false)}>
                                                <Image
                                                    source={ROLES.find(r => r.id === localMember?.secondPositionPreference)?.icon || require('../../static/roles/role-unselected.png')}
                                                    style={styles.laneSelectorIcon}
                                                />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ) : !isLocalUser ? (
                                    <TouchableOpacity
                                        onPress={() => setMemberMenu({ visible: true, member })}
                                        style={styles.memberOptionsBtn}
                                    >
                                        <Text style={styles.memberOptionsText}>•••</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        );
                    })}

                    {/* Single Invite Player Card - disabled when full */}
                    {(() => {
                        const maxSize = queueInfo?.maximumParticipantListSize || lobby?.gameConfig?.maxLobbySize || 5;
                        const currentSize = lobby?.members?.length || 1;
                        const isFull = currentSize >= maxSize;
                        return (
                            <TouchableOpacity
                                style={[styles.inviteCard, isFull && styles.inviteCardDisabled]}
                                onPress={() => setShowInviteModal(true)}
                                disabled={isFull}
                            >
                                <Text style={[styles.inviteCardText, isFull && styles.inviteCardTextDisabled]}>
                                    {isFull ? 'Party Full' : '+ Invite Player'}
                                </Text>
                            </TouchableOpacity>
                        );
                    })()}
                </View>

                {/* Footer - Sticky Bottom */}
                <View style={styles.footer}>
                    {queuePenaltySeconds > 0 && (
                        <View style={styles.penaltyBanner}>
                            <Text style={styles.penaltyTitle}>LOW PRIORITY QUEUE</Text>
                            <Text style={styles.penaltyText}>
                                Wait time remaining: {formatTimeInQueue(queuePenaltySeconds)}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.findMatchButton, (disableFindMatch || isMatchmaking || isReadyCheck) && styles.findMatchButtonDisabled]}
                        onPress={handleEnterQueue}
                        disabled={disableFindMatch || isMatchmaking || isReadyCheck}
                    >
                        <Text style={styles.findMatchText}>
                            {isMatchmaking ? 'Finding Match...' : isReadyCheck ? 'Match Found' : 'Find Game'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {(isMatchmaking || isReadyCheck) && (
                    <View style={styles.matchmakingDimOverlay} />
                )}

                {/* Finding Match Bottom Overlay */}
                {isMatchmaking && (
                    <View style={styles.matchmakingContainer}>
                        <View style={styles.matchmakingContent}>
                            <View style={styles.matchmakingTopRow}>
                                <Text style={styles.matchmakingTitle}>FINDING MATCH</Text>
                                <TouchableOpacity onPress={onCancelQueue} style={styles.matchmakingCloseButton}>
                                    <Text style={styles.matchmakingCloseIcon}>×</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.matchmakingSubtitle}>{subtitle}</Text>

                            {/* Avatar Strip */}
                            {lobby?.members && lobby.members.length > 0 && (
                                <View style={styles.avatarStrip}>
                                    {lobby.members.map((m: any, idx: number) => (
                                        <Image
                                            key={m.summonerId || idx}
                                            source={{ uri: `https://ddragon.leagueoflegends.com/cdn/14.23.1/img/profileicon/${m.summonerIconId || 29}.png` }}
                                            style={styles.avatarStripImage}
                                        />
                                    ))}
                                </View>
                            )}

                            <View style={styles.matchmakingTimerContainer}>
                                <Text style={styles.matchmakingTimer}>{formatTimeInQueue(timeInQueue || 0)}</Text>
                                {estimatedQueueTime ? (
                                    <Text style={styles.matchmakingEstimated}>Estimated: {formatTimeInQueue(estimatedQueueTime)}</Text>
                                ) : null}
                            </View>
                        </View>
                    </View>
                )}

                {/* Match Found / Ready Check UI */}
                {isReadyCheck && (
                    <View style={styles.readyCheckContainer}>
                        <Text style={styles.readyCheckTitle}>MATCH FOUND</Text>
                        <Text style={styles.readyCheckSubtitle}>{readyCheckMapName}</Text>

                        <View style={styles.readyCheckProgressContainer}>
                            <Animated.View
                                style={[
                                    styles.readyCheckProgressBar,
                                    {
                                        backgroundColor: progressBarColor,
                                        width: progressAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0%', '100%']
                                        })
                                    }
                                ]}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.acceptButton}
                            onPress={onAcceptMatch}
                            disabled={readyCheck?.playerResponse === 'Accepted'}
                        >
                            <Text style={styles.acceptButtonText}>{readyCheck?.playerResponse === 'Accepted' ? 'ACCEPTED' : 'ACCEPT!'}</Text>
                        </TouchableOpacity>

                        {readyCheck?.playerResponse !== 'Accepted' && (
                            <TouchableOpacity
                                style={styles.declineButton}
                                onPress={onDeclineMatch}
                                disabled={readyCheck?.playerResponse === 'Declined'}
                            >
                                <Text style={styles.declineButtonText}>DECLINE</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <RolePicker
                    visible={showRolePicker}
                    onSelect={handleRoleSelect}
                    onClose={() => setShowRolePicker(false)}
                    currentRole={pickingFirstRole ? localMember?.firstPositionPreference : localMember?.secondPositionPreference}
                />
                <Modal
                    visible={showFavoriteGrid}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setShowFavoriteGrid(false)}
                >
                    <View style={styles.modalRoot} pointerEvents="box-none">
                        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFavoriteGrid(false)} />
                        <View style={[styles.modalCard, styles.favoritesModalCard]}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {activeLane ? `Select favorites ? ${laneLabel(activeLane)}` : 'Select favorites'}
                                </Text>
                                <Button
                                    title="Done"
                                    type="clear"
                                    titleStyle={styles.modalClose}
                                    onPress={() => setShowFavoriteGrid(false)}
                                />
                            </View>
                            {loadingChamps ? (
                                <View style={styles.modalLoading}>
                                    <ActivityIndicator size="large" color={ACCENT} />
                                    <Text style={styles.modalLoadingText}>Loading champions...</Text>
                                </View>
                            ) : (
                                <ChampionGrid
                                    champions={champions}
                                    onSelect={handleFavoriteSelect}
                                    version={ddragonVersion}
                                />
                            )}
                        </View>
                    </View>
                </Modal>
                <Modal
                    visible={showInviteModal}
                    animationType="slide"
                    transparent
                    onRequestClose={closeInviteModal}
                >
                    <View style={styles.sheetRoot}>
                        <TouchableOpacity style={styles.sheetDimmedBg} activeOpacity={1} onPress={closeInviteModal} />
                        <View style={styles.inviteSheet}>
                            {/* Handle bar */}
                            <View style={styles.sheetHandleBar} />

                            {/* Header */}
                            <View style={styles.inviteSheetHeader}>
                                <Text style={styles.inviteSheetTitle}>Invite Players</Text>
                                <TouchableOpacity onPress={closeInviteModal} style={styles.sheetCloseBtn}>
                                    <Text style={styles.sheetCloseBtnText}>×</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Search Field */}
                            <View style={styles.inviteSearchRow}>
                                <View style={styles.inviteSearchWrapper}>
                                    <Text style={styles.inviteSearchIcon}>🔍</Text>
                                    <TextInput
                                        value={friendSearch}
                                        onChangeText={setFriendSearch}
                                        placeholder="Search summoner name"
                                        placeholderTextColor="#828599"
                                        style={styles.inviteSearchInput}
                                    />
                                </View>
                            </View>

                            {/* Tabs */}
                            <View style={styles.inviteTabsRow}>
                                <TouchableOpacity
                                    style={[styles.inviteTab, activeTab === 'suggested' && styles.inviteTabActive]}
                                    onPress={() => setActiveTab('suggested')}
                                >
                                    <Text style={[styles.inviteTabText, activeTab === 'suggested' && styles.inviteTabTextActive]}>Suggested</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.inviteTab, activeTab === 'friends' && styles.inviteTabActive]}
                                    onPress={() => setActiveTab('friends')}
                                >
                                    <Text style={[styles.inviteTabText, activeTab === 'friends' && styles.inviteTabTextActive]}>Friends</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Friend List */}
                            {loadingFriends ? (
                                <View style={styles.inviteEmptyState}>
                                    <ActivityIndicator size="large" color="#4DD6C9" />
                                    <Text style={styles.inviteEmptyText}>Loading...</Text>
                                </View>
                            ) : filteredFriends.length === 0 ? (
                                <View style={styles.inviteEmptyState}>
                                    <Text style={styles.inviteEmptyText}>
                                        {friendSearch ? 'No players found.' : activeTab === 'suggested' ? 'No suggested friends available.' : 'No friends to display.'}
                                    </Text>
                                </View>
                            ) : (
                                <ScrollView style={styles.inviteFriendList}>
                                    {filteredFriends.map((friend: any, index: number) => {
                                        const name = renderFriendName(friend);
                                        const status = renderFriendStatus(friend);
                                        const existing = combinedInvites.find((inv) => inv.toSummonerId === friend.summonerId);
                                        const isPending = existing?.state === 'Pending';
                                        const isOffline = (friend.availability || '').toLowerCase() === 'offline';
                                        const disabled = !!invitingId || !friend.summonerId || isPending || isOffline;
                                        const key = friend.puuid || friend.id || friend.summonerId || `friend-${index}`;

                                        return (
                                            <View key={key} style={styles.inviteFriendRow}>
                                                <Image
                                                    source={{ uri: `https://ddragon.leagueoflegends.com/cdn/14.23.1/img/profileicon/${friend.icon || 29}.png` }}
                                                    style={styles.inviteFriendAvatar}
                                                />
                                                <View style={styles.inviteFriendInfo}>
                                                    <Text style={styles.inviteFriendName}>{name}</Text>
                                                    <View style={styles.inviteFriendStatusRow}>
                                                        <View style={[styles.inviteStatusDot, { backgroundColor: availabilityColor(friend.availability) }]} />
                                                        <Text style={styles.inviteFriendStatus}>{status}</Text>
                                                    </View>
                                                </View>
                                                <TouchableOpacity
                                                    onPress={() => sendInvite(friend.summonerId)}
                                                    disabled={disabled}
                                                    style={[styles.inviteBtn, isPending && styles.inviteBtnInvited]}
                                                >
                                                    <Text style={[styles.inviteBtnText, isPending && styles.inviteBtnTextInvited]}>
                                                        {isPending ? 'Invited' : invitingId === friend.summonerId ? '...' : 'Invite'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                            )}

                            {/* Invited Players Section */}
                            <View style={styles.invitedPlayersSection}>
                                <Text style={styles.invitedPlayersTitle}>Invited Players</Text>
                                {combinedInvites.length > 0 ? (
                                    <ScrollView style={styles.invitedPlayersList}>
                                        {combinedInvites.map((invite: any, idx: number) => (
                                            <View key={`${invite.invitationId || invite.id || invite.toSummonerId}-${idx}`} style={styles.invitedPlayerRow}>
                                                <Text style={styles.invitedPlayerName}>{memberNames[invite.toSummonerId] || 'Unknown player'}</Text>
                                                <Text style={styles.invitedPlayerStatus}>{renderInviteState(invite.state)}</Text>
                                            </View>
                                        ))}
                                    </ScrollView>
                                ) : (
                                    <Text style={styles.invitedPlayersEmpty}>No players invited yet.</Text>
                                )}
                            </View>
                        </View>
                    </View>
                </Modal>
                <Modal
                    visible={memberMenu.visible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setMemberMenu({ visible: false, member: null })}
                >
                    <View style={styles.sheetOverlay}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={() => setMemberMenu({ visible: false, member: null })}
                        />
                        <View style={styles.sheetContainer}>
                            <View style={styles.sheetHeader}>
                                <View style={styles.sheetHandle} />
                                <View style={styles.sheetMemberInfo}>
                                    <View style={styles.sheetIconContainer}>
                                        <Image
                                            source={{ uri: `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/${memberMenu.member?.summonerIconId || 29}.png` }}
                                            style={styles.sheetProfileIcon}
                                        />
                                    </View>
                                    <View>
                                        <Text style={styles.sheetMemberName}>
                                            {memberMenu.member?.gameName || memberMenu.member?.summonerName || memberNames[memberMenu.member?.summonerId] || 'Player'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.sheetActions}>
                                {/* Promote Action */}
                                {localMember?.isLeader && !memberMenu.member?.isLeader && (
                                    <TouchableOpacity
                                        style={styles.sheetActionBtn}
                                        onPress={() => {
                                            handlePromoteMember(memberMenu.member);
                                            setMemberMenu({ visible: false, member: null });
                                        }}
                                    >
                                        <View style={styles.sheetActionIconWrapper}>
                                            <Image source={require('../../static/icon/banner-promote.png')} style={[styles.sheetActionIcon, { tintColor: ACCENT }]} />
                                        </View>
                                        <Text style={styles.sheetActionLabel}>Promote to Owner</Text>
                                    </TouchableOpacity>
                                )}

                                {/* Add Friend Action */}
                                {!isFriendMember(memberMenu.member) && (memberMenu.member?.gameTag || memberMenu.member?.tagLine) && (
                                    <TouchableOpacity
                                        style={styles.sheetActionBtn}
                                        onPress={() => {
                                            handleSendFriendRequest(memberMenu.member);
                                            setMemberMenu({ visible: false, member: null });
                                        }}
                                    >
                                        <View style={styles.sheetActionIconWrapper}>
                                            <Image source={require('../../static/icon/banner-add-friend.png')} style={[styles.sheetActionIcon, { tintColor: ACCENT }]} />
                                        </View>
                                        <Text style={styles.sheetActionLabel}>Add Friend</Text>
                                    </TouchableOpacity>
                                )}

                                {/* Kick Action */}
                                {localMember?.isLeader && !memberMenu.member?.isLeader && (
                                    <TouchableOpacity
                                        style={[styles.sheetActionBtn, styles.sheetActionBtnDestructive]}
                                        onPress={() => {
                                            handleKickMember(memberMenu.member);
                                            setMemberMenu({ visible: false, member: null });
                                        }}
                                    >
                                        <View style={styles.sheetActionIconWrapper}>
                                            <Image source={require('../../static/icon/banner-kick.png')} style={[styles.sheetActionIcon, { tintColor: '#ef4444' }]} />
                                        </View>
                                        <Text style={[styles.sheetActionLabel, styles.sheetDestructiveLabel]}>Kick from Lobby</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <TouchableOpacity
                                style={styles.sheetCancelBtn}
                                onPress={() => setMemberMenu({ visible: false, member: null })}
                            >
                                <Text style={styles.sheetCancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View >
        </SafeAreaView >
    );
}
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0C1110',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0C1110',
    },
    container: {
        flex: 1,
        backgroundColor: '#0C1110',
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    // Create Lobby Button - secondary text style like other back buttons
    createLobbyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
    },
    createLobbyButtonText: {
        color: '#8A9298',
        fontSize: 15,
        fontWeight: '600',
    },
    // Header Section
    headerSection: {
        marginBottom: 24,
    },
    contextLabel: {
        fontSize: 12,
        fontWeight: '400',
        color: '#8A9298',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    partyCounter: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8A9298',
    },
    modeTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#8A9298',
        marginBottom: 16,
    },
    mapRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    mapIcon: {
        width: 16,
        height: 16,
        borderRadius: 4,
        backgroundColor: '#101413',
    },
    mapLabel: {
        fontSize: 14,
        fontWeight: '400',
        color: '#8A9298',
    },
    // Quickplay Card
    quickplayCard: {
        width: '100%',
        backgroundColor: '#101413',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        padding: 16,
        marginBottom: 16,
    },
    quickplayTitle: {
        color: '#F3F5F4',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    quickplaySubtitle: {
        color: '#8A9298',
        fontSize: 13,
        marginBottom: 12,
    },
    // Warning Banner (for eligibility restrictions)
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(234, 179, 8, 0.15)',
        borderWidth: 1,
        borderColor: '#3EE0C1',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    warningIcon: {
        fontSize: 16,
        marginRight: 10,
    },
    warningTextContainer: {
        flex: 1,
    },
    warningText: {
        color: '#3EE0C1',
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    teamSection: {
        flex: 1,
        backgroundColor: '#101413',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
    },
    playerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    inviteCard: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        opacity: 0.6,
    },
    inviteCardDisabled: {
        opacity: 0.35,
    },
    inviteCardText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    inviteCardTextDisabled: {
        color: '#4B5563',
    },
    playerInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    playerNameContainer: {
        marginLeft: 12,
    },
    playerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    playerDetails: {
        flex: 1,
    },
    playerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F3F5F4',
        marginBottom: 2,
    },
    playerStatus: {
        fontSize: 13,
        fontWeight: '400',
        color: '#8A9298',
        marginBottom: 8,
    },
    laneSelectorsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    laneSelector: {
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
    laneSelectorIcon: {
        width: 40,
        height: 40,
        marginBottom: 8,
    },
    laneSelectorLabel: {
        color: '#8A9298',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    memberOptionsBtn: {
        padding: 8,
    },
    memberOptionsText: {
        color: '#8A9298',
        fontSize: 16,
    },
    emptySlot: {
        paddingVertical: 16,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    emptySlotText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#8A9298',
    },
    // Footer
    footer: {
        paddingTop: 12,
        paddingBottom: 16,
        gap: 10,
    },
    inviteLinkButton: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    inviteLinkText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#8A9298',
    },
    findMatchButton: {
        backgroundColor: '#3EE0C1',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    findMatchButtonDisabled: {
        backgroundColor: 'rgba(62, 224, 193, 0.3)',
    },
    findMatchText: {
        color: '#0C1110',
        fontSize: 16,
        fontWeight: '600',
    },
    penaltyBanner: {
        backgroundColor: '#7f1d1d',
        borderRadius: 8,
        padding: 12,
    },
    penaltyTitle: {
        color: '#fca5a5',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
    },
    penaltyText: {
        color: '#fca5a5',
        fontSize: 12,
    },
    // Keep remaining styles for modals/overlays
    bg: { flex: 1 },
    bgImage: { resizeMode: 'cover' },
    // Updated Sheet Styles
    sheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    // ... other sheet styles are already correct ...

    sheetContainer: {
        backgroundColor: '#0a0f14',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderTopWidth: 1,
        borderTopColor: ACCENT,
        paddingBottom: 40,
        paddingHorizontal: 20,
    },
    sheetHeader: {
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 16,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#3f3f46',
        borderRadius: 2,
        marginBottom: 16,
    },
    sheetMemberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        alignSelf: 'flex-start',
    },
    sheetIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: ACCENT,
        overflow: 'hidden',
    },
    sheetProfileIcon: {
        width: '100%',
        height: '100%',
    },
    sheetMemberName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    sheetMemberTag: {
        color: '#9ca3af',
        fontSize: 14,
    },
    sheetActions: {
        gap: 8,
    },
    sheetActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(199, 179, 123, 0.2)',
    },
    sheetActionBtnDestructive: {
        borderColor: 'rgba(239, 68, 68, 0.3)',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        marginTop: 8,
    },
    sheetActionIconWrapper: {
        width: 32,
        alignItems: 'center',
        marginRight: 12,
    },
    sheetActionIcon: {
        width: 20,
        height: 20,
        resizeMode: 'contain',
    },
    sheetActionLabel: {
        color: '#e5e7eb',
        fontSize: 16,
        fontWeight: '600',
    },
    sheetDestructiveLabel: {
        color: '#ef4444',
    },
    sheetCancelBtn: {
        marginTop: 16,
        alignItems: 'center',
        paddingVertical: 12,
    },
    sheetCancelText: {
        color: '#9ca3af',
        fontSize: 16,
        fontWeight: '600',
    },
    inviteButton: {
        width: '100%',
        borderWidth: 1,
        borderColor: ACCENT,
        borderTopWidth: 0,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: 'rgba(8, 13, 18, 0.6)',
        marginTop: -1,
    },
    inviteButtonText: {
        color: '#cfd5dd',
        fontSize: 16,
        fontWeight: '500',
    },
    loadingText: {
        color: OFFWHITE,
        fontSize: 16,
        marginTop: 16,
    },
    modalRoot: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    modalCard: {
        width: '90%',
        height: '80%',
        backgroundColor: '#091428',
        borderWidth: 1,
        borderColor: ACCENT,
        borderRadius: 4,
        padding: 0,
        overflow: 'hidden',
    },
    favoritesModalCard: {
        height: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1e282d',
        backgroundColor: '#010a13',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: ACCENT,
        textTransform: 'uppercase',
    },
    // ============= Invite Bottom Sheet Styles =============
    sheetRoot: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheetDimmedBg: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
    },
    inviteSheet: {
        backgroundColor: '#0C1110',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '85%',
        paddingBottom: 24,
    },
    sheetHandleBar: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    inviteSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    inviteSheetTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: '#8A9298',
    },
    sheetCloseBtn: {
        padding: 6,
    },
    sheetCloseBtnText: {
        color: '#6B7280',
        fontSize: 20,
        fontWeight: '300',
    },
    // Search field
    inviteSearchRow: {
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    inviteSearchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#101413',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        borderRadius: 10,
        height: 48,
        paddingHorizontal: 14,
    },
    inviteSearchIcon: {
        marginRight: 8,
        fontSize: 14,
    },
    inviteSearchInput: {
        flex: 1,
        color: '#F3F5F4',
        fontSize: 14,
    },
    // Tabs
    inviteTabsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        marginBottom: 4,
    },
    inviteTab: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginRight: 4,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    inviteTabActive: {
        borderBottomColor: '#3EE0C1',
    },
    inviteTabText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6B7280',
    },
    inviteTabTextActive: {
        color: '#F3F5F4',
        fontWeight: '600',
    },
    // Empty state
    inviteEmptyState: {
        padding: 32,
        alignItems: 'center',
        gap: 12,
    },
    inviteEmptyText: {
        color: '#6B7280',
        fontSize: 13,
        textAlign: 'center',
        opacity: 0.8,
    },
    // Friend list
    inviteFriendList: {
        flex: 1,
    },
    inviteFriendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    inviteFriendAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 12,
    },
    inviteFriendInfo: {
        flex: 1,
    },
    inviteFriendName: {
        color: '#F3F5F4',
        fontSize: 14,
        fontWeight: '500',
    },
    inviteFriendStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    inviteStatusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    inviteFriendStatus: {
        color: '#8A9298',
        fontSize: 12,
    },
    // Invite button
    inviteBtn: {
        backgroundColor: '#3EE0C1',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    inviteBtnInvited: {
        backgroundColor: 'rgba(62, 224, 193, 0.15)',
    },
    inviteBtnText: {
        color: '#0C1110',
        fontSize: 11,
        fontWeight: '600',
    },
    inviteBtnTextInvited: {
        color: '#3EE0C1',
    },
    // Invited Players section
    invitedPlayersSection: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 16,
    },
    invitedPlayersTitle: {
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    invitedPlayersList: {
        maxHeight: 100,
    },
    invitedPlayerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    invitedPlayerName: {
        color: '#F3F5F4',
        fontSize: 13,
    },
    invitedPlayerStatus: {
        color: '#3EE0C1',
        fontSize: 11,
        fontWeight: '500',
    },
    invitedPlayersEmpty: {
        color: '#4B5563',
        fontSize: 12,
        fontStyle: 'italic',
        opacity: 0.7,
    },


    modalLoading: {
        padding: 40,
        alignItems: 'center',
        gap: 16,
    },
    modalLoadingText: {
        color: '#888',
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    searchInputWrapper: {
        flex: 1,
        height: 40,
        borderWidth: 1,
        borderColor: ACCENT,
        justifyContent: 'center',
    },
    searchInput: {
        color: '#f0e6d2',
        paddingHorizontal: 12,
        fontSize: 14,
    },
    friendList: {
        flex: 1,
    },
    friendRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    friendName: {
        color: '#f0e6d2',
        fontSize: 14,
        fontWeight: '600',
    },
    friendStatus: {
        color: '#888',
        fontSize: 12,
        marginTop: 2,
    },
    inviteAction: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: ACCENT,
    },
    inviteActionDisabled: {
        opacity: 0.5,
        borderColor: '#6b7280',
    },
    inviteActionText: {
        color: ACCENT,
        fontSize: 12,
        fontWeight: '600',
    },
    invitedSection: {
        paddingTop: 12,
        paddingBottom: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(199, 179, 123, 0.2)',
    },
    invitedHeader: {
        color: ACCENT,
        fontSize: 16,
        fontWeight: '700',
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    invitedSeparator: {
        height: 1,
        backgroundColor: ACCENT,
        marginHorizontal: 16,
        marginBottom: 8,
        opacity: 0.3,
    },
    noInvitesText: {
        color: '#6b7280',
        fontSize: 14,
        paddingHorizontal: 16,
        paddingBottom: 16,
        fontStyle: 'italic',
    },
    inviteStatus: {
        color: ACCENT,
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    secondaryCta: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    secondaryCtaText: {
        color: ACCENT,
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    leaveCta: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    leaveCtaText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    modalClose: {
        color: '#f0e6d2',
    },
    modalHeaderTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    refreshButton: {
        padding: 4,
    },
    refreshIcon: {
        color: ACCENT,
        fontSize: 18,
        fontWeight: '700',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: ACCENT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButtonText: {
        color: ACCENT,
        fontSize: 18,
        fontWeight: '400',
        marginTop: -2,
    },
    addButton: {
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: {
        color: ACCENT,
        fontSize: 24,
        fontWeight: '400',
    },
    tabRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: 8,
    },
    tabButton: {
        paddingVertical: 8,
        marginRight: 16,
    },
    tabButtonActive: {
    },
    tabText: {
        color: '#6b7280',
        fontSize: 16,
        fontWeight: '700',
    },
    tabTextActive: {
        color: ACCENT,
    },
    tabSeparator: {
        width: 1,
        height: 16,
        backgroundColor: '#3c3c41',
        marginRight: 16,
    },
    tabUnderline: {
        height: 1,
        backgroundColor: '#3c3c41',
        marginHorizontal: 16,
        marginBottom: 8,
    },
    invitationList: {
        maxHeight: 200,
    },
    invitationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
    },
    invitationName: {
        color: '#cfd5dd',
        fontSize: 14,
        fontWeight: '500',
    },
    matchmakingDimOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 10,
    },
    matchmakingContainer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        zIndex: 20,
        backgroundColor: '#101413',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    matchmakingContent: {
        padding: 20,
    },
    matchmakingTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    matchmakingTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#8A9298',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    matchmakingSubtitle: {
        fontSize: 16,
        color: '#F3F5F4',
        fontWeight: '600',
        marginBottom: 16,
    },
    avatarStrip: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 16,
    },
    avatarStripImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: '#101413',
    },
    matchmakingCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    matchmakingCloseIcon: {
        color: '#8A9298',
        fontSize: 20,
        marginTop: -2,
    },
    matchmakingTimerContainer: {
        marginTop: 0,
        alignItems: 'center',
    },
    matchmakingTimer: {
        fontSize: 32,
        fontWeight: '700',
        color: '#3EE0C1',
        fontVariant: ['tabular-nums'],
        marginBottom: 4,
    },
    matchmakingEstimated: {
        fontSize: 13,
        color: '#8A9298',
        fontWeight: '500',
    },
    readyCheckContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    readyCheckTitle: {
        fontSize: 36,
        fontWeight: '800',
        color: '#f0e6d2',
        letterSpacing: 2,
        fontFamily: 'serif',
        textTransform: 'uppercase',
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.75)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    readyCheckSubtitle: {
        fontSize: 18,
        color: '#cfd5dd',
        marginBottom: 24,
    },
    readyCheckProgressContainer: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(0,0,0,0.5)',
        marginBottom: 32,
        borderRadius: 3,
        overflow: 'hidden',
    },
    readyCheckProgressBar: {
        height: '100%',
        borderRadius: 3,
    },
    acceptButton: {
        width: '100%',
        backgroundColor: '#1e2328',
        borderWidth: 2,
        borderColor: ACCENT,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 16,
    },
    acceptButtonText: {
        color: ACCENT,
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    declineButton: {
        width: '60%',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#0acbe6',
        paddingVertical: 12,
        alignItems: 'center',
    },
    declineButtonText: {
        color: '#f0e6d2',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    positionSelectorContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 20,
    },
    positionButton: {
        alignItems: 'center',
    },
    positionLabel: {
        color: '#9ca3af',
        fontSize: 12,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    positionIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderWidth: 1,
        borderColor: '#3EE0C1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    positionIconImage: {
        width: 40,
        height: 40,
        resizeMode: 'contain',
    },
});
