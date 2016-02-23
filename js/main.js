"use strict";

var scene, camera, renderer;
var dice, speed, angularSpeed;

function initThree() {
    //scene size
    var WIDTH = 600,
    HEIGHT = 500;

    //camera attributes
    var VIEW_ANGLE = 45,
    ASPECT = WIDTH / HEIGHT,
    NEAR = 0.1,
    FAR = 10000;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    camera.position.z = 400;
    camera.position.y = 160;
    scene.add(camera);

    renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setSize(WIDTH, HEIGHT);
    renderer.setClearColor(0xffffff, 0);

    //light
    var pointLight = new THREE.PointLight(0xffffff);
    pointLight.position.set(0, 300, 200);
    scene.add(pointLight);

    //add canvas to HTML
    document.body.appendChild(renderer.domElement);
}

function SquareDice(size,col){
    var cGeo = new THREE.CubeGeometry(size, size, size);
    var cMaterial = new THREE.MeshLambertMaterial({color: col});
    var cube = new THREE.Mesh(cGeo, cMaterial);
    return cube;
}


function start(){
    initThree();

    dice = SquareDice(100, 0x1ec876);

    dice.rotation.y = Math.PI * 45 / 180;
    
    scene.add(dice);

    camera.lookAt(dice.position);

    throwDice();

    render();
}

function throwDice(){
    speed = new THREE.Vector3(0.3, -0.2 ,0);
    angularSpeed= new THREE.Euler(0.002,0.004,0.005);
}

function render() {
    requestAnimationFrame(render);
    
    dice.position.add(speed);
    dice.rotation.x += angularSpeed.x;
    dice.rotation.y += angularSpeed.y;
    dice.rotation.y += angularSpeed.z;
    
    renderer.render(scene, camera);
}

