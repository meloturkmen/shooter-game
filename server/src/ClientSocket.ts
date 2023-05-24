import socketio from "socket.io";
import { Player } from "./Player";
import { Logger } from "./Logger";
import { WebsocketEvents } from "./Constants";
import { ClientState, DecodedGameState, GameState } from "./State";

export class ClientSocket {
    constructor(
        private readonly _logger: Logger,
        private readonly _socket: socketio.Socket
    ) {
        this._logger.userLog(_socket.id.toString(), "connected");


    }

    public get id(): string {
        return this._socket.id;
    }

    public onRecieveState(callback: (newState: ClientState) => void) {
        this._socket.on(WebsocketEvents.ClientState, (newState: ClientState) =>
            callback(newState)
        );
    }

    public sendGameState(state: GameState) {
        this._socket.emit(
            WebsocketEvents.GameState,
            this.decodeGameState(state)
        );
    }

    public onReceiveShoot() {
        this._socket.on(WebsocketEvents.Shoot, (position: number[], direction: number[]) => {
            const id = this._socket.id;

            this._socket.broadcast.emit(WebsocketEvents.Shoot, id, position, direction);
        });
    }







    private decodeGameState(state: GameState): DecodedGameState {
        return {
            players: state.players.map((player: Player) => {
                return {
                    id: player.id,
                    state: player.state,
                };
            }),
        };
    }
}
