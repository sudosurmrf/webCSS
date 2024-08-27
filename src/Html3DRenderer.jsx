import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

const Html3DRenderer = () => {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);

    useEffect(() => {
        // Set up the scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });

        renderer.setSize(window.innerWidth, window.innerHeight);
        mountRef.current.appendChild(renderer.domElement);

        // Set up OrbitControls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.maxPolarAngle = Math.PI / 2;

        // Adjusted camera position to have a better view of all elements
        camera.position.set(5, 5, 15);

        // Add lighting
        const light = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(light);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(0, 10, 10);
        scene.add(directionalLight);

        // Add a simple cube at the origin
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const testCube = new THREE.Mesh(geometry, material);
        testCube.position.set(0, 0, 0);
        scene.add(testCube);

        // Start rendering the scene
        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        console.log("Scene initialized and rendering started.");

        // Cleanup on unmount
        return () => {
            mountRef.current.removeChild(renderer.domElement);
        };
    }, []);

    useEffect(() => {
        if (sceneRef.current) {
            console.log("Scene is ready. Starting to process the DOM.");
            create3DFromDOM(document.body, null, 0, sceneRef.current);
        } else {
            console.log("Scene is not defined.");
        }
    }, [sceneRef.current]);

    return <div ref={mountRef}></div>;
};

const create3DFromDOM = (element, parentObj = null, depth = 0, scene) => {
    if (!element) {
        console.log("No element found to process.");
        return;
    }

    const tagName = element.tagName.toLowerCase();

    console.log(`Processing element: ${tagName}`);

    const inheritedProps = getInheritedProperties(element);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 + depth * 1000 });
    const cube = new THREE.Mesh(geometry, material);

    // Adjust positioning logic to make sure cubes are visible
    const xPosition = depth * 4; 
    const yPosition = 0; 
    const zPosition = 0;
    cube.position.set(xPosition, yPosition, zPosition);

    console.log(`Adding cube for element: ${tagName} at position (${xPosition}, ${yPosition}, ${zPosition})`);

    if (parentObj) {
        parentObj.add(cube);

        const lineGeometry = new THREE.BufferGeometry().setFromPoints([parentObj.position, cube.position]);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);

        const midPoint = new THREE.Vector3().addVectors(parentObj.position, cube.position).multiplyScalar(0.5);
        createTextLabel(scene, `color: ${inheritedProps.color}`, midPoint);
        createTextLabel(scene, `font-size: ${inheritedProps.fontSize}`, midPoint.add(new THREE.Vector3(0, -0.5, 0)));
    } else {
        scene.add(cube);
    }

    Array.from(element.children).forEach(child => {
        create3DFromDOM(child, cube, depth + 1, scene);
    });
};

const getInheritedProperties = (element) => {
    const style = window.getComputedStyle(element);
    return {
        color: style.color,
        fontSize: style.fontSize
    };
};

const createTextLabel = (scene, text, position) => {
    const loader = new FontLoader();
    loader.load('/helvetiker_bold.typeface.json', (font) => {
        const textGeometry = new TextGeometry(text, {
            font: font,
            size: 0.2,
            depth: 0.02,  // Replaced height with depth
            curveSegments: 12,
            bevelEnabled: false
        });
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.copy(position);
        scene.add(textMesh);
    });
};

export default Html3DRenderer;
