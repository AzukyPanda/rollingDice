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
        this.camera.position.set(50, 60, 250);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
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
        controls.staticMoving = true;
        controls.dynamicDampingFactor = 0.3;
    };

    this.addLights = function() {
        var light = new THREE.AmbientLight(0xebeedc);
        //this.scene.add(light);

        var spotLight = new THREE.SpotLight(0xffffff, 1, 10000);
        spotLight.position.set(0,100,10);
        //this.scene.add(spotLight);

        var lightB = new THREE.HemisphereLight( 0xffffff, 0xc5c5c5, 1 );
        this.scene.add( lightB );
    };
    
    this.addAxes = function() {
        this.axes = buildAxes(1000);
        this.scene.add(this.axes);
    };

    this.cameraLookDir = function() {
        var vec = new THREE.Vector3(0, 0, -1);
        vec.applyQuaternion(this.camera.quaternion);
        return vec;
    };
};

function start() {
    var env = new Environment();
    env.init();
    env.addAxes();
    env.addLights();
    
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
    var stop = false;
    
    //rendering one frame
    env.animate = function() {
        id=requestAnimationFrame(env.animate);

        //update controls
        env.controls.update();

        //criteria to stop animation
        if (nbFrames < 1050 && !stop) {
            dice.move(dt);
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
    width = 500;
    length = 500;
    col = 0xd8d8d8;
    y = 0;
    var geo = new THREE.PlaneGeometry(width, length);
    var mat = new THREE.MeshLambertMaterial({color: col});
    var plane = new THREE.Mesh(geo, mat); //placed in plane xy, z=0 
    plane.rotation.x = -Math.PI/2;
    plane.position.set(0, y, 0);
    plane.receiveShadow = true;
    return plane; 
}

function SquareDice(size, col) {
    var mat = new THREE.MeshLambertMaterial({color: col});
    var cube = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mat);
    cube.castShadow = true;
    return cube;
}

function Dice(diceType, size, col, mass) {
    this.diceType = "square";
    this.mass = 10;
    this.col = 0xb2b2b2;
    this.size = 10;
    
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.force =  new THREE.Vector3(0, 0, 0);
    this.rotationVector = new THREE.Vector3(0, 0 ,0);

    this.mesh = SquareDice(this.size, this.col);  //in the future, switch case for dice type
    this.position = this.mesh.position;
    this.rotation = this.mesh.rotation;

    

    this.rollOnly = false;
    this.boundingBox = new THREE.Box3();
    this.counter = 0;

    //forces
    this.throwingForce = new THREE.Vector3(0, 0, 0);
    this.gravity = new THREE.Vector3(0, - this.mass * 0.0098, 0); //9.8 m/s^2

    this.init = function() {
        //initial position
        this.mesh.rotateY(0.785 * Math.PI / 4);
        this.position.set(-50, 100, -10);
    };
    
    this.throw = function() {
        //reset speed
        this.velocity = new THREE.Vector3(0, 0, 0);
        //apply random force in one direction (x)
        this.throwingForce.set(4, 0, 2);
        this.toThrow = true;
        //apply rotation perpendicularly (z)
        this.rotationVector.set(0.02, 0 , -0.04);
    };

    this.floorCollision = function() {
        this.boundingBox.setFromObject(this.mesh);

        if (this.boundingBox.min.y < 0) {
            //reposition at zero
            this.position.y += - this.boundingBox.min.y + 0.001;

            if (this.rollOnly) {

                if (this.counter % 50 === 0){
                    console.log("roll only");
                    console.log(this.position);
                    console.log(this.velocity);
                    console.log("min");
                    console.log(this.boundingBox.min);
                }
                
                this.counter += 1;
                //reduce speed
                this.velocity.multiplyScalar(0.999);
                
                //reduce rotation
                this.rotationVector.multiplyScalar(0.999);
                return;
            }
            
            //Bouncing: negative y speed above a threshold
            if (this.velocity.y < -0.5) {
                //this.collisionForce.addScaledVector(this.gravity, -1);
                //reverse y in velocity
                this.velocity.y = - this.velocity.y;
                //reduce speed
                this.velocity.multiplyScalar(0.7);
                //reduce rotation
                this.rotationVector.multiplyScalar(0.8);
            }
            //stop sequence: rolls then stops, no y speed anymore
            else {
                this.rollOnly = true;
                this.gravity.set(0, 0, 0);
                return;
                this.velocity.set(0, 0, 0);
                this.rotationVector.set(0, 0, 0);
            }
        }
    };

    this.applyForces = function() {
        this.force.set(0, 0, 0);
        //add all forces
        this.force.add(this.throwingForce);
        this.force.add(this.gravity);
        //reset external forces
        this.throwingForce.set(0, 0, 0);
    };

    this.move = function(dt) {
        if (dt < 0.1){
            dt = 0.1;
        }

        //Bouncing sequence
        if (true) {
            this.applyForces();
        
            //new velocity
            this.velocity.addScaledVector(this.force, dt / this.mass);
        
            //new position
            this.mesh.position.addScaledVector(this.velocity, dt);
            //test for collision at new position
            this.floorCollision();

            //rotation
            this.mesh.rotateX(this.rotationVector.x); 
            this.mesh.rotateY(this.rotationVector.y);
            this.mesh.rotateZ(this.rotationVector.z);
        }
    };
}

