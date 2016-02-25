"use strict";

function Environment(width, height, viewAngle, near, far, backgroundColor) {
    var aspect;
    var self = this;
    
    //scene size and aspect
    this.width = width | window.innerWidth;
    this.height = height | window.innerHeight;
    backgroundColor = backgroundColor | 0xeeeeee;
    
    //camera attributes
    viewAngle = viewAngle | 45;
    near = near | 1;
    far = far | 10000;
    aspect = this.width / this.height;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(viewAngle, aspect, near, far);
    this.controls = new THREE.TrackballControls(this.camera);
    this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    
    this.init = function() {
        //set camera
        this.camera.position.set(150, 0, 100);
        this.camera.lookAt(new THREE.Vector3(150, 0, 0));
        //set trackball controls
        this.initControls();
        //set renderer
        this.renderer.setSize(this.width, this.height);
        this.renderer.setClearColor(backgroundColor, 1.0);
    };
    
    this.initControls = function() {
        var controls = this.controls;
        controls.rotateSpeed = 1.0;
        controls.zoomSpeed = 0.2;
        controls.panSpeed = 0.8;
        controls.noZoom = false;
        controls.noPan = false;
        controls.staticMoving = true;
        controls.dynamicDampingFactor = 0.3;
    };

    this.addLight = function() {
        var pointLight = new THREE.PointLight(0xffffff);
        pointLight.position.set(0, 300, 200);
        this.scene.add(pointLight);
    };
    
    this.addAxes = function() {
        this.scene.add(buildAxes(1000));
    };
};

function start() {
    var env = new Environment();
    env.init();
    env.addAxes();
    env.addLight();
    
    //add canvas to HTML
    document.body.appendChild(env.renderer.domElement);

    //time
    var dt = 1;

    //floor
    var floor = buildFloor();
    env.scene.add(floor);
    
    //dice
    var dice = new Dice();
    dice.init();
    dice.throw();
    env.scene.add(dice.mesh);

    var id;
    var nbFrames = 0;
    
    //rendering one frame
    env.animate = function() {
        id=requestAnimationFrame(env.animate);
        env.controls.update();

        dice.applyForces();
        dice.move(dt);

        console.log(nbFrames);
        console.log(dice.velocity);

        //criteria to stop animation
        if (nbFrames > 500) {
            cancelAnimationFrame(id);
            console.log("stop");
            console.log(nbFrames);
        }
        nbFrames += 1;
        
        env.renderer.render(env.scene, env.camera);
    };

    //start loop
    env.animate();
}

function buildAxes(length) {
    var axes = new THREE.Object3D();
    axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(length, 0, 0),
                       0xFF0000, false)); // +X
    axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-length, 0, 0),
                       0xFF0000, true)); // -X
    axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, length, 0),
                        0x00FF00, false)); // +Y
    axes.add(buildAxis( new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -length, 0),
                         0x00FF00, true)); // -Y
    axes.add(buildAxis( new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, length),
                         0x0000FF, false)); // +Z
    axes.add(buildAxis( new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -length),
                         0x0000FF, true)); // -Z
    return axes;
}

function buildAxis(src, dst, colorHex, dashed) {
    var geom = new THREE.Geometry(), mat;
    if(dashed) {
        mat = new THREE.LineDashedMaterial({linewidth: 3, color: colorHex, dashSize: 3, gapSize: 3});
    }
    else {
        mat = new THREE.LineBasicMaterial({ linewidth: 3, color: colorHex });
    }
    geom.vertices.push(src.clone());
    geom.vertices.push(dst.clone());
    geom.computeLineDistances(); // otherwise dashed lines will appear as simple plain lines
    var axis = new THREE.Line(geom, mat, THREE.LineSegments);
    return axis;
}

function buildFloor(width, length, col, y) {
    width = width | 500;
    length = length | 500;
    col = col | 0xffffff;
    y = y | -0.1;
    var geo = new THREE.PlaneGeometry(width, length);
    var mat = new THREE.MeshBasicMaterial({color: col});
    var plane = new THREE.Mesh(geo, mat); //placed in plane xy, z=0 
    plane.rotation.x = -Math.PI/2;
    plane.position.set(0, y, 0);
    return plane; 
}

function SquareDice(size, col) {
    size = size | 10;
    col = col | 0xcccccc;
    var mat = new THREE.MeshBasicMaterial({color: col, wireframe: true});
    var cube = new THREE.Mesh(new THREE.CubeGeometry(size, size, size), mat);
    return cube;
}

function Dice(diceType, size, col, mass) {
    this.diceType = diceType | "square";
    this.mass = mass | 10;
    this.col = col | 0xcccccc;
    this.size = size | 10;
    
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.force =  new THREE.Vector3(0, 0, 0);
    this.rotationVector = new THREE.Vector3(0, 0 ,0);

    this.mesh = SquareDice(size, col);  //in the future, switch case for dice type
    this.position = this.mesh.position;
    this.rotation = this.mesh.rotation;

    this.stopSequence = false;

    //forces
    this.throwingForce = new THREE.Vector3(0, 0, 0);
    this.collisionForce = new THREE.Vector3(0, 0, 0);
    this.gravity = new THREE.Vector3(0, - this.mass * 0.0098, 0); //9.8 m/s^2

    this.init = function() {
        //initial position
        this.position.set(0, 50, 0);
    };
    
    this.throw = function() {
        //reset speed
        this.velocity = new THREE.Vector3(0, 0, 0);
        //apply random force in one direction (x)
        this.throwingForce.set(5, 0, 0);
        this.toThrow = true;
        //apply rotation perpendicularly (z)
        this.rotationVector.set(0, 0 , -0.1);
    };

    this.floorCollision = function() {
        //min coordinates of the cube, if rotation only around z axis
        var alpha = this.rotation.z % (Math.PI / 8);
        var angle = (Math.PI / 8) - alpha;
        var bottomY= this.position.y - Math.abs(Math.cos(angle) * this.size / Math.SQRT2);
        if (bottomY <= 0) {
            console.log("collision");
            console.log(angle);
            //re-position a bit above zero
            this.position.y += - bottomY;
            //bouncing effect : reverse y in velocity, scaled down
            //if angle close to 0, should not bounce much
            this.velocity.y = - this.velocity.y * angle;
            //reduce speed
            this.velocity.multiplyScalar(0.8);
            //rotation
            this.rotationVector.multiplyScalar(0.9);
            }
    };

    this.applyForces = function() {
        this.force.set(0, 0, 0);
        //compute forces
        this.floorCollision();
        //add all forces
        this.force.add(this.throwingForce);
        this.force.add(this.collisionForce);
        this.force.add(this.gravity);
        //reset external forces
        this.throwingForce.set(0, 0, 0);
        this.collisionForce.set(0, 0, 0);
    };

    this.move = function(dt) {
        if (dt < 0.1){
            dt = 0.1;
        }
        //new velocity
        this.velocity.addScaledVector(this.force, dt / this.mass);
        
        //new position
        this.mesh.position.addScaledVector(this.velocity, dt);

        //rotation
        this.mesh.rotation.x += this.rotationVector.x;
        this.mesh.rotation.y += this.rotationVector.y;
        this.mesh.rotation.z += this.rotationVector.z;
    };
}

