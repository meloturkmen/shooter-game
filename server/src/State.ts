import { Player } from "./Player";

export interface ClientState {
    health: number;
    isMoving: boolean;
    position: [number, number, number];
    direction: [number, number, number, number];

}

export interface GameState {
    players: Player[];
}

export interface DecodedGameState {
    players: { id: string; state: ClientState }[];
}
