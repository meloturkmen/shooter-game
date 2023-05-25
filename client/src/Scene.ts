import { GroundBuilder } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { Scene, Engine, WebGPUEngine, ArcRotateCamera, StandardMaterial, Texture, Vector3, HemisphericLight, UniversalCamera, Color3, MeshBuilder, SceneLoader, PhysicsBody, PhysicsMotionType, CubeTexture, ShadowGenerator, PointLight, Animation, FreeCamera, Tools, FollowCamera, ShaderMaterial, GlowLayer, Mesh, ArcFollowCamera, Viewport } from "@babylonjs/core";

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

const RANDOM_TARGET_POINT = [
    { x: 140, z: 160 },
    { x: 140, z: -40 },
    { x: 20, z: -160 },
    { x: -100, z: 20 },
    { x: -40, z: 160 },
]

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
        this.createTargetRegion(scene);


        return scene;
    }

    createCamera(scene: Scene) {


        const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;


        const camera = new ArcRotateCamera("Camera-1", 0,
            0,
            3, new Vector3(0, 10, -20), scene);



        camera.setTarget(Vector3.Zero())

        const camera2 = new ArcRotateCamera("Camera-2", -Math.PI / 2, 0.001, 500, Vector3.Zero(), scene);

        camera2.position.x = 0;
        camera2.position.y = 0;


        scene.activeCameras = [];

        scene.activeCameras.push(camera);
        scene.activeCameras.push(camera2);

        camera.attachControl(canvas, true);

        camera.viewport = new Viewport(0.0, 0, 1.0, 1.0);
        camera2.viewport = new Viewport(0.8, 0.8, 0.2, 0.2);

        camera2.layerMask = 2;
        camera.layerMask = 1;


        scene.activeCameras.push(camera);
        scene.activeCameras.push(camera2);

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


                // create ellipsoid for collisions with player and bullets 

                root.ellipsoid = new Vector3(0.5, 0.9, 0.5);
                root.ellipsoidOffset = new Vector3(0, root.ellipsoid.y, 0);



            });


        }


    }

    private createStartPoint(scene: Scene) {

        const modelUrl = "https://holonext.blob.core.windows.net/holonext-public-container/holonext-game/map_pointer.glb";


        SceneLoader.ImportMesh("", "https://holonext.blob.core.windows.net/holonext-public-container/holonext-game/", `map_pointer.glb`, this.scene, function (meshes) {

            const root = meshes[0];
            root.name = "startPoint";
            root.position = new Vector3(0, 5, 0)
            root.scaling = new Vector3(0.5, 0.5, 0.5)


            const startGround = MeshBuilder.CreateDisc("startGround", { radius: 4 }, scene);


            startGround.rotation.x = Math.PI / 2;
            startGround.position = new Vector3(0, 0.15, 0);


            const meterial = new StandardMaterial("material", scene);

            meterial.emissiveColor = Color3.Teal();
            meterial.diffuseColor = Color3.Green();

            startGround.material = meterial;


            // animate the start point in y axis with keyframes 


            const animation = new Animation("myAnimation", "position.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);

            const keys = []


            keys.push({
                frame: 0,
                value: 5
            })

            keys.push({
                frame: 25,
                value: 5.5
            })

            keys.push({
                frame: 50,
                value: 6
            })

            keys.push({
                frame: 75,
                value: 5.5

            })

            keys.push({
                frame: 100,
                value: 5
            })

            animation.setKeys(keys);

            root.animations = [];

            root.animations.push(animation);


            scene.beginAnimation(root, 0, 100, true);



        });

    }

    private createTargetRegion(scene: Scene) {


        const region = MeshBuilder.CreateDisc("targetRegion", { radius: 8 }, scene);

        region.rotation.x = Math.PI / 2;

        region.position = new Vector3(0, 0, 0);
        region.physicsImpostor = new PhysicsImpostor(region, PhysicsImpostor.SphereImpostor, { mass: 0, restitution: 0.9 }, scene);

        region.ellipsoid = new Vector3(0.5, 0.9, 0.5);
        region.ellipsoidOffset = new Vector3(0, region.ellipsoid.y, 0);

        region.checkCollisions = true;

        const material = new StandardMaterial("material", scene);


        material.emissiveColor = Color3.Teal();
        material.diffuseColor = Color3.Teal();

        region.material = material;


        const region2 = MeshBuilder.CreateDisc("targetRegion-main", { radius: 4 }, scene);
        region2.rotation.x = Math.PI / 2;
        region2.position = new Vector3(0, 0, 0);

        const material2 = new StandardMaterial("material", scene);
        material2.emissiveColor = Color3.Red();
        material2.diffuseColor = Color3.Red();

        region2.material = material2;


        const gl = new GlowLayer("glow", scene, {
            mainTextureSamples: 4
        });


        const point = RANDOM_TARGET_POINT[0];

        console.log({ point })


        const position1 = new Vector3(point.x, 0, point.z);
        const position2 = new Vector3(point.x, 0, point.z);

        region2.position = position1;
        region.position = position2;


        region.position.y = 0.25;
        region2.position.y = 0.35;



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