import { AbstractMesh, Mesh, Quaternion } from "@babylonjs/core";
import { MeshManager } from "./MeshManager";
import { ClientState, PLAYER_INITIAL_STATE } from "./State";
import { Vector3 } from "babylonjs";

export class NetworkPlayer {
    private _mesh: Mesh;
    private _meshManager: MeshManager;
    private _animations: any;
    private _playerMesh: AbstractMesh;
    private _state: ClientState = PLAYER_INITIAL_STATE;


    constructor(
        public readonly id: string,
        initialState: ClientState,
        meshManager: MeshManager
    ) {

        this._meshManager = meshManager;


        this._init(id);
        this.updateState(initialState);
    }

    private async _init(id: string) {
        this._mesh = await this._meshManager.createPlayerMesh(id);

        setTimeout(async () => {
            const { root, animations } = await this._meshManager._createPlayer(id);

            this._animations = animations;
            this._playerMesh = root;

            this._playerMesh.setParent(this._mesh);

        }, 2000);


    }



    public updateState(newState: ClientState) {

        if (!this._mesh) return;
        this._state = newState;
        const [x, y, z] = newState.position;




        this._mesh.position.x = x;
        this._mesh.position.y = y;
        this._mesh.position.z = z;


        const [qx, qy, qz, qw] = newState.direction;

        // rotate the player according to the direction quaternion received from the server  with slerp (spherical linear interpolation) to avoid gimbal lock 

        const newRotation = new Quaternion(qx, qy, qz, qw);


        // if direction show left turn direction to the left 

        this._mesh.rotationQuaternion = Quaternion.SlerpToRef(this._mesh.rotationQuaternion, newRotation, 0.2, this._mesh.rotationQuaternion);

        this._updateAnimations();

    }

    private _updateAnimations() {

        if (!this._animations) return;

        if (this._state.isMoving) {
            this._animations.idle.stop();
            this._animations.walk.play(true);
        } else {
            this._animations.walk.stop();
            this._animations.idle.play(true);
        }
    }

    public disconnect() {
        this._mesh.dispose();
        this._playerMesh.dispose();
    }
}
