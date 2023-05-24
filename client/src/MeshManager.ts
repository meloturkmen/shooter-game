import {
    Color3,
    Mesh,
    MeshBuilder,
    Scene,
    SceneLoader,
    StandardMaterial,
    AbstractMesh,
    Nullable,
    AnimationGroup,
    Skeleton,
    Vector3,
    Quaternion,
    IParticleSystem,
    PhysicsImpostor,
    TransformNode,
    Matrix,
    CreateBox
} from "@babylonjs/core";

// If you don't need the standard material you will still need to import it since the scene requires it.
// required imports
import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/loaders/glTF";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";

import playerModel from "../assets/models/soldier/player.glb";

export class MeshManager {

    private _scene: Scene;

    constructor(scene: Scene) {
        this._scene = scene;
    }

    public get scene() {
        return this._scene;
    }

    public async createPlayerMesh(id: string): Promise<Mesh> {

        console.log("--- create player mesh ----", id);
        const playerBox = MeshBuilder.CreateBox(`player-${id}`, { width: 2, depth: 1, height: 2.5 }, this._scene);

        playerBox.id = id === 'player' ? 'player' : `player-${id}`;
        playerBox.name = id;
        playerBox.isVisible = false;
        playerBox.isPickable = true;
        playerBox.checkCollisions = true;


        //move origin of box collider to the bottom of the mesh (to match player mesh)
        playerBox.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0))
        //for collisions

        playerBox.rotationQuaternion = new Quaternion(0, 1, 0, 0); // rotate the player mesh 180 since we want to see the back of the player

        playerBox.physicsImpostor = new PhysicsImpostor(playerBox, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9 }, this._scene)

        playerBox.checkCollisions = true;


        playerBox.ellipsoid = new Vector3(0.5, 0.9, 0.5);
        playerBox.ellipsoidOffset = new Vector3(0, playerBox.ellipsoid.y, 0);

       


        return Promise.resolve(playerBox);
    }

    public async _createPlayer(id: string): Promise<{ root: AbstractMesh, animations: any }> {

        const result = await SceneLoader.ImportMeshAsync("", "", playerModel, this._scene)

        this._scene.activeCamera = this._scene.getCameraByName("UniversalCamera")

        // stop animations
        result.animationGroups.forEach((animationGroup) => {
            animationGroup.stop();
        });

        const root = result.meshes[0];




        root.isVisible = false;

        const animations = {
            idle: result.animationGroups[1],
            walk: result.animationGroups[4],
        }

        return { root, animations };
    }




}
