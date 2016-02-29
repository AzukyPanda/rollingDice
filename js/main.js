function Environment(width, height, viewAngle, near, far, backgroundColor) {
    var aspect;
    var self = this;
    
    //scene size and aspect (2D)
    this.width = width | window.innerWidth;
    this.height = height | window.innerHeight;
    backgroundColor = backgroundColor | 0xeeeeee;

    //3D environment size
    this.xMax = 200;
    this.yMax = 100;
    this.zMax = 200;

    //camera attributes
    viewAngle = viewAngle | 45;
    near = near | 1;
    far = far | 1000;
    aspect = this.width / this.height;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(viewAngle, aspect, near, far);
    this.controls = new THREE.TrackballControls(this.camera);
    this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    
    this.init = function() {
        //scene offset
        //this.scene.position.set(this.Xmax * -0.6, 0, this.Zmax * -0.6);
        //set camera
        this.camera.position.set(this.xMax*0.2, this.yMax*1.5, this.zMax*1.2);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        //set trackball controls
        this.initControls();
        //set renderer
        this.renderer.setSize(this.width, this.height);
        this.renderer.setClearColor(backgroundColor, 1.0);
        this.renderer.shadowMap.enabled = true;
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
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

        var hemi = new THREE.HemisphereLight(0xffffff, 0x080820, 0.5);
        this.scene.add(hemi);
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
    
    var objects = {};
    
    //obstacles
    var floor = buildFloor(env.xMax, env.zMax, 0xd8d8d8, 0);
    env.scene.add(floor);

    var borders = {
        yMin: 0,
        yMax: env.yMax,
        xMin: 0  - env.scene.position.x,
        xMax: env.xMax  - env.scene.position.x,
        zMin: 0  - env.scene.position.z,
        zMax: env.zMax - env.scene.position.z
    };

    console.log(borders);
    
    //dice
    var dice = new Dice(borders);
    dice.init(0, env.yMax, 0);
    dice.throw(0, 0, 20);
    env.scene.add(dice.mesh);

    var id;
    var nbFrames = 0;
    
    //rendering one frame
    env.animate = function() {
        id=requestAnimationFrame(env.animate);

        //update controls
        env.controls.update();

        //criteria to stop animation
        if (nbFrames < 1000 && !dice.stopped) {
            dice.move(objects);
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
    var geo = new THREE.PlaneGeometry(width, length);
    var mat = new THREE.MeshLambertMaterial({color: col});
    var plane = new THREE.Mesh(geo, mat); //placed in plane xy, z=0 
    plane.rotation.x = -Math.PI/2;
    plane.position.set( width/2, y, length/2);
    plane.receiveShadow = true;
    plane.material.side = THREE.DoubleSide;
    return plane; 
}

function buildSquareDice(size, col) {
    var mat = new THREE.MeshLambertMaterial({color: col});
    var cube = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mat);
    cube.castShadow = true;
    return cube;
}

function Dice(borders, diceType, size, col, mass) {
    this.diceType = "square";
    this.mass = 10;
    this.col = 0xb2b2b2;
    this.size = 10;
    this.dt = 1;
    this.borders = borders;

    var rotationSpeed = 0.06;
    var halfSize = this.size / 2;
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.force =  new THREE.Vector3(0, 0, 0);
    this.rotationVector = new THREE.Vector3(0, 0 ,0);
    this.throwingForce = new THREE.Vector3(0, 0, 0);
    this.gravity = new THREE.Vector3(0, - this.mass * 0.0098, 0); //9.8 m/s^2
    
    this.mesh = buildSquareDice(this.size, this.col);  //in the future, switch case for dice type
    this.position = this.mesh.position;
    this.rotation = this.mesh.rotation;

    this.rollOnly = false;
    this.boundingBox = new THREE.Box3();
    this.stopped = false;

    this.init = function(x, y , z) {
        //TODO: add randomness
        //initial rotation
        //this.mesh.rotateY(0.785 * Math.PI / 4);
        //itinial position
        var h = this.size;
        this.position.set(x + h, y - h, z + h);
        //compute bounding box
        this.boundingBox.setFromObject(this.mesh);
    };
    
    this.throw = function(x, y , z) {
        //reset speed
        this.velocity = new THREE.Vector3(0, 0, 0);
        //apply random force in one direction (x)
        this.throwingForce.set(x, y, z);
        this.mesh.lookAt(this.position.clone().add(this.throwingForce));
        //rotation in the direction of the force
        this.rotationVector.set(rotationSpeed, 0, 0);
    };

    this.floorCollision = function() {
        if (this.boundingBox.min.y < this.borders.yMin) {
            //reposition at zero
            this.position.y += this.borders.yMin - this.boundingBox.min.y;
            
            //dice is rolling on the floor
            if (this.rollOnly) {
                //reduce speed
                this.velocity.multiplyScalar(0.995);
                //reduce rotation
                this.rotationVector.multiplyScalar(0.995);

                //dice stops
                if (Math.abs(this.rotationVector.x) < 0.025 && this.rotation.x % Math.PI/4 < 0.01
                    && this.rotation.z % Math.PI/4 <0.01) {
                    console.log("stop");
                    console.log(this.rotation);
                    console.log(this.rotationVector);
                    
                    this.rotationVector.set(0, 0, 0);
                    this.rotation.set(0, this.rotation.y, 0);
                    this.position.addScaledVector(this.velocity, this.dt);
                    this.position.y = this.borders.yMin + halfSize;
                    
                    this.velocity.set(0, 0, 0);
                    this.stopped = true;
                }
            }
            //or dice is bouncing: negative y speed above a threshold
            else if (this.velocity.y < -0.7) {
                //this.collisionForce.addScaledVector(this.gravity, -1);
                //reverse y in velocity
                this.velocity.y = - this.velocity.y;
                //reduce speed
                this.velocity.multiplyScalar(0.7);
                //reduce rotation
                this.rotationVector.multiplyScalar(0.8);
            }
            //or dice starts rolling on floor
            else {
                this.rollOnly = true;
                this.gravity.set(0, 0, 0);
                return;
            }
        }
    };

    this.borderCollision = function() {
        var collide = false;

        //collision in x
        if (this.boundingBox.min.x < this.borders.xMin)
        {
            this.position.x += this.borders.xMin - this.boundingBox.min.x;
            this.velocity.x = - this.velocity.x;
            collide = true;
        }
        else if (this.boundingBox.max.x > this.borders.xMax) {
            console.log("collide x");
            console.log(this.boundingBox.min.x);
            console.log(this.borders.xMin);
            console.log(this.position);

            this.position.x += this.borders.xMax - this.boundingBox.max.x;
            this.velocity.x = - this.velocity.x;
            collide = true;
        }
        //collision in z
        if (this.boundingBox.min.z < this.borders.zMin){
            this.position.z += this.borders.zMin - this.boundingBox.min.z;
            this.velocity.z = - this.velocity.z;
            collide = true;
        }
        else if (this.boundingBox.max.z > this.borders.zMax) {
            console.log("collide z");
            console.log(this.boundingBox.min);

            this.position.z += this.borders.zMax - this.boundingBox.max.z;
            this.velocity.z = - this.velocity.z;
            collide = true;
        }
        if (collide) {
            //reduce speed
            this.velocity.multiplyScalar(0.7);
            //reduce rotation
            this.rotationVector.multiplyScalar(0.8);
            //reverse rotation
            this.rotationVector.multiplyScalar(-1);
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

    this.move = function(objects) {
        this.applyForces();
        
        //new velocity
        this.velocity.addScaledVector(this.force, this.dt / this.mass);
        
        //new position
        this.mesh.position.addScaledVector(this.velocity, this.dt);

        //recompute bounding box
        this.boundingBox.setFromObject(this.mesh);
        
        //test for collision at new position
        this.floorCollision(); 
        this.borderCollision();
        for (var key in objects) {
            var obj = objects[key];
         }

        //rotation
        this.mesh.rotateX(this.rotationVector.x); 
        this.mesh.rotateY(this.rotationVector.y);
        this.mesh.rotateZ(this.rotationVector.z);

        //recompute bounding box (after collision and rotation)
        this.boundingBox.setFromObject(this.mesh);
    };
}

