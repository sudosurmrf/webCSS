import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

const Html3DRenderer = () => {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);

    useEffect(() => {
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        camera.position.set(0, 0, 10);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        mountRef.current.appendChild(renderer.domElement);

       // Initialize OrbitControls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = false; // Disable damping for a more consistent speed
        // Adjust speed settings
        controls.panSpeed = 1; // Increase panning speed
        controls.rotateSpeed = 1; // Increase rotation speed
        controls.zoomSpeed = 1; // Increase zoom speed


        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const handleMouseClick = (event) => {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children, true);

            if (intersects.length > 0) {
                const intersectedObject = intersects[0].object;
                if (intersectedObject.userData && intersectedObject.userData.onClick) {
                    intersectedObject.userData.onClick();
                }
            }
        };

        window.addEventListener('click', handleMouseClick);

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
                mountRef.current.removeChild(renderer.domElement);
            }
            controls.dispose();
            window.removeEventListener('click', handleMouseClick);
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
const processedElements = new Set(); // Track processed elements

const create3DFromDOM = (element, parentObj = null, depth = 0, scene, angle = 0, distance = 5) => {
    if (!element || element.nodeType !== 1 || processedElements.has(element)) return; // Skip if already processed or not an element

    processedElements.add(element); // Mark the element as processed

    // Generate a unique key for the element
    if (!element.dataset.key) {
        element.dataset.key = `${element.tagName.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    const uniqueKey = element.dataset.key;

    const tagName = element.tagName.toLowerCase();
    cubeCount++;
    // console.log(`Processing element: ${tagName} with key: ${uniqueKey} | Cube Count: ${cubeCount}`);

   
    const size = parentObj ? 1 : 2;
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshBasicMaterial({
        color: parentObj ? 0x00ff00 + depth * 1000 : 0x00ff00
    });

    const cube = new THREE.Mesh(geometry, material);

    // Calculate position using angle and distance from parent, with extra offset for child elements
    let xPosition = parentObj ? parentObj.position.x + (distance + depth * 0.5) * Math.cos(angle) : 0;
    let yPosition = parentObj ? parentObj.position.y + depth * 0.2 : 0; // Add slight vertical offset based on depth
    let zPosition = parentObj ? parentObj.position.z + (distance + depth * 0.5) * Math.sin(angle) : 0;

    // Apply small random offset to avoid overlap
    xPosition += Math.random() * 0.1 - 0.05;
    yPosition += Math.random() * 0.1 - 0.05;
    zPosition += Math.random() * 0.1 - 0.05;


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

        const effectiveStyles = getEffectiveStyles(element);
        console.log('Effective Styles for element:', element.tagName, effectiveStyles);
        createDropdownMenu(scene, effectiveStyles, childWorldPosition, element);



    } else {
        scene.add(cube);
    }

    const childElements = Array.from(element.children);
    const childCount = childElements.length;
    let currentAngle = 0;

    childElements.forEach((child, index) => {
        const angleIncrement = (2 * Math.PI) / childCount;
        create3DFromDOM(child, cube, depth + 1, scene, currentAngle, distance);
        currentAngle += angleIncrement;
    });
};

// Cache for storing default styles
const defaultStylesCache = {};

const getDefaultStyles = (tagName) => {
    if (!defaultStylesCache[tagName]) {
        const tempElement = document.createElement(tagName);
        document.body.appendChild(tempElement);
        const computed = window.getComputedStyle(tempElement);
        
        // Convert computed styles to a plain object for easier comparison
        const defaultStyles = {};
        for (let property of computed) {
            defaultStyles[property] = computed.getPropertyValue(property);
        }

        defaultStylesCache[tagName] = defaultStyles;
        document.body.removeChild(tempElement);
    }
    return defaultStylesCache[tagName];
};



const getEffectiveStyles = (element) => {
    const computedStyles = window.getComputedStyle(element);
    const defaultStyles = getDefaultStyles(element.tagName.toLowerCase());
    
    const effectiveStyles = {};

    // Iterate over all computed style properties
    for (let property of computedStyles) {
        const computedValue = computedStyles.getPropertyValue(property);
        const defaultValue = defaultStyles[property]; // Access directly from the plain object

        // Include styles that differ from the default styles
        if (computedValue !== defaultValue) {
            effectiveStyles[property] = computedValue;
        }
    }

    return effectiveStyles;
};




// // Function to get only the effective computed styles for display
// const getEffectiveComputedStyles = (element) => {
//     return getEffectiveStyles(element); // Directly return all effective styles
// };



const createDropdownMenu = (scene, styles, position, element) => {
    const dropdownGroup = new THREE.Group();
    dropdownGroup.position.copy(position);
    scene.add(dropdownGroup);

    const dropdownGeometry = new THREE.BoxGeometry(1, 0.2, 0.2);
    const dropdownMaterial = new THREE.MeshBasicMaterial({ color: 0x4444 });
    const dropdownButton = new THREE.Mesh(dropdownGeometry, dropdownMaterial);

    dropdownButton.position.set(0, 1, 0); 
    dropdownGroup.add(dropdownButton);

    dropdownButton.userData = {
        expanded: false,
        onClick: () => toggleDropdown(dropdownButton, dropdownGroup)
    };

    let yOffset = -0.3;
    for (const [property, value] of Object.entries(styles)) {
        const labelPosition = new THREE.Vector3(0, yOffset, 0);
        const label = createTextLabel(dropdownGroup, `${property}: ${value}`, labelPosition);
        if (label) {
            label.visible = false; 
        }
        yOffset -= 0.3;
    }

    // Add text label to display the element's HTML representation
    const elementHtml = `<${element.tagName.toLowerCase()}>${element.innerHTML}</${element.tagName.toLowerCase()}>`;
    const elementLabelPosition = new THREE.Vector3(0, yOffset, 0);
    createTextLabel(dropdownGroup, elementHtml, elementLabelPosition);
};



// Function to toggle the dropdown menu visibility
const toggleDropdown = (dropdownButton, dropdownGroup) => {
    dropdownButton.userData.expanded = !dropdownButton.userData.expanded;
    dropdownGroup.children.forEach((child, index) => {
        if (index > 0) {
            child.visible = dropdownButton.userData.expanded;
        }
    });
};

// Function to create a text label
const createTextLabel = (group, text, position) => {
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
        textMesh.visible = false; // Ensure the label is hidden immediately
        group.add(textMesh);
        return textMesh;
    });
};

export default Html3DRenderer;