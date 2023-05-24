
import Scene from "./Scene";
import { MeshManager } from "./MeshManager";
import { Player } from "./Player";
import { Game } from "./Game";
import { KeyboardInputManager } from "./KeyboardInputManager";
import { ServerConnection } from './ServerConnection';
import * as io from "socket.io-client"
import { Vector3 } from "@babylonjs/core";

declare global {
    interface Document {
        mozCancelFullScreen?: () => Promise<void>;
        msExitFullscreen?: () => Promise<void>;
        webkitExitFullscreen?: () => Promise<void>;
        mozFullScreenElement?: Element;
        msFullscreenElement?: Element;
        webkitFullscreenElement?: Element;
        mozPointerLockElement?: Element;
        msPointerLockElement?: Element;
        webkitPointerLockElement?: Element;
        pointerLockElement?: Element;
    }

    interface HTMLElement {
        msRequestFullscreen?: () => Promise<void>;
        mozRequestFullscreen?: () => Promise<void>;
        webkitRequestFullscreen?: () => Promise<void>;
    }
}




export const babylonInit = async (): Promise<void> => {
    const SCENE = new Scene();
    await SCENE.init();

    const scene = SCENE.getScene();


    const meshManager = new MeshManager(scene);
    const keyboardInputManager = new KeyboardInputManager(scene);
    const serverConnection = new ServerConnection(io("http://localhost:8080"));
    const player = new Player(scene, meshManager, keyboardInputManager, serverConnection);
    const game = new Game(serverConnection, meshManager, player);


    serverConnection.onShoot((id: string, position: number[], direction: number[]) => {
        const posVector = new Vector3(position[0], position[1], position[2]);
        const dirVector = new Vector3(direction[0], direction[1], direction[2]);


        game.onShoot(id, posVector, dirVector);


    });

    serverConnection.onDead(() => {
        alert("you are dead");
        player.dead();
    })


    serverConnection.onGameOver((playerID: string, playerTime: number) => {
        game.onGameOver(playerID, playerTime);
    })



    const update = () => {
        // Update game
        game.update();
    };

    setInterval(() => game.sendClientState());

    scene.onBeforeRenderObservable.add(() => update());
};

babylonInit().then(() => {
    // scene started rendering, everything is initialized
});
