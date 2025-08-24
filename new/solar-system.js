// Solar System 3D - Main Script
// Phase 1: Setup and Background Implementation

// Global variables
let scene, camera, renderer;
let windowManager;
let starField1, starField2, nebulaPlanes = [];
let sun, sunGlow1, sunGlow2, sunGlow3;
let solarFlares = [];
let planets = [];
let orbits = [];
let labels = [];
let raycaster, mouse;
let clock;
let sunPosition = new THREE.Vector3(0, 0, 0);
let targetSunPosition = new THREE.Vector3(0, 0, 0);

// FPS Counter
let frameCount = 0;
let lastTime = performance.now();
let fps = 60;

// Planet data structure
const planetData = [
    { 
        name: "Mercury", 
        radius: 3.8, 
        color: 0x8C7853, 
        distance: 150, 
        speed: 0.047,
        rotationSpeed: 0.003,
        eccentricity: 0.206,
        texturePath: null
    },
    { 
        name: "Venus", 
        radius: 9.5, 
        color: 0xFFC649, 
        distance: 200, 
        speed: 0.035,
        rotationSpeed: -0.002,
        eccentricity: 0.007,
        atmosphere: true
    },
    { 
        name: "Earth", 
        radius: 10, 
        color: 0x2E6FFF, 
        distance: 280, 
        speed: 0.030,
        rotationSpeed: 0.02,
        eccentricity: 0.017,
        clouds: true,
        axialTilt: 23.5
    },
    { 
        name: "Mars", 
        radius: 5.3, 
        color: 0xCD5C5C, 
        distance: 380, 
        speed: 0.024,
        rotationSpeed: 0.018,
        eccentricity: 0.093,
        polarCaps: true
    },
    { 
        name: "Jupiter", 
        radius: 35, 
        color: 0xD4A76A, 
        distance: 600, 
        speed: 0.013,
        rotationSpeed: 0.04,
        eccentricity: 0.048,
        bands: true,
        redSpot: true
    },
    { 
        name: "Saturn", 
        radius: 29, 
        color: 0xFAD5A5, 
        distance: 900, 
        speed: 0.010,
        rotationSpeed: 0.035,
        eccentricity: 0.056,
        rings: true,
        ringInnerRadius: 35,
        ringOuterRadius: 65
    },
    { 
        name: "Uranus", 
        radius: 16, 
        color: 0x4FD0E0, 
        distance: 1200, 
        speed: 0.007,
        rotationSpeed: 0.025,
        eccentricity: 0.046,
        axialTilt: 98,
        faintRings: true
    },
    { 
        name: "Neptune", 
        radius: 15.5, 
        color: 0x4169E1, 
        distance: 1500, 
        speed: 0.005,
        rotationSpeed: 0.028,
        eccentricity: 0.010,
        darkSpot: true
    }
];

// Initialize the scene
function init() {
    // Setup scene
    scene = new THREE.Scene();
    
    // Setup camera
    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        10000
    );
    camera.position.set(0, 300, 600);
    camera.lookAt(0, 0, 0);
    
    // Setup renderer
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: false 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Add renderer to DOM
    const container = document.getElementById('canvas-container');
    container.appendChild(renderer.domElement);
    
    // Setup clock for animations
    clock = new THREE.Clock();
    
    // Setup raycaster for mouse interactions
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Setup WindowManager
    windowManager = new WindowManager();
    windowManager.setWinShapeChangeCallback(onWindowShapeChange);
    windowManager.setWinChangeCallback(onWindowCountChange);
    
    // Initialize window shape
    const shape = windowManager.getWinShape();
    onWindowShapeChange(shape);
    
    // Setup lighting
    setupLighting();
    
    // Create background
    createSpaceBackground();
    
    // Create star fields
    createStarFields();
    
    // Create nebula effects
    createNebulaEffects();
    
    // Create the Sun
    createSun();
    
    // Create orbital paths
    createOrbitalPaths();
    
    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
    }, 1000);
    
    // Setup event listeners
    setupEventListeners();
    
    // Start animation loop
    animate();
}

// Setup basic lighting
function setupLighting() {
    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);
    
    // Point light from the sun (will be positioned at sun location)
    const sunLight = new THREE.PointLight(0xFFFFFF, 2, 3000);
    sunLight.position.copy(sunPosition);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);
    sunLight.name = 'sunLight';
}

// Create deep space background with gradient
function createSpaceBackground() {
    // Create gradient background using a large sphere
    const gradientGeometry = new THREE.SphereGeometry(5000, 32, 32);
    const gradientMaterial = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x0B0B3B) }, // Deep blue
            bottomColor: { value: new THREE.Color(0x000000) }, // Black
            offset: { value: 200 },
            exponent: { value: 0.6 }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            
            void main() {
                float h = normalize(vWorldPosition + offset).y;
                h = pow(max(0.0, h), exponent);
                gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0);
            }
        `,
        side: THREE.BackSide
    });
    
    const gradientSphere = new THREE.Mesh(gradientGeometry, gradientMaterial);
    scene.add(gradientSphere);
}

// Create two layers of star fields
function createStarFields() {
    // Layer 1: Distant small stars (many)
    const starGeometry1 = new THREE.BufferGeometry();
    const starCount1 = 15000;
    const positions1 = new Float32Array(starCount1 * 3);
    const colors1 = new Float32Array(starCount1 * 3);
    const sizes1 = new Float32Array(starCount1);
    
    for (let i = 0; i < starCount1; i++) {
        const i3 = i * 3;
        
        // Random spherical distribution
        const radius = 1000 + Math.random() * 3000;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions1[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions1[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions1[i3 + 2] = radius * Math.cos(phi);
        
        // Random star colors (white, blue, yellow)
        const colorChoice = Math.random();
        if (colorChoice < 0.3) {
            // Blue star
            colors1[i3] = 0.7;
            colors1[i3 + 1] = 0.8;
            colors1[i3 + 2] = 1.0;
        } else if (colorChoice < 0.5) {
            // Yellow star
            colors1[i3] = 1.0;
            colors1[i3 + 1] = 0.9;
            colors1[i3 + 2] = 0.7;
        } else {
            // White star
            colors1[i3] = 1.0;
            colors1[i3 + 1] = 1.0;
            colors1[i3 + 2] = 1.0;
        }
        
        // Random sizes
        sizes1[i] = Math.random() * 1.5 + 0.5;
    }
    
    starGeometry1.setAttribute('position', new THREE.BufferAttribute(positions1, 3));
    starGeometry1.setAttribute('color', new THREE.BufferAttribute(colors1, 3));
    starGeometry1.setAttribute('size', new THREE.BufferAttribute(sizes1, 1));
    
    const starMaterial1 = new THREE.PointsMaterial({
        size: 1,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    starField1 = new THREE.Points(starGeometry1, starMaterial1);
    scene.add(starField1);
    
    // Layer 2: Bright foreground stars (fewer)
    const starGeometry2 = new THREE.BufferGeometry();
    const starCount2 = 800;
    const positions2 = new Float32Array(starCount2 * 3);
    const colors2 = new Float32Array(starCount2 * 3);
    const sizes2 = new Float32Array(starCount2);
    
    for (let i = 0; i < starCount2; i++) {
        const i3 = i * 3;
        
        // Random spherical distribution
        const radius = 500 + Math.random() * 2000;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions2[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions2[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions2[i3 + 2] = radius * Math.cos(phi);
        
        // Brighter colors
        colors2[i3] = 0.9 + Math.random() * 0.1;
        colors2[i3 + 1] = 0.9 + Math.random() * 0.1;
        colors2[i3 + 2] = 0.9 + Math.random() * 0.1;
        
        // Larger sizes
        sizes2[i] = Math.random() * 3 + 1;
    }
    
    starGeometry2.setAttribute('position', new THREE.BufferAttribute(positions2, 3));
    starGeometry2.setAttribute('color', new THREE.BufferAttribute(colors2, 3));
    starGeometry2.setAttribute('size', new THREE.BufferAttribute(sizes2, 1));
    
    // Create shader material for twinkling effect
    const starMaterial2 = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            texture: { value: new THREE.TextureLoader().load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAFxJREFUeNpi/P//PwMDAxMDFAAy4AKMjIwMTAwUgP8QwAjjg2QYkCVQFDAwMDCiKwBZAVIBsgIkB8gKkBUgK0D2BboC9F+gvwHdF6B/Al0BshXoCtC/ga4A+RsABBgAmEMIaL4i3swAAAAASUVORK5CYII=') }
        },
        vertexShader: `
            attribute float size;
            varying vec3 vColor;
            uniform float time;
            
            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                float twinkle = sin(time * 3.0 + position.x) * 0.5 + 0.5;
                gl_PointSize = size * (200.0 / -mvPosition.z) * (0.5 + twinkle * 0.5);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform sampler2D texture;
            varying vec3 vColor;
            
            void main() {
                vec4 texColor = texture2D(texture, gl_PointCoord);
                gl_FragColor = vec4(vColor, 1.0) * texColor;
            }
        `,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending
    });
    
    starField2 = new THREE.Points(starGeometry2, starMaterial2);
    scene.add(starField2);
}

// Create nebula effects
function createNebulaEffects() {
    // Create multiple nebula layers with different colors and positions
    const nebulaColors = [
        { color1: 0xFF1493, color2: 0x9400D3, opacity: 0.03 }, // Pink-purple
        { color1: 0xFF6347, color2: 0xFF4500, opacity: 0.02 }, // Orange-red
        { color1: 0x00CED1, color2: 0x0000CD, opacity: 0.02 }  // Cyan-blue
    ];
    
    nebulaColors.forEach((nebula, index) => {
        const geometry = new THREE.PlaneGeometry(2000, 2000);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color1: { value: new THREE.Color(nebula.color1) },
                color2: { value: new THREE.Color(nebula.color2) },
                opacity: { value: nebula.opacity }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 color1;
                uniform vec3 color2;
                uniform float opacity;
                varying vec2 vUv;
                
                // Simplex noise function
                vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
                
                float snoise(vec2 v) {
                    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                    vec2 i = floor(v + dot(v, C.yy));
                    vec2 x0 = v - i + dot(i, C.xx);
                    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                    vec4 x12 = x0.xyxy + C.xxzz;
                    x12.xy -= i1;
                    i = mod289(i);
                    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
                    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                    m = m*m;
                    m = m*m;
                    vec3 x = 2.0 * fract(p * C.www) - 1.0;
                    vec3 h = abs(x) - 0.5;
                    vec3 ox = floor(x + 0.5);
                    vec3 a0 = x - ox;
                    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
                    vec3 g;
                    g.x = a0.x * x0.x + h.x * x0.y;
                    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                    return 130.0 * dot(m, g);
                }
                
                void main() {
                    vec2 st = vUv * 3.0;
                    float noise = snoise(st + time * 0.05);
                    noise = (noise + 1.0) * 0.5;
                    
                    vec3 color = mix(color1, color2, noise);
                    float alpha = noise * opacity;
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        const nebulaMesh = new THREE.Mesh(geometry, material);
        nebulaMesh.position.set(
            (Math.random() - 0.5) * 1000,
            (Math.random() - 0.5) * 1000,
            -1000 - index * 500
        );
        nebulaMesh.rotation.z = Math.random() * Math.PI;
        
        nebulaPlanes.push(nebulaMesh);
        scene.add(nebulaMesh);
    });
}

// Create the Sun
function createSun() {
    // Sun core
    const sunGeometry = new THREE.SphereGeometry(60, 64, 64);
    const sunMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            colorA: { value: new THREE.Color(0xFFD700) },
            colorB: { value: new THREE.Color(0xFF8C00) },
            colorC: { value: new THREE.Color(0xFF4500) }
        },
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            uniform float time;
            
            // Noise function
            float noise(vec3 p) {
                return sin(p.x * 10.0 + time) * sin(p.y * 10.0 + time) * sin(p.z * 10.0 + time);
            }
            
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                
                // Add surface turbulence
                vec3 pos = position;
                float displacement = noise(position * 0.1) * 2.0;
                pos += normal * displacement;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 colorA;
            uniform vec3 colorB;
            uniform vec3 colorC;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                // Create gradient based on position
                float mixFactor = (vPosition.y + 60.0) / 120.0;
                vec3 color = mix(colorC, mix(colorB, colorA, mixFactor), mixFactor);
                
                // Add surface variation
                float noise = sin(vPosition.x * 0.05 + time) * sin(vPosition.z * 0.05 + time);
                color = mix(color, colorB, noise * 0.3);
                
                // Emissive glow
                float glow = pow(0.7 - dot(vNormal, vec3(0, 0, 1)), 2.0);
                
                gl_FragColor = vec4(color + vec3(glow * 0.5), 1.0);
            }
        `,
        emissive: 0xFFD700,
        emissiveIntensity: 2
    });
    
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.copy(sunPosition);
    scene.add(sun);
    
    // Corona layers
    // Layer 1
    const glowGeometry1 = new THREE.SphereGeometry(80, 32, 32);
    const glowMaterial1 = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            glowColor: { value: new THREE.Color(0xFFD700) },
            intensity: { value: 0.5 }
        },
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 glowColor;
            uniform float intensity;
            varying vec3 vNormal;
            
            void main() {
                float glow = pow(0.5 - dot(vNormal, vec3(0, 0, 1)), 3.0);
                float pulse = sin(time * 2.0) * 0.1 + 0.9;
                gl_FragColor = vec4(glowColor, glow * intensity * pulse);
            }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });
    
    sunGlow1 = new THREE.Mesh(glowGeometry1, glowMaterial1);
    sunGlow1.position.copy(sunPosition);
    scene.add(sunGlow1);
    
    // Layer 2
    const glowGeometry2 = new THREE.SphereGeometry(100, 32, 32);
    const glowMaterial2 = glowMaterial1.clone();
    glowMaterial2.uniforms.intensity.value = 0.3;
    
    sunGlow2 = new THREE.Mesh(glowGeometry2, glowMaterial2);
    sunGlow2.position.copy(sunPosition);
    scene.add(sunGlow2);
    
    // Layer 3
    const glowGeometry3 = new THREE.SphereGeometry(120, 32, 32);
    const glowMaterial3 = glowMaterial1.clone();
    glowMaterial3.uniforms.intensity.value = 0.2;
    
    sunGlow3 = new THREE.Mesh(glowGeometry3, glowMaterial3);
    sunGlow3.position.copy(sunPosition);
    scene.add(sunGlow3);
    
    // Create solar flares
    createSolarFlares();
}

// Create solar flares particle system
function createSolarFlares() {
    // Create multiple flare systems for variety
    for (let i = 0; i < 3; i++) {
        const flareGeometry = new THREE.BufferGeometry();
        const flareCount = 50;
        const positions = new Float32Array(flareCount * 3);
        const velocities = new Float32Array(flareCount * 3);
        const sizes = new Float32Array(flareCount);
        const lifetimes = new Float32Array(flareCount);
        
        // Initialize particles
        for (let j = 0; j < flareCount; j++) {
            resetFlareParticle(positions, velocities, sizes, lifetimes, j);
        }
        
        flareGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        flareGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Custom shader for flares
        const flareMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                texture: { value: new THREE.TextureLoader().load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAFxJREFUeNpifP78OQMDAwMTAwMDSA7IZOAT+A8lkBXA2EyMjIz/GRn/I8sxQAUZIApAikAKYApgCkAKYApACkAKYApACkAKYApACmAKYApiCjBMG4aOgQcDBBgAmEMIaJcJq2UAAAAASUVORK5CYII=') },
                baseColor: { value: new THREE.Color(0xFFD700) },
                glowColor: { value: new THREE.Color(0xFF4500) }
            },
            vertexShader: `
                attribute float size;
                varying float vAlpha;
                varying vec3 vColor;
                uniform float time;
                
                void main() {
                    vAlpha = size / 10.0;
                    vColor = mix(vec3(1.0, 0.8, 0.0), vec3(1.0, 0.4, 0.0), sin(time + position.x));
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D texture;
                varying float vAlpha;
                varying vec3 vColor;
                
                void main() {
                    vec4 texColor = texture2D(texture, gl_PointCoord);
                    gl_FragColor = vec4(vColor, vAlpha) * texColor;
                }
            `,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true
        });
        
        const flareSystem = new THREE.Points(flareGeometry, flareMaterial);
        flareSystem.userData = {
            velocities: velocities,
            lifetimes: lifetimes,
            basePositions: positions.slice(),
            index: i
        };
        
        scene.add(flareSystem);
        solarFlares.push(flareSystem);
    }
}

// Reset individual flare particle
function resetFlareParticle(positions, velocities, sizes, lifetimes, index) {
    const i3 = index * 3;
    
    // Start position on sun surface
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 60; // Sun radius
    
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);
    
    // Random ejection velocity
    const speed = 0.5 + Math.random() * 2;
    const ejectAngle = Math.random() * 0.3; // Small angle from surface normal
    
    velocities[i3] = positions[i3] / radius * speed + (Math.random() - 0.5) * ejectAngle;
    velocities[i3 + 1] = positions[i3 + 1] / radius * speed + (Math.random() - 0.5) * ejectAngle;
    velocities[i3 + 2] = positions[i3 + 2] / radius * speed + (Math.random() - 0.5) * ejectAngle;
    
    // Random size
    sizes[index] = Math.random() * 5 + 2;
    
    // Random lifetime
    lifetimes[index] = Math.random() * 2 + 1;
}

// Create orbital paths for all planets
function createOrbitalPaths() {
    planetData.forEach((planet, index) => {
        // Calculate ellipse points
        const points = [];
        const segments = 128;
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = planet.distance * Math.cos(angle) * (1 - planet.eccentricity * 0.5);
            const z = planet.distance * Math.sin(angle);
            points.push(new THREE.Vector3(x, 0, z));
        }
        
        // Create orbit line
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const orbitMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            opacity: 0.2,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        
        const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
        orbitLine.position.copy(sunPosition);
        orbits.push(orbitLine);
        scene.add(orbitLine);
    });
}

// Window shape change callback
function onWindowShapeChange(shape) {
    camera.aspect = shape.width / shape.height;
    camera.updateProjectionMatrix();
    renderer.setSize(shape.width, shape.height);
}

// Window count change callback
function onWindowCountChange(count) {
    // Update UI
    document.getElementById('window-count').textContent = `Windows: ${count}`;
    
    // Update planets based on window count
    updatePlanets(count);
}

// Update planets based on window count
function updatePlanets(windowCount) {
    // Remove existing planets
    planets.forEach(planet => {
        scene.remove(planet.mesh);
        if (planet.rings) scene.remove(planet.rings);
        if (planet.clouds) scene.remove(planet.clouds);
        if (planet.label) document.body.removeChild(planet.label);
    });
    planets = [];
    
    // Add planets based on window count (max 8 planets + 1 sun = 9 windows)
    const planetCount = Math.min(windowCount - 1, 8);
    
    for (let i = 0; i < planetCount; i++) {
        createPlanet(planetData[i], i);
    }
    
    // Update UI
    const celestialBodies = planetCount > 0 ? 
        `${planetCount + 1} (Sun + ${planetCount} planet${planetCount > 1 ? 's' : ''})` : 
        '1 (Sun)';
    document.getElementById('planet-count').textContent = `Celestial Bodies: ${celestialBodies}`;
}

// Create a planet
function createPlanet(data, index) {
    const planetObject = {
        data: data,
        angle: Math.random() * Math.PI * 2,
        mesh: null,
        rings: null,
        clouds: null,
        label: null
    };
    
    // Create planet sphere
    const geometry = new THREE.SphereGeometry(data.radius, 64, 64);
    
    // Create material based on planet properties
    let material;
    
    if (data.name === "Mercury") {
        // Mercury - cratered gray surface
        material = new THREE.MeshPhongMaterial({
            color: 0x8C7853,
            bumpScale: 0.05,
            shininess: 5,
            specular: 0x111111
        });
        // Add procedural craters
        material.onBeforeCompile = (shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>
                vec2 uv = vUv * 30.0;
                float crater = 0.0;
                for(int i = 0; i < 5; i++) {
                    vec2 pos = vec2(sin(float(i) * 1.7), cos(float(i) * 2.3)) * 10.0;
                    float dist = distance(uv, pos);
                    crater += smoothstep(1.0, 0.0, dist) * 0.1;
                }
                diffuseColor.rgb *= 1.0 - crater * 0.3;
                `
            );
        };
    } else if (data.name === "Venus") {
        // Venus - thick yellowish atmosphere
        material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                atmosphereColor: { value: new THREE.Color(0xFFC649) },
                surfaceColor: { value: new THREE.Color(0xE8B547) }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 atmosphereColor;
                uniform vec3 surfaceColor;
                varying vec3 vNormal;
                varying vec2 vUv;
                
                float noise(vec2 p) {
                    return sin(p.x * 10.0) * sin(p.y * 10.0);
                }
                
                void main() {
                    // Swirling cloud patterns
                    vec2 uv = vUv;
                    float clouds = noise(uv * 5.0 + vec2(time * 0.02, 0.0));
                    clouds += noise(uv * 10.0 - vec2(0.0, time * 0.03)) * 0.5;
                    clouds = smoothstep(0.0, 1.0, clouds * 0.5 + 0.5);
                    
                    vec3 color = mix(surfaceColor, atmosphereColor, clouds);
                    
                    // Atmospheric glow at edges
                    float rim = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
                    color += atmosphereColor * pow(rim, 2.0) * 0.5;
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        });
    } else if (data.name === "Earth") {
        // Earth - blue marble with continents
        material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                oceanColor: { value: new THREE.Color(0x006994) },
                landColor: { value: new THREE.Color(0x2A5F1A) },
                desertColor: { value: new THREE.Color(0xD2B48C) },
                iceColor: { value: new THREE.Color(0xFFFFFF) }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec2 vUv;
                varying vec3 vPosition;
                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 oceanColor;
                uniform vec3 landColor;
                uniform vec3 desertColor;
                uniform vec3 iceColor;
                varying vec3 vNormal;
                varying vec2 vUv;
                varying vec3 vPosition;
                
                float noise(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                }
                
                void main() {
                    vec2 uv = vUv;
                    
                    // Simple continent pattern
                    float land = noise(uv * 4.0) * noise(uv * 8.0);
                    land = smoothstep(0.3, 0.4, land);
                    
                    // Ice caps at poles
                    float iceCap = smoothstep(0.7, 0.9, abs(vPosition.y) / 10.0);
                    
                    // Mix colors
                    vec3 color = mix(oceanColor, landColor, land);
                    color = mix(color, iceColor, iceCap);
                    
                    // Add specular for water
                    float specular = pow(max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0))), 20.0);
                    if(land < 0.5) color += vec3(specular * 0.5);
                    
                    // Atmosphere effect
                    float rim = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
                    color += vec3(0.1, 0.3, 0.6) * pow(rim, 2.0) * 0.3;
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        });
    } else if (data.name === "Mars") {
        // Mars - red planet with polar caps
        material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                baseColor: { value: new THREE.Color(0xCD5C5C) },
                darkColor: { value: new THREE.Color(0x8B3626) },
                iceColor: { value: new THREE.Color(0xF0E6DC) }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec2 vUv;
                varying vec3 vPosition;
                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 baseColor;
                uniform vec3 darkColor;
                uniform vec3 iceColor;
                varying vec3 vNormal;
                varying vec2 vUv;
                varying vec3 vPosition;
                
                float noise(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                }
                
                void main() {
                    vec2 uv = vUv;
                    
                    // Surface features
                    float features = noise(uv * 10.0) * noise(uv * 20.0);
                    vec3 color = mix(baseColor, darkColor, features);
                    
                    // Polar ice caps
                    float iceCap = smoothstep(0.8, 0.95, abs(vPosition.y) / 5.3);
                    color = mix(color, iceColor, iceCap);
                    
                    // Dust atmosphere
                    float rim = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
                    color += baseColor * pow(rim, 3.0) * 0.2;
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        });
    } else if (data.name === "Jupiter") {
        // Jupiter with Great Red Spot and bands
        material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                bandColor1: { value: new THREE.Color(0xE8D4A2) },
                bandColor2: { value: new THREE.Color(0xC4915C) },
                bandColor3: { value: new THREE.Color(0x8B6F47) },
                stormColor: { value: new THREE.Color(0xCD5C5C) }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                void main() {
                    vUv = uv;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 bandColor1;
                uniform vec3 bandColor2;
                uniform vec3 bandColor3;
                uniform vec3 stormColor;
                varying vec2 vUv;
                varying vec3 vPosition;
                
                float noise(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                }
                
                void main() {
                    vec2 uv = vUv;
                    
                    // Animated bands
                    float bands = sin((uv.y + time * 0.01) * 30.0) * 0.5 + 0.5;
                    float turbulence = noise(vec2(uv.x * 20.0 + time * 0.02, uv.y * 10.0)) * 0.2;
                    bands += turbulence;
                    
                    vec3 color = mix(bandColor1, bandColor2, bands);
                    color = mix(color, bandColor3, smoothstep(0.3, 0.7, bands));
                    
                    // Great Red Spot
                    vec2 spotCenter = vec2(0.3, 0.4);
                    float spotDist = distance(uv, spotCenter);
                    if(spotDist < 0.08) {
                        float spotIntensity = 1.0 - smoothstep(0.0, 0.08, spotDist);
                        float swirl = sin(spotDist * 50.0 - time * 2.0) * 0.5 + 0.5;
                        color = mix(color, stormColor, spotIntensity * swirl);
                    }
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        });
    } else if (data.name === "Saturn") {
        // Saturn - pale gold with subtle bands
        material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                baseColor: { value: new THREE.Color(0xFAD5A5) },
                bandColor: { value: new THREE.Color(0xE8C88C) }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 baseColor;
                uniform vec3 bandColor;
                varying vec2 vUv;
                varying vec3 vNormal;
                
                void main() {
                    vec2 uv = vUv;
                    
                    // Subtle bands
                    float bands = sin(uv.y * 20.0) * 0.5 + 0.5;
                    vec3 color = mix(baseColor, bandColor, bands * 0.3);
                    
                    // Hexagonal storm at north pole (simplified)
                    if(uv.y > 0.9) {
                        color *= 0.9;
                    }
                    
                    // Soft glow
                    float rim = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
                    color += baseColor * pow(rim, 3.0) * 0.1;
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        });
    } else if (data.name === "Uranus") {
        // Uranus - pale blue-green
        material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                baseColor: { value: new THREE.Color(0x4FD0E0) },
                cloudColor: { value: new THREE.Color(0x7FDBEF) }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 baseColor;
                uniform vec3 cloudColor;
                varying vec2 vUv;
                varying vec3 vNormal;
                
                float noise(vec2 p) {
                    return fract(sin(dot(p, vec2(45.234, 98.882))) * 43758.5453);
                }
                
                void main() {
                    vec2 uv = vUv;
                    
                    // Subtle cloud patterns
                    float clouds = noise(uv * 8.0 + time * 0.01);
                    vec3 color = mix(baseColor, cloudColor, clouds * 0.2);
                    
                    // Atmospheric haze
                    float rim = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
                    color += cloudColor * pow(rim, 2.0) * 0.3;
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        });
    } else if (data.name === "Neptune") {
        // Neptune - deep blue with storm features
        material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                baseColor: { value: new THREE.Color(0x3A5FCD) },
                stormColor: { value: new THREE.Color(0x1E3A8A) },
                cloudColor: { value: new THREE.Color(0x6495ED) }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 baseColor;
                uniform vec3 stormColor;
                uniform vec3 cloudColor;
                varying vec2 vUv;
                varying vec3 vNormal;
                
                float noise(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                }
                
                void main() {
                    vec2 uv = vUv;
                    
                    // Base color with variations
                    vec3 color = baseColor;
                    
                    // Cloud bands
                    float bands = sin(uv.y * 15.0 + time * 0.02) * 0.5 + 0.5;
                    color = mix(color, cloudColor, bands * 0.3);
                    
                    // Great Dark Spot
                    vec2 spotCenter = vec2(0.6, 0.5);
                    float spotDist = distance(uv, spotCenter);
                    if(spotDist < 0.06) {
                        float intensity = 1.0 - smoothstep(0.0, 0.06, spotDist);
                        color = mix(color, stormColor, intensity * 0.7);
                    }
                    
                    // Wind streaks
                    float streaks = noise(vec2(uv.x * 30.0 + time * 0.05, uv.y));
                    color = mix(color, cloudColor, streaks * 0.1);
                    
                    // Atmosphere
                    float rim = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
                    color += baseColor * pow(rim, 2.0) * 0.2;
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        });
    } else {
        // Default planet material
        material = new THREE.MeshPhongMaterial({
            color: data.color,
            shininess: 30,
            specular: 0x111111
        });
    }
    
    planetObject.mesh = new THREE.Mesh(geometry, material);
    
    // Add special features
    if (data.rings) {
        // Saturn's rings - create multiple ring layers for realism
        const ringGroup = new THREE.Group();
        
        // Ring data (inner radius, outer radius, color, opacity)
        const ringData = [
            { inner: 35, outer: 40, color: 0xBDB76B, opacity: 0.8 },
            { inner: 41, outer: 48, color: 0xD4A76A, opacity: 0.7 },
            { inner: 49, outer: 54, color: 0xE8D4A2, opacity: 0.6 },
            { inner: 55, outer: 58, color: 0xC4915C, opacity: 0.5 },
            { inner: 59, outer: 65, color: 0xFAD5A5, opacity: 0.4 }
        ];
        
        ringData.forEach((ring, index) => {
            const ringGeometry = new THREE.RingGeometry(
                ring.inner,
                ring.outer,
                128,
                1,
                0,
                Math.PI * 2
            );
            
            // Add UV coordinates for texture mapping
            const uvs = ringGeometry.attributes.uv.array;
            for (let i = 0; i < uvs.length; i += 2) {
                // Radial UV mapping
                const angle = uvs[i] * Math.PI * 2;
                uvs[i] = Math.cos(angle) * 0.5 + 0.5;
                uvs[i + 1] = Math.sin(angle) * 0.5 + 0.5;
            }
            
            // Create ring material with procedural texture
            const ringMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    baseColor: { value: new THREE.Color(ring.color) },
                    innerRadius: { value: ring.inner },
                    outerRadius: { value: ring.outer }
                },
                vertexShader: `
                    varying vec2 vUv;
                    varying float vRadius;
                    void main() {
                        vUv = uv;
                        vRadius = length(position.xy);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform vec3 baseColor;
                    uniform float innerRadius;
                    uniform float outerRadius;
                    varying vec2 vUv;
                    varying float vRadius;
                    
                    float random(vec2 st) {
                        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
                    }
                    
                    void main() {
                        // Create concentric ring pattern
                        float ringPattern = sin(vRadius * 200.0) * 0.5 + 0.5;
                        
                        // Add radial variation
                        float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
                        float radialNoise = random(vec2(angle * 10.0, vRadius)) * 0.3;
                        
                        // Fade edges
                        float edgeFade = smoothstep(innerRadius, innerRadius + 2.0, vRadius) * 
                                        smoothstep(outerRadius, outerRadius - 2.0, vRadius);
                        
                        // Combine patterns
                        vec3 color = baseColor * (0.7 + ringPattern * 0.3 + radialNoise);
                        float alpha = ` + ring.opacity + ` * edgeFade * (0.8 + ringPattern * 0.2);
                        
                        gl_FragColor = vec4(color, alpha);
                    }
                `,
                side: THREE.DoubleSide,
                transparent: true,
                depthWrite: false,
                blending: THREE.NormalBlending
            });
            
            const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
            ringMesh.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.02; // Slight tilt variation
            ringGroup.add(ringMesh);
        });
        
        planetObject.rings = ringGroup;
        scene.add(ringGroup);
    }
    
    if (data.clouds) {
        // Earth's clouds
        const cloudGeometry = new THREE.SphereGeometry(data.radius + 0.5, 32, 32);
        const cloudMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
            depthWrite: false
        });
        planetObject.clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
        scene.add(planetObject.clouds);
    }
    
    // Create label
    const label = document.createElement('div');
    label.className = 'planet-label';
    label.textContent = data.name;
    label.style.color = data.name === "Earth" ? '#00ff00' : '#ffffff';
    document.body.appendChild(label);
    planetObject.label = label;
    
    // Add planet to scene
    scene.add(planetObject.mesh);
    planets.push(planetObject);
    
    // Set initial position
    updatePlanetPosition(planetObject);
}

// Update planet position
function updatePlanetPosition(planet) {
    const x = sunPosition.x + planet.data.distance * Math.cos(planet.angle) * (1 - planet.data.eccentricity * 0.5);
    const z = sunPosition.z + planet.data.distance * Math.sin(planet.angle);
    
    planet.mesh.position.set(x, 0, z);
    
    if (planet.rings) {
        planet.rings.position.copy(planet.mesh.position);
        // Add slight tilt to Saturn's rings
        if (planet.data.name === "Saturn") {
            planet.rings.rotation.x = Math.PI / 2 - 0.45; // 26.7 degree tilt
            planet.rings.rotation.y = planet.angle * 0.1; // Slight rotation with orbit
        }
    }
    
    if (planet.clouds) {
        planet.clouds.position.copy(planet.mesh.position);
    }
}

// Update label positions
function updateLabels() {
    planets.forEach(planet => {
        if (planet.label) {
            const vector = planet.mesh.position.clone();
            vector.y += planet.data.radius + 10;
            vector.project(camera);
            
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
            
            planet.label.style.left = x + 'px';
            planet.label.style.top = y + 'px';
            planet.label.style.display = vector.z < 1 ? 'block' : 'none';
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Window resize
    window.addEventListener('resize', () => {
        const shape = windowManager.getWinShape();
        onWindowShapeChange(shape);
    });
    
    // Mouse click for sun movement
    renderer.domElement.addEventListener('click', onMouseClick);
}

// Mouse click handler
function onMouseClick(event) {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);
    
    // Create a plane at y=0 to intersect with
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    
    // Find where the ray intersects the plane
    raycaster.ray.intersectPlane(plane, intersectPoint);
    
    // Set target position for sun
    if (intersectPoint) {
        targetSunPosition.copy(intersectPoint);
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    
    // Update FPS counter
    frameCount++;
    const currentTime = performance.now();
    if (currentTime >= lastTime + 1000) {
        fps = Math.round(frameCount * 1000 / (currentTime - lastTime));
        document.getElementById('fps').textContent = `FPS: ${fps}`;
        frameCount = 0;
        lastTime = currentTime;
    }
    
    // Animate sun position smoothly
    sunPosition.lerp(targetSunPosition, deltaTime * 2);
    
    // Update sun and corona positions
    if (sun) {
        sun.position.copy(sunPosition);
        sun.material.uniforms.time.value = elapsedTime;
        sun.rotation.y += 0.001;
    }
    
    if (sunGlow1) {
        sunGlow1.position.copy(sunPosition);
        sunGlow1.material.uniforms.time.value = elapsedTime;
    }
    
    if (sunGlow2) {
        sunGlow2.position.copy(sunPosition);
        sunGlow2.material.uniforms.time.value = elapsedTime;
    }
    
    if (sunGlow3) {
        sunGlow3.position.copy(sunPosition);
        sunGlow3.material.uniforms.time.value = elapsedTime;
    }
    
    // Update sun light position
    const sunLight = scene.getObjectByName('sunLight');
    if (sunLight) {
        sunLight.position.copy(sunPosition);
    }
    
    // Update orbit positions
    orbits.forEach(orbit => {
        orbit.position.copy(sunPosition);
    });
    
    // Animate solar flares
    solarFlares.forEach((flareSystem, systemIndex) => {
        const positions = flareSystem.geometry.attributes.position.array;
        const sizes = flareSystem.geometry.attributes.size.array;
        const velocities = flareSystem.userData.velocities;
        const lifetimes = flareSystem.userData.lifetimes;
        
        for (let i = 0; i < positions.length / 3; i++) {
            const i3 = i * 3;
            
            // Update lifetime
            lifetimes[i] -= deltaTime;
            
            if (lifetimes[i] <= 0) {
                // Reset particle
                resetFlareParticle(positions, velocities, sizes, lifetimes, i);
                // Offset to sun position
                positions[i3] += sunPosition.x;
                positions[i3 + 1] += sunPosition.y;
                positions[i3 + 2] += sunPosition.z;
            } else {
                // Update position
                positions[i3] += velocities[i3] * deltaTime * 20;
                positions[i3 + 1] += velocities[i3 + 1] * deltaTime * 20;
                positions[i3 + 2] += velocities[i3 + 2] * deltaTime * 20;
                
                // Apply gravity back towards sun
                const dx = sunPosition.x - positions[i3];
                const dy = sunPosition.y - positions[i3 + 1];
                const dz = sunPosition.z - positions[i3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                
                if (dist > 65) { // Only apply gravity outside sun radius
                    const gravity = 0.5;
                    velocities[i3] += (dx / dist) * gravity * deltaTime;
                    velocities[i3 + 1] += (dy / dist) * gravity * deltaTime;
                    velocities[i3 + 2] += (dz / dist) * gravity * deltaTime;
                }
                
                // Fade out
                sizes[i] = (lifetimes[i] / 3) * (Math.random() * 5 + 2);
            }
        }
        
        // Update buffers
        flareSystem.geometry.attributes.position.needsUpdate = true;
        flareSystem.geometry.attributes.size.needsUpdate = true;
        
        // Update shader uniforms
        if (flareSystem.material.uniforms) {
            flareSystem.material.uniforms.time.value = elapsedTime;
        }
    });
    
    // Animate stars
    if (starField1) {
        starField1.rotation.y += 0.0001;
    }
    
    if (starField2 && starField2.material.uniforms) {
        starField2.material.uniforms.time.value = elapsedTime;
        starField2.rotation.y -= 0.0002;
    }
    
    // Animate nebulas
    nebulaPlanes.forEach((nebula, index) => {
        if (nebula.material.uniforms) {
            nebula.material.uniforms.time.value = elapsedTime;
            nebula.position.x += Math.sin(elapsedTime * 0.1 + index) * 0.1;
            nebula.position.y += Math.cos(elapsedTime * 0.1 + index) * 0.1;
        }
    });
    
    // Animate planets
    planets.forEach(planet => {
        // Orbital motion
        planet.angle += planet.data.speed * deltaTime;
        updatePlanetPosition(planet);
        
        // Rotation
        planet.mesh.rotation.y += planet.data.rotationSpeed;
        
        // Special animations
        if (planet.data.name === "Jupiter" && planet.mesh.material.uniforms) {
            planet.mesh.material.uniforms.time.value = elapsedTime;
        }
        
        if (planet.clouds) {
            planet.clouds.rotation.y += 0.001;
        }
        
        if (planet.rings) {
            // Animate ring rotation
            if (planet.data.name === "Saturn") {
                // Update shader uniforms for each ring
                planet.rings.children.forEach(ring => {
                    if (ring.material && ring.material.uniforms) {
                        ring.material.uniforms.time.value = elapsedTime;
                    }
                });
            }
            planet.rings.rotation.z += 0.0002;
        }
    });
    
    // Update labels
    updateLabels();
    
    // Render the scene
    renderer.render(scene, camera);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
