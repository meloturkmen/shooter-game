import { Socket } from 'socket.io-client';
import { Color3, StandardMaterial, Tags } from '@babylonjs/core';
import { Scene, Vector3, Mesh, PhysicsImpostor } from '@babylonjs/core';
import { uid } from 'uid';
import { ServerConnection } from './ServerConnection';


class Bullet {

    private _owner: string
    private _name: string;
    private _position: Vector3
    private _direction: Vector3
    private _scene: Scene;
    private _bullet: Mesh
    private _severConnection: ServerConnection

    private readonly POWER = 150;
    private readonly BULLET_SPEED = 0.5

    constructor(owner: string, position: Vector3, direction: Vector3, scene: Scene, serverConnection: ServerConnection) {
        this._owner = owner;
        this._position = position
        this._direction = direction
        this._scene = scene;
        this._severConnection = serverConnection;
        this._name = `bullet-${uid()}`;

        this._create()
    }

    public get name() {
        return this._name
    }

    public set name(name: string) {
        this._name = name
    }

    public get owner() {
        return this._owner
    }

    public set owner(owner: string) {
        this._owner = owner
    }


    public get bullet() {
        return this._bullet
    }

    public set bullet(bullet: Mesh) {
        this._bullet = bullet
    }


    public get position() {

        return this._position
    }

    public set position(position: Vector3) {
        this._position = position
    }

    public get direction() {

        return this._direction
    }

    public set direction(direction: Vector3) {
        this._direction = direction
    }

    private _create() {

        console.log("creating bullet");

        const bulletName = `bullet-${uid()}`

        const bullet = Mesh.CreateSphere(bulletName, 3, 1, this._scene);
        bullet.scaling.set(0.25, 0.25, 0.25);
        bullet.position = this._position;
        bullet.physicsImpostor = new PhysicsImpostor(bullet, PhysicsImpostor.SphereImpostor, { mass: 100, restitution: 0.9 }, this._scene);
        bullet.checkCollisions = true


        const ground = this._scene.getMeshByName("ground") as Mesh;



        bullet.physicsImpostor.registerOnPhysicsCollide(ground.physicsImpostor, (main, collided) => {

            console.log('collision detected with gorund')
            bullet.dispose();
        });


        const players = this._scene.meshes.filter(mesh => mesh.id.includes("player-"));

        console.log(players)

        players.forEach(player => {
            bullet.physicsImpostor.registerOnPhysicsCollide(player.physicsImpostor, (main, collided) => {

                console.log('collision detected with player')
                console.log(player.id)

                const playerID = player.id.split("-")[1];


                this._severConnection.emitHit( playerID,bulletName )

                bullet.dispose();
            });
        })




        const material = new StandardMaterial("material", this._scene);

        material.diffuseColor = new Color3(1, 1, 0.5);

        bullet.material = material;


        this._bullet = bullet;

        Tags.AddTagsTo(bullet, "bullet");

    }

    public shootBullet() {

        console.log("shooting bullet");


        this.translate(this._bullet, this._direction)
    }

    public remove() {
        this._bullet.dispose()
    }



    translate(mesh: any, direction: Vector3) {
        mesh.physicsImpostor.setLinearVelocity(
            mesh.physicsImpostor.getLinearVelocity().add(direction.scale(this.POWER)
            )
        );
    }




}

export default Bullet;