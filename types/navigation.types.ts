import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ScannedCard } from './card.types';

export type RootStackParamList = {
    Login: undefined;
    Scanner: undefined;
    Collection: undefined;
    CardDetail?: {
        card: ScannedCard;
    };
};

export type ScannerScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Scanner'>;

export type ScannerScreenProps = {
    navigation: ScannerScreenNavigationProp;
};

export type CollectionScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Collection'>;

export type CollectionScreenProps = {
    navigation: CollectionScreenNavigationProp;
};

export type CardDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CardDetail'>;

export type CardDetailScreenRouteProp = RouteProp<RootStackParamList, 'CardDetail'>;

export type CardDetailScreenProps = {
    navigation: CardDetailScreenNavigationProp;
    route: CardDetailScreenRouteProp;
};