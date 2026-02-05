// src/services/storageService.ts (VERSIÓN CON ASYNCSTORAGE)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScannedCard } from '../types/card.types';

export class StorageService {
  private readonly CARDS_KEY = 'scanned_cards';
  private readonly LAST_SCAN_KEY = 'last_scan_time';

  async saveCard(card: ScannedCard): Promise<boolean> {
    try {
      const cards = await this.getAllCards();
      
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      const isDuplicate = cards.some(c => 
        c.code.fullCode === card.code.fullCode && 
        c.scannedAt > fiveMinutesAgo
      );

      if (isDuplicate) {
        console.log('Carta duplicada detectada, ignorando');
        return false;
      }

      cards.unshift(card);
      
      await AsyncStorage.setItem(this.CARDS_KEY, JSON.stringify(cards));
      await AsyncStorage.setItem(this.LAST_SCAN_KEY, Date.now().toString());
      
      return true;
    } catch (error) {
      console.error('Error guardando carta:', error);
      return false;
    }
  }

  async getAllCards(): Promise<ScannedCard[]> {
    try {
      const cardsJson = await AsyncStorage.getItem(this.CARDS_KEY);
      return cardsJson ? JSON.parse(cardsJson) : [];
    } catch (error) {
      console.error('Error obteniendo cartas:', error);
      return [];
    }
  }

  async getRecentCards(limit: number = 10): Promise<ScannedCard[]> {
    const cards = await this.getAllCards();
    return cards.slice(0, limit);
  }

  async getCardByCode(code: string): Promise<ScannedCard | null> {
    const cards = await this.getAllCards();
    return cards.find(c => c.code.fullCode === code) || null;
  }

  async getUniqueCardCount(): Promise<number> {
    const cards = await this.getAllCards();
    const uniqueCodes = new Set(cards.map(c => c.code.fullCode));
    return uniqueCodes.size;
  }

  async getTimeSinceLastScan(): Promise<number | null> {
    const lastScan = await AsyncStorage.getItem(this.LAST_SCAN_KEY);
    return lastScan ? Date.now() - parseInt(lastScan) : null;
  }

  async clearAllCards(): Promise<void> {
    await AsyncStorage.removeItem(this.CARDS_KEY);
    await AsyncStorage.removeItem(this.LAST_SCAN_KEY);
  }

  async deleteCard(id: string): Promise<boolean> {
    try {
      const cards = await this.getAllCards();
      const filtered = cards.filter(c => c.id !== id);
      await AsyncStorage.setItem(this.CARDS_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error eliminando carta:', error);
      return false;
    }
  }

  async getStats() {
    const cards = await this.getAllCards();
    const uniqueCodes = new Set(cards.map(c => c.code.fullCode));
    const altArts = cards.filter(c => c.hasAlternateArt).length;

    return {
      totalScans: cards.length,
      uniqueCards: uniqueCodes.size,
      alternateArts: altArts,
      lastScan: await this.getTimeSinceLastScan(),
    };
  }
}

export const storageService = new StorageService();