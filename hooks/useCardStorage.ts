import { useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService';
import { ScannedCard } from '../types/card.types';

export const useCardStorage = () => {
    const [recentCards, setRecentCards] = useState<ScannedCard[]>([]);
    const [stats, setStats] = useState({
        totalScans: 0,
        uniqueCards: 0,
        alternateArts: 0,
        lastScan: null as number | null,
    });

    const loadRecentCards = useCallback(async () => {
        const cards = await storageService.getRecentCards(5);
        setRecentCards(cards);
    }, []);

    const loadStats = useCallback(async () => {
        const newStats = await storageService.getStats();
        setStats(newStats);
    }, []);

    const refresh = useCallback(async () => {
        await loadRecentCards();
        await loadStats();
    }, [loadRecentCards, loadStats]);

    const deleteCard = useCallback(async (id: string) => {
        await storageService.deleteCard(id);
        await refresh();
    }, [refresh]);

    const clearAll = useCallback(async () => {
        await storageService.clearAllCards();
        await refresh();
    }, [refresh]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return {
        recentCards,
        stats,
        refresh,
        deleteCard,
        clearAll,
    };
};