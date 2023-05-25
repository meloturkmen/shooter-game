import { Vector2, Vector3, Mesh, Scene, Color3, Quaternion, StandardMaterial, AbstractMesh, DeepImmutableObject, Vector4, RayHelper, UniversalCamera, ArcRotateCamera, TransformNode, ArcFollowCamera, FollowCamera, MeshBuilder } from "@babylonjs/core";
import { ClientState } from "./State";
import { MeshManager } from "./MeshManager";
import { KeyboardInputManager } from "./KeyboardInputManager";
import { PLAYER_INITIAL_STATE } from "./State";
import PlayerInput from "./InputController";
import Bullet from "./Bullet";
import { ServerConnection } from "./ServerConnection";
import { AdvancedDynamicTexture, Rectangle, Control, TextBlock } from "@babylonjs/gui";


const MOVEMENT_SPEED = 0.3;

export interface InputFrame {
    forwards: boolean;
    back: boolean;
    left: boolean;
    right: boolean;
    space: boolean;
}

export class Player {

    private _scene: Scene;
    private _mesh: Mesh;
    private _animations: any;
    private _playerMesh: AbstractMesh;
    private _state: ClientState = PLAYER_INITIAL_STATE;
    private _meshManager: MeshManager;
    private _advancedTexture: AdvancedDynamicTexture;
    private _isGameEnd: boolean = false;

    private _startDate: Date;
    private _endDate: Date;

    private _followBox: Mesh;

    private _velocity: Vector3 = new Vector3(0, 0, 0);
    private _direction: Quaternion = new Quaternion(0, 0, 0, 0);

    private _moveDirection: Vector3 = new Vector3(0, 0, 0);

    private _input: PlayerInput;

    private static readonly PLAYER_SPEED: number = 0.25;
    private _inputAmt: number;

    //Camera
    private _camRoot: TransformNode;
    private _yTilt: TransformNode;

    //player movement vars
    private _deltaTime: number = 0;
    private _h: number;
    private _v: number;


    constructor(
        scene: Scene,
        private meshManager: MeshManager,
        private _keyboardInputManager: KeyboardInputManager,
        private _serverConnection: ServerConnection,
        initialState: ClientState = PLAYER_INITIAL_STATE
    ) {
        this._scene = scene;
        this._meshManager = meshManager;

        this._input = new PlayerInput(scene);

        this._init();
        this.updateState(initialState);

    }





    private async _init() {


        this._mesh = await this._meshManager.createPlayerMesh("player");
        this._followBox = MeshBuilder.CreateDisc("follow-Box", {
            radius: 20
        }, this._scene);

        const material = new StandardMaterial("follow-material", this._scene);

        material.emissiveColor = Color3.Blue();
        material.diffuseColor = Color3.Blue();

        this._followBox.material = material;
        this._followBox.rotation.x = Math.PI / 2;

        this._followBox.position.set(0, 30, 0);

        setTimeout(async () => {
            const { root, animations } = await this._meshManager._createPlayer("player");

            this._animations = animations;
            this._playerMesh = root;


            root.setParent(this._mesh);
            this._startDate = new Date();


            this.detectCollisionWithTarget();
            this.createPLayerNameBox();
        }, 2000);
    }

    private createPLayerNameBox() {

        if (!this._advancedTexture) {
            this._advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        }

        const playerNameBox = MeshBuilder.CreatePlane("player-name-box", {
            width: 1,
            height: 1
        }, this._scene);

        const playerNameBoxMaterial = new StandardMaterial("player-name-box-material", this._scene);

        playerNameBoxMaterial.diffuseColor = Color3.Black();
        playerNameBoxMaterial.emissiveColor = Color3.Black();

        playerNameBox.material = playerNameBoxMaterial;

        playerNameBox.position.set(0, 0, 0);

        playerNameBox.setParent(this._mesh);

        playerNameBox.isVisible = false;


        this.addLabelToMesh(playerNameBox);


    }

    private addLabelToMesh(mesh: AbstractMesh): void {

        const label: Rectangle = new Rectangle("Me");
        label.background = "black";
        label.height = "30px";
        label.alpha = 0.5;
        label.width = "100px";
        label.cornerRadius = 20;
        label.thickness = 1;
        label.linkOffsetY = 30;
        label.top = "10%";
        label.zIndex = 5;
        label.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this._advancedTexture.addControl(label);

        const text1: TextBlock = new TextBlock();
        text1.text = "Me";
        text1.color = "white";
        label.addControl(text1);
    }


    private detectCollisionWithTarget() {
        const target = this._scene.getMeshByName("targetRegion") as Mesh;

        console.log("target", target);


        // check if player reach the target region 
        this._mesh.physicsImpostor.registerOnPhysicsCollide(target.physicsImpostor, (main, collided) => {

            console.log("collided", collided);

            if (this._isGameEnd) return;

            this._isGameEnd = true;
            this._serverConnection.emitGameOver(this.playerTime)

        });
    }

    private setupCameraControls() {

        // move rotate camera when player is clicked mouse and rotate it 


    }

    public gameOver() {
        console.log("game over");
    }


    public restart() {

        this._state = {
            position: [0, 0, 0],
            direction: this._state.direction,
            isMoving: false,
            health: 100,
        }
        this._mesh.position = new Vector3(0, 0, 0);

        this._startDate = new Date();
        this._isGameEnd = false;


    }





    private get playerTime(): number {

        this._endDate = new Date();
        const diff = this._endDate.getTime() - this._startDate.getTime();

        return diff;
    }



    public updateState(newState: ClientState) {

        this._state = newState;
        const [x, y, z] = newState.position;
        if (!this._mesh) return;


        this._mesh.position.x = x;
        this._mesh.position.y = y;
        this._mesh.position.z = z;

        this._followBox.position.x = x;
        this._followBox.position.z = z;
    }

    public get state() {
        return this._state;
    }

    public update() {
        if (!this._mesh) return;

        this.updateCamera();
        this._updateFromControls();
        this._updateAnimations();

    }

    private _updateAnimations() {

        if (!this._animations) return;

        if (this._input.inputMap["w"] || this._input.inputMap["a"] || this._input.inputMap["s"] || this._input.inputMap["d"]) {
            this._animations.idle.stop();
            this._animations.walk.play(true);
            this._state.isMoving = true;


        } else {
            this._animations.walk.stop();
            this._animations.idle.play(true);
            this._state.isMoving = false;

        }
    }


    private updateCamera() {
        const camera = this._scene.getCameraByName("Camera-1") as ArcRotateCamera;

        if (!camera) return;

        const [x, y, z] = this._state.position;

        camera.setTarget(new Vector3(x, y, z));

        camera.position = new Vector3(
            x || 0,
            y + 5 || 6,
            z - 15 || 5
        )


    }




    private _updateFromControls(): void {
        this._deltaTime = this._scene.getEngine().getDeltaTime() / 1000.0;

        this._moveDirection = Vector3.Zero();
        this._h = this._input.horizontal; //right, x
        this._v = this._input.vertical; //fwd, z



        const dashFactor = 1;


        //--MOVEMENTS BASED ON CAMERA (as it rotates)--
        // change directions reverse based on camera's rotation 


        const fwd = new Vector3(0, 0, 1);
        const right = new Vector3(1, 0, 0);

        //correct the direction based on camera's rotation



        const correctedVertical = fwd.scaleInPlace(this._v);
        const correctedHorizontal = right.scaleInPlace(this._h);

        //movement based off of camera's view
        const move = correctedHorizontal.addInPlace(correctedVertical);

        //clear y so that the character doesnt fly up, normalize for next step, taking into account whether we've DASHED or not
        this._moveDirection = new Vector3((move).normalize().x * dashFactor, 0, (move).normalize().z * dashFactor);

        //clamp the input value so that diagonal movement isn't twice as fast
        const inputMag = Math.abs(this._h) + Math.abs(this._v);

        if (inputMag < 0) {
            this._inputAmt = 0;
        } else if (inputMag > 1) {
            this._inputAmt = 1;
        } else {
            this._inputAmt = inputMag;
        }
        //final movement that takes into consideration the inputs
        this._moveDirection = this._moveDirection.scaleInPlace(this._inputAmt * Player.PLAYER_SPEED);

        //check if there is movement to determine if rotation is needed
        const input = new Vector3(this._input.horizontalAxis, 0, this._input.verticalAxis); //along which axis is the direction
        if (input.length() == 0) {//if there's no input detected, prevent rotation and keep player in same rotation
            return;
        }

        //rotation based on input & the camera angle
        const angle = Math.atan2(this._input.horizontalAxis, this._input.verticalAxis);


        const direction = Quaternion.FromEulerAngles(0, angle, 0);

        this._direction = direction;




        this._mesh.rotationQuaternion = Quaternion.Slerp(this._mesh.rotationQuaternion, direction, 0.2);
        // if player is moving start walk animations





        // move player in the direction they are facing 

        this._mesh.moveWithCollisions(this._moveDirection);

        this.updateState({

            position: [
                this._mesh.position.x,
                this._mesh.position.y,
                this._mesh.position.z,
            ],
            direction: [direction.x, direction.y, direction.z, direction.w],
        });
    }


    private createCanonTubeAndTarget() {

        const itarget = Mesh.CreateBox("itarget", 0.1, this._scene);
        itarget.position.y = 2;
        itarget.position.z = 5;
        itarget.parent = this._playerMesh;
        itarget.isVisible = false;

        const canon = Mesh.CreateCylinder("canon", 1, 0.2, 0.2, 6, 1, this._scene);
        canon.position.y = 2
        canon.rotation.set(Math.PI / 2, 0, 0);
        canon.parent = this._playerMesh;
        canon.isVisible = false;



    }

    public dead() {
        this._mesh.dispose();
        this._playerMesh.dispose();
    }




}
