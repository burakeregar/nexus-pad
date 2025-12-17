
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, Dimensions, Animated, Text } from 'react-native';

interface Champion {
    id: number;
    key: string;
    name: string;
    image: {
        full: string;
    };
}



interface ChampionGridProps {
    champions: Champion[];
    onSelect: (championId: number) => void;
    disabled?: boolean;
    version?: string;
    hoveredId?: number | null;
    lockedId?: number | null;
    teammateHoveredIds?: number[];
    pickedIds?: number[];
    bannedIds?: number[];
    availableChampionIds?: number[];
    ListHeaderComponent?: React.ReactElement | null;
    ListFooterComponent?: React.ReactElement | null;
    contentContainerStyle?: any;
}

const numColumns = 5;
const screenWidth = Dimensions.get('window').width;
const gridPadding = 12; // Reduced lateral padding
const tileGap = 4; // Minimum functional spacing
const itemWidth = (screenWidth - (gridPadding * 2) - (tileGap * (numColumns - 1))) / numColumns;

export default function ChampionGrid({
    champions,
    onSelect,
    disabled,
    version = '14.23.1',
    hoveredId,
    lockedId,
    teammateHoveredIds = [],
    pickedIds = [],
    bannedIds = [],
    availableChampionIds = [],
    ListHeaderComponent,
    ListFooterComponent,
    contentContainerStyle
}: ChampionGridProps) {
    const [search, setSearch] = useState('');
    const teammateBlinkAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (teammateHoveredIds.length > 0) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(teammateBlinkAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
                    Animated.timing(teammateBlinkAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                ])
            ).start();
        } else {
            teammateBlinkAnim.stopAnimation(() => teammateBlinkAnim.setValue(1));
        }
    }, [teammateHoveredIds.length, teammateBlinkAnim]);

    const filteredChampions = useMemo(() => {
        return champions.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    }, [champions, search]);

    const renderItem = ({ item }: { item: Champion }) => {
        const isHovered = hoveredId === item.id;
        const isLocked = lockedId === item.id;
        const isTeammateHovered = teammateHoveredIds.includes(item.id);
        const isPicked = pickedIds.includes(item.id);
        const isBanned = bannedIds.includes(item.id);
        const isOwned = availableChampionIds.includes(item.id);
        const isUnavailable = isPicked || isBanned || !isOwned;
        const isDisabled = disabled || isUnavailable;

        return (
            <TouchableOpacity onPress={() => onSelect(item.id)} disabled={isDisabled} style={styles.item}>
                <View style={[
                    styles.imageContainer,
                    isHovered && !isLocked && styles.containerSelected,
                    isLocked && styles.containerLocked,
                    isTeammateHovered && !isHovered && !isLocked && styles.containerTeammateHovered,
                    isUnavailable && styles.containerUnavailable,
                ]}>
                    <Image
                        source={{ uri: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${item.image.full}` }}
                        style={[
                            styles.image,
                            isUnavailable && styles.imageDisabled
                        ]}
                    />
                    {isLocked && (
                        <View style={styles.lockedOverlay}>
                            <Text style={styles.lockedIcon}>✓</Text>
                        </View>
                    )}
                    {isTeammateHovered && !isHovered && !isLocked && (
                        <Animated.View style={[styles.teammateHoverOverlay, { opacity: teammateBlinkAnim }]} />
                    )}
                </View>
                <Text style={[styles.name, isUnavailable && styles.nameDisabled]} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                ListHeaderComponent={
                    <>
                        {ListHeaderComponent}
                        <View style={styles.searchContainer}>
                            <Text style={styles.searchIcon}>🔍</Text>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search champions..."
                                placeholderTextColor="#6B7280"
                                value={search}
                                onChangeText={setSearch}
                            />
                        </View>
                    </>
                }
                ListFooterComponent={ListFooterComponent}
                data={filteredChampions}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                numColumns={numColumns}
                columnWrapperStyle={styles.row}
                contentContainerStyle={[styles.listContent, contentContainerStyle]}
                showsVerticalScrollIndicator={false}
                initialNumToRender={25}
                maxToRenderPerBatch={25}
                windowSize={5}
                removeClippedSubviews={true}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: gridPadding,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#101413',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        borderRadius: 10,
        height: 48,
        paddingHorizontal: 14,
        marginBottom: 12,
    },
    searchIcon: {
        marginRight: 10,
        fontSize: 14,
    },
    searchInput: {
        flex: 1,
        color: '#F3F5F4',
        fontSize: 14,
    },
    listContent: {
        paddingBottom: 20,
    },
    row: {
        justifyContent: 'flex-start',
        gap: tileGap,
    },
    item: {
        width: itemWidth,
        marginBottom: 8,
        alignItems: 'center',
    },
    imageContainer: {
        width: itemWidth - 4,
        height: itemWidth - 4,
        borderRadius: 6,
        marginBottom: 4,
        position: 'relative',
        backgroundColor: '#0C1110',
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    containerSelected: {
        borderWidth: 2,
        borderColor: '#3EE0C1',
    },
    containerLocked: {
        borderWidth: 2,
        borderColor: '#3EE0C1',
    },
    lockedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(62, 224, 193, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    lockedIcon: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: 'bold',
    },
    containerTeammateHovered: {
        borderWidth: 2,
        borderColor: '#3EE0C1',
        opacity: 0.8,
    },
    containerUnavailable: {
        opacity: 0.25,
    },
    imageDisabled: {
        opacity: 0.5,
    },
    teammateHoverOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(62, 224, 193, 0.15)',
    },
    nameDisabled: {
        color: '#4B5563',
    },
    name: {
        color: '#8A9298',
        fontSize: 10,
        textAlign: 'center',
        fontWeight: '500',
    },
});
