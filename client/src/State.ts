export interface ClientState {
    health?: number;
    position: [number, number, number];
    direction?: [number, number, number, number];
    isMoving?: boolean;
}

export interface GameState {
    players: { id: string; state: ClientState }[];
}

export const GAME_INITIAL_STATE: GameState = {
    players: [],
};

export const PLAYER_INITIAL_STATE: ClientState = {
    health: 100,
    isMoving: false,
    position: [0, 0, 0],
    direction: [0, 0, 0, 0]
};
