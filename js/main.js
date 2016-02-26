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
        this.camera.position.set(20, 50, 150);
        this.camera.lookAt(new THREE.Vector3(500, 0, 0));
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

    var cube = SquareDice(1);
    env.scene.add(cube);

    var id;
    var nbFrames = 0;
    
    //rendering one frame
    env.animate = function() {
        id=requestAnimationFrame(env.animate);

        //update controls
        env.controls.update();

        //criteria to stop animation
        if (nbFrames < 500) {
            nbFrames += 1;
            dice.applyForces();
            dice.move(dt);
            //console.log(dice.velocity);
        }
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
    width = 500;
    length = 500;
    col = 0xffffff;
    y = 0;
    var geo = new THREE.PlaneGeometry(width, length);
    var mat = new THREE.MeshBasicMaterial({color: col});
    var plane = new THREE.Mesh(geo, mat); //placed in plane xy, z=0 
    plane.rotation.x = -Math.PI/2;
    plane.position.set(0, y, 0);
    return plane; 
}

function SquareDice(size, col) {
    col = 0xcccccc;
    var mat = new THREE.MeshBasicMaterial({color: col, wireframe: true});
    var cube = new THREE.Mesh(new THREE.CubeGeometry(size, size, size), mat);
    return cube;
}

function Dice(diceType, size, col, mass) {
    this.diceType = "square";
    this.mass = 10;
    this.col = 0xcccccc;
    this.size = 20;

    this.halfSize = this.size / 2;
    
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.force =  new THREE.Vector3(0, 0, 0);
    this.rotationVector = new THREE.Vector3(0, 0 ,0);

    this.mesh = SquareDice(this.size, this.col);  //in the future, switch case for dice type
    this.position = this.mesh.position;
    this.rotation = this.mesh.rotation;

    this.rotation.z = 0.1;

    this.stopSequence = false;

    //forces
    this.throwingForce = new THREE.Vector3(0, 0, 0);
    this.collisionForce = new THREE.Vector3(0, 0, 0);
    this.gravity = new THREE.Vector3(0, - this.mass * 0.0098, 0); //9.8 m/s^2

    this.init = function() {
        //initial position
        this.position.set(0, 50, 0);
    };

    this.getLowerPoint = function() {
        //min coordinates of the cube, if rotation only around z axis
        var bottomY=0;
        return bottomY;
    };
    
    this.throw = function() {
        //reset speed
        this.velocity = new THREE.Vector3(0, 0, 0);
        //apply random force in one direction (x)
        this.throwingForce.set(0, 0, 0);
        this.toThrow = true;
        //apply rotation perpendicularly (z)
        this.rotationVector.set(0, 0 , 0);
    };

    this.floorCollision = function() {
        var alpha = Math.abs(this.rotation.z);
        var angle = (Math.PI / 4) - alpha;
        var deltaY = Math.cos(angle) * this.size / Math.SQRT2;
        var bottomY = this.position.y - Math.abs(deltaY);

        if (bottomY < 0) {
            console.log("collision");
            console.log("position");
            console.log(this.position);
            console.log("bottomY");
            console.log(bottomY);
            console.log("alpha");
            console.log(alpha);
            console.log("angle");
            console.log(angle);
            console.log("delta");
            console.log(deltaY);

            //reposition at zero
            this.position.y += - bottomY;
            console.log("new pos");
            console.log(this.position);
            
            //bouncing effect : reverse y in velocity
            this.velocity.y = - this.velocity.y;
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

