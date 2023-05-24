import { Game } from './Game';
export enum WebsocketEvents {
    ClientState = "clientState",
    GameState = "gameState",
    Shoot = "shoot",
    Hit = "hit",
    GameOver = "gameOver"
}
