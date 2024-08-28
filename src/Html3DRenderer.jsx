import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

const Html3DRenderer = () => {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);

    useEffect(() => {
        // Initialize the scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        camera.position.set(0, 0, 10); // Adjust initial camera position

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);

        // Attach renderer to DOM
        if (mountRef.current) {
            mountRef.current.appendChild(renderer.domElement);
        }

        // Initialize OrbitControls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; // Enable smooth transitions
        controls.dampingFactor = 0.25; // Damping factor
        controls.enableZoom = true; // Enable zooming with scroll
        controls.enablePan = true; // Enable panning with right-click
        controls.enableRotate = true; // Enable rotation with left-click

        // Render the scene
        const animate = () => {
            requestAnimationFrame(animate);
            controls.update(); // Required if damping is enabled
            renderer.render(scene, camera);
        };
        animate();

        // Cleanup function with a safety check
        return () => {
            if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
                mountRef.current.removeChild(renderer.domElement);
            }
            controls.dispose(); // Dispose of controls on cleanup
        };
    }, []);

    useEffect(() => {
        if (sceneRef.current) {
            create3DFromDOM(document.body, null, 0, sceneRef.current);
        }
    }, [sceneRef.current]);

    return <div ref={mountRef}></div>;
};

 

let cubeCount = 0;

// Main function to create 3D representation of the DOM
const create3DFromDOM = (element, parentObj = null, depth = 0, scene, angle = 0, distance = 5) => {
    if (!element || element.nodeType !== 1) return; // Only process element nodes

    // Generate a unique key for the element
    if (!element.dataset.key) {
        element.dataset.key = `${element.tagName.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    const uniqueKey = element.dataset.key;

    const tagName = element.tagName.toLowerCase();
    cubeCount++;
    console.log(`Processing element: ${tagName} with key: ${uniqueKey} | Cube Count: ${cubeCount}`);

    // Adjust size and color logic
    const size = parentObj ? 1 : 2; // Larger size for the main parent
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshBasicMaterial({
        color: parentObj ? 0x00ff00 + depth * 1000 : 0x00ff00 // Green for the main parent, varying colors for others
    });

    const cube = new THREE.Mesh(geometry, material);

    // Calculate position using angle and distance from parent
    let xPosition = parentObj ? parentObj.position.x + distance * Math.cos(angle) : 0;
    let yPosition = parentObj ? parentObj.position.y : 0;
    let zPosition = parentObj ? parentObj.position.z + distance * Math.sin(angle) : 0;

    cube.position.set(xPosition, yPosition, zPosition);

    if (parentObj) {
        parentObj.add(cube);
        const parentWorldPosition = new THREE.Vector3();
        parentObj.getWorldPosition(parentWorldPosition);
        const childWorldPosition = new THREE.Vector3();
        cube.getWorldPosition(childWorldPosition);
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([parentWorldPosition, childWorldPosition]);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);

        // Retrieve and filter relevant computed styles
        const relevantStyles = getRelevantComputedStyles(element);
        createDropdownMenu(scene, relevantStyles, childWorldPosition);
    } else {
        scene.add(cube);
    }

    // Increment angle for each child to branch out in different directions
    const childElements = Array.from(element.children);
    const childCount = childElements.length;
    let currentAngle = 0;

    childElements.forEach((child, index) => {
        const angleIncrement = (2 * Math.PI) / childCount; // Evenly distribute children around the parent
        create3DFromDOM(child, cube, depth + 1, scene, currentAngle, distance);
        currentAngle += angleIncrement;
    });
};

// Function to get only the relevant computed styles for display
const getRelevantComputedStyles = (element) => {
    const styles = window.getComputedStyle(element);
    const relevantProperties = [
        'display', 'height', 'width', 'font-size', 'font-weight',
        'margin-block-end', 'margin-block-start', 'margin-inline-end',
        'margin-inline-start', 'unicode-bidi'
    ];

    let relevantStyles = {};
    relevantProperties.forEach(property => {
        const value = styles.getPropertyValue(property);
        if (value) {
            relevantStyles[property] = value;
        }
    });
    return relevantStyles;
};

const createDropdownMenu = (scene, styles, position) => {
    const dropdownGroup = new THREE.Group();
    dropdownGroup.position.copy(position);
    scene.add(dropdownGroup);

    const dropdownGeometry = new THREE.BoxGeometry(1, 0.2, 0.2);
    const dropdownMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const dropdownButton = new THREE.Mesh(dropdownGeometry, dropdownMaterial);

    dropdownButton.position.set(0, 1, 0); // Position above the parent cube
    dropdownGroup.add(dropdownButton);

    // Add interactivity to expand/collapse the dropdown
    dropdownButton.userData = { expanded: false, styles, dropdownGroup };
    dropdownButton.onClick = () => toggleDropdown(dropdownButton);

    // Add labels for each style (initially hidden)
    let yOffset = -0.3;
    for (const [property, value] of Object.entries(styles)) {
        const labelPosition = new THREE.Vector3(position.x, position.y + yOffset, position.z);
        const label = createTextLabel(scene, `${property}: ${value}`, labelPosition);
        
        if (label) { // Check if the label is successfully created
            label.visible = false; // Initially hidden
            dropdownGroup.add(label);
        }
        yOffset -= 0.3;
    }
};

// Function to toggle dropdown visibility
const toggleDropdown = (dropdownButton) => {
    const { expanded, dropdownGroup } = dropdownButton.userData;
    dropdownButton.userData.expanded = !expanded;

    if (dropdownGroup) {
        // Toggle visibility of style labels
        dropdownGroup.children.forEach((child, index) => {
            if (index > 0) { // Skip the dropdown button itself
                child.visible = dropdownButton.userData.expanded;
            }
        });
    }
};

// Function to create a text label
const createTextLabel = (scene, text, position) => {
    const loader = new FontLoader();
    loader.load('/helvetiker_bold.typeface.json', (font) => {
        const textGeometry = new TextGeometry(text, {
            font: font,
            size: 0.2,
            depth: 0.02,
            curveSegments: 12,
            bevelEnabled: false
        });
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.copy(position);
        scene.add(textMesh);
        return textMesh;
    });
};

export default Html3DRenderer;
