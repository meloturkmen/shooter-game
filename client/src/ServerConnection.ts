import { ClientState, GameState } from "./State";
import { WebsocketEvents } from "./Constants";
import * as SocketIOClient from "socket.io-client";

export class ServerConnection {
    constructor(private readonly _socket: SocketIOClient.Socket) {
        this._socket.on("connect", () => {
            console.log(`Connected to server!`);
        });
    }

    public sendClientState(clientState: ClientState) {
        this._socket.emit(WebsocketEvents.ClientState, clientState);
    }

    public onRecieveState(callback: (newState: GameState) => void) {
        this._socket.on(WebsocketEvents.GameState, (state: GameState) =>
            callback(state)
        );
    }

    public onShoot(callback: (id: string, position: number[], direction: number[]) => void) {
        this._socket.on(WebsocketEvents.Shoot, (id: string, position: number[], direction: number[]) => callback(id, position, direction));
    }

    public emitShoot(position: number[], direction: number[]) {
        this._socket.emit(WebsocketEvents.Shoot, position, direction);
    }

    public emitHit(playerID: string, bulletID: string) {
        this._socket.emit(WebsocketEvents.Hit, playerID, bulletID);
    }

    public onDead(callback: () => void) {
        this._socket.on(WebsocketEvents.Dead, () => callback());
    }

    public emitGameOver( playerTime: number) {
        this._socket.emit(WebsocketEvents.GameOver, playerTime);
    }

    public onGameOver(callback: (playerID: string, playerTime: number) => void) {
        this._socket.on(WebsocketEvents.GameOver, (playerID: string, playerTime: number) => callback(playerID, playerTime));
    }





    public onDisconnect(callback: () => void) {
        this._socket.on("disconnect", () => {
            console.log(`Disconnected from server!`);
            callback();
        });
    }
}
