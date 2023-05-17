import { ClientState, GameState, GAME_INITIAL_STATE } from "./State";
import { ServerConnection } from "./ServerConnection";
import { NetworkPlayer } from "./NetworkPlayer";
import { MeshManager } from "./MeshManager";
import { Player } from "./Player";
import { Vector3 } from "@babylonjs/core";
import Bullet from "./Bullet";

export class Game {
    private _gameState: GameState;
    private _networkPlayers: Map<string, NetworkPlayer> = new Map();

    constructor(
        private readonly _serverConnection: ServerConnection,
        private readonly _meshManager: MeshManager,
        private readonly _player: Player
    ) {
        this._gameState = GAME_INITIAL_STATE;
        GAME_INITIAL_STATE.players.forEach(({ id, state }) =>
            this._networkPlayers.set(
                id,
                new NetworkPlayer(id, state, this._meshManager)
            )
        );
        console.log(
            `Intialized game with ${this._networkPlayers.keys.length} other players.`
        );
        this._serverConnection.onRecieveState((newState) =>
            this.handleUpdatedGameState(newState)
        );


        this._serverConnection.onDisconnect(() => this.handleDisconnect());
    }

    public sendClientState() {
        this._serverConnection.sendClientState(this._player.state);
    }

    public update() {
        this._player.update();
    }
    public onShoot(player: string, position: Vector3, direction: Vector3) {
        position.y = 2;
        const bullet = new Bullet(player, position, direction, this._meshManager.scene, this._serverConnection);
        bullet.shootBullet();

    }


    private handleUpdatedGameState(newState: GameState) {

        if (newState.players.length > this._gameState.players.length) {
            this.instantiateNewPlayers(
                newState.players,
                this._gameState.players
            );
        }
        if (newState.players.length < this._gameState.players.length) {
            this.removeDisconnectedPlayers(
                newState.players,
                this._gameState.players
            );
        }
        this._gameState = newState;
        this.updateNetworkPlayerPositions();
    }

    private updateNetworkPlayerPositions() {
        this._gameState.players.forEach(({ id, state }) => {
            this._networkPlayers.get(id)?.updateState(state);
        });
    }

    private instantiateNewPlayers(
        newPlayersState: { id: string; state: ClientState }[],
        oldPlayersState: { id: string; state: ClientState }[]
    ) {
        const oldPlayersIDs: string[] = oldPlayersState.map(({ id }) => id);
        newPlayersState.forEach(({ id, state }) => {
            if (!oldPlayersIDs.includes(id)) {
                this._networkPlayers.set(
                    id,
                    new NetworkPlayer(id, state, this._meshManager)
                );
            }
        });
    }

    private removeDisconnectedPlayers(
        newPlayersState: { id: string; state: ClientState }[],
        oldPlayersState: { id: string; state: ClientState }[]
    ) {
        const newPlayersIDs: string[] = newPlayersState.map(({ id }) => id);
        oldPlayersState.forEach(({ id }) => {
            if (!newPlayersIDs.includes(id)) {
                const networkPlayer = this._networkPlayers.get(id);
                networkPlayer?.disconnect();
                this._networkPlayers.delete(id);
            }
        });
    }

    private handleDisconnect() {
        this._gameState.players = [];
        this._networkPlayers = new Map();
    }
}
