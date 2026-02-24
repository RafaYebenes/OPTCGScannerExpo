import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { ScannedCard } from "./card.types";

export type RootStackParamList = {
  Login: undefined;
  Scanner: undefined;
  Collection: undefined;
  CardDetail?: {
    card: ScannedCard;
  };

  // ✅ Decks
  DecksList: undefined;
  DeckBuilder: { deckId: string };
  CardSelector: { deckId: string; mode: "leader" | "main" };
};

export type ScannerScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Scanner"
>;

export type ScannerScreenProps = {
  navigation: ScannerScreenNavigationProp;
};

export type CollectionScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Collection"
>;

export type CollectionScreenProps = {
  navigation: CollectionScreenNavigationProp;
};

export type CardDetailScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "CardDetail"
>;

export type CardDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  "CardDetail"
>;

export type CardDetailScreenProps = {
  navigation: CardDetailScreenNavigationProp;
  route: CardDetailScreenRouteProp;
};

// ✅ Decks navigation/route types (para usar en las screens nuevas)
export type DecksListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "DecksList"
>;

export type DeckBuilderScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "DeckBuilder"
>;
export type DeckBuilderScreenRouteProp = RouteProp<
  RootStackParamList,
  "DeckBuilder"
>;

export type CardSelectorScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "CardSelector"
>;
export type CardSelectorScreenRouteProp = RouteProp<
  RootStackParamList,
  "CardSelector"
>;
