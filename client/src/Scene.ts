import { GroundBuilder } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { Scene, Engine, WebGPUEngine, ArcRotateCamera, StandardMaterial, Texture, Vector3, HemisphericLight, UniversalCamera, Color3, MeshBuilder, SceneLoader, PhysicsBody, PhysicsMotionType, CubeTexture, ShadowGenerator, PointLight, FreeCamera } from "@babylonjs/core";

import { AmmoJSPlugin } from "@babylonjs/core/Physics/Plugins/ammoJSPlugin";

import { gameMap } from "./data"

// If you don't need the standard material you will still need to import it since the scene requires it.
// required imports
import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/loaders/glTF";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";

// required imports
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import { ammoModule, ammoReadyPromise } from "./externals/ammo";

interface IScene {

    createScene: () => Scene;
    createEngine: () => Promise<Engine | WebGPUEngine>;
    init: () => void;

}

class CustomScene implements IScene {

    engine: Engine | WebGPUEngine;
    scene: Scene;
    canvas: HTMLCanvasElement;
    isLocked: boolean;
    private readonly GRAVITY = new Vector3(0, -9.81, 0);

    constructor() {
        console.log("creating custom scene");
        this.isLocked = false;
    }



    createScene() {
        const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
        if (!canvas) {
            throw new Error(`You should add canvas#app to html.`);
        }
        this.canvas = canvas;
        if (!this.engine) throw new Error("Engine is not defined");

        const scene = new Scene(this.engine)


        scene.collisionsEnabled = true;

        scene.enablePhysics(new Vector3(0, -9.81, 0), new AmmoJSPlugin(true, ammoModule));


        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new HemisphericLight(
            "light",
            new Vector3(0, 1, 0),
            scene
        );

        // Our built-in 'ground' shape.
        const ground = GroundBuilder.CreateGround(
            "ground",
            { width: 1000, height: 1000 },
            scene
        );


        ground.checkCollisions = true;
        ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9 }, scene);

        // Load a texture to be used as the ground material
        const groundMaterial = new StandardMaterial("ground material", scene);

        ground.material = groundMaterial;

        ground.position.y = -0.25;

        this.createLights(scene)
        this.createSky(scene)
        this.createCamera(scene)


        return scene;
    }

    createCamera(scene: Scene) {
        const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

        const camera = new FreeCamera("UniversalCamera", new Vector3(0, 3, -20), scene);
        camera.setTarget(Vector3.Zero());

        camera.applyGravity = true;
        camera.ellipsoid = new Vector3(1, 1.5, 1);
        camera.checkCollisions = true;
        camera.attachControl(canvas, true);


        scene.activeCamera = camera;


    }

    createLights(scene: Scene) {
        const light2 = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
        light2.intensity = 1;


        const directLight = new HemisphericLight("directLight", new Vector3(30, 50, 10), scene);
        directLight.intensity = 2;

        const light = new PointLight("sparklight", new Vector3(0, 0, 0), scene);
        light.diffuse = new Color3(0.08627450980392157, 0.10980392156862745, 0.15294117647058825);
        light.intensity = 35;
        light.radius = 1;

        const shadowGenerator = new ShadowGenerator(1024, light);
        shadowGenerator.darkness = 0.4;


    }

    createGround(scene: Scene) {

        // Our built-in 'ground' shape.
        const ground = GroundBuilder.CreateGround(
            "ground",
            { width: 10, height: 10 },
            scene
        );

        // Load a texture to be used as the ground material
        const groundMaterial = new StandardMaterial("ground material", scene);

        ground.material = groundMaterial;
    }

    createSky(scene: Scene) {


        // Skybox
        const skybox = MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, scene);
        const skyboxMaterial = new StandardMaterial("skyBox", scene);

        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new CubeTexture("https://playground.babylonjs.com/textures/skybox", scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
        skyboxMaterial.specularColor = new Color3(0, 0, 0);
        skybox.material = skyboxMaterial;

    }


    async createMap() {

        for (const cluster of gameMap) {


            const scene = this.scene;

            SceneLoader.ImportMesh("", "https://holonext.blob.core.windows.net/holonext-public-container/holonext-game/gltf/", `${cluster.name}.gltf`, this.scene, function (meshes) {
                const root = meshes[0];

                root.position = new Vector3(cluster.x * -60, 0, cluster.z * 60)

                // console.log(scene)

                root.physicsImpostor = new PhysicsImpostor(root, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9 }, scene);
                // dont let the player and bullet collide with the map  
                root.physicsImpostor.physicsBody.collisionFilterGroup = 2;
                root.physicsImpostor.physicsBody.collisionFilterMask = 2;

                root.physicsImpostor.physicsBody.setCollisionFlags(2);
                root.physicsImpostor.physicsBody.setActivationState(4);


            });


        }


    }

    async createEngine(): Promise<Engine | WebGPUEngine> {

        const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;


        const webGPUSupported = await WebGPUEngine.IsSupportedAsync;


        if (webGPUSupported) {
            const engine = new WebGPUEngine(canvas, {
                antialias: true,
                stencil: true,
                adaptToDeviceRatio: true,
                audioEngine: true,

            });

            await engine.initAsync();
            return engine;
        }

        const engine = new Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
        });
        return engine;
    }

    addEventListeners() {
        this.scene.onPointerDown = this.onPointerDown;

        // Attach events to the document
        document.addEventListener("pointerlockchange", this.onPointerLockChange, false);
        document.addEventListener("mspointerlockchange", this.onPointerLockChange, false);
        document.addEventListener("mozpointerlockchange", this.onPointerLockChange, false);
        document.addEventListener("webkitpointerlockchange", this.onPointerLockChange, false);

    }

    onPointerLockChange() {

        const controlEnabled = document.mozPointerLockElement || document?.webkitPointerLockElement || document?.msPointerLockElement || document.pointerLockElement || null;

        // If the user is already locked
        if (!controlEnabled) {
            //camera.detachControl(canvas);
            this.isLocked = false;
        } else {
            //camera.attachControl(canvas);
            this.isLocked = true;
        }
    }

    onPointerDown() {
        const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
        //true/false check if we're locked, faster than checking pointerlock on each single click.
        if (!this.isLocked) {
            canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
            if (canvas.requestPointerLock) {
                canvas.requestPointerLock();
            }
        }

    }


    private resize() {
        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }

    private render() {
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    getScene() {
        return this.scene;
    }

    async init() {
        this.engine = await this.createEngine();
        this.scene = this.createScene();
        this.createMap();

        this.render();
        this.resize();
    }
}

export default CustomScene;