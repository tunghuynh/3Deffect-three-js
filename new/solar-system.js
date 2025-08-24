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
        axialTilt: 23.5,
        moons: [
            { name: "Moon", radius: 2.7, distance: 30, speed: 0.1 }
        ]
    },
    { 
        name: "Mars", 
        radius: 5.3, 
        color: 0xCD5C5C, 
        distance: 380, 
        speed: 0.024,
        rotationSpeed: 0.018,
        eccentricity: 0.093,
        polarCaps: true,
        moons: [
            { name: "Phobos", radius: 0.7, distance: 15, speed: 0.3 },
            { name: "Deimos", radius: 0.4, distance: 20, speed: 0.15 }
        ]
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
        redSpot: true,
        moons: [
            { name: "Io", radius: 2.8, distance: 60, speed: 0.2 },
            { name: "Europa", radius: 2.4, distance: 70, speed: 0.15 },
            { name: "Ganymede", radius: 4.1, distance: 85, speed: 0.1 },
            { name: "Callisto", radius: 3.8, distance: 100, speed: 0.08 }
        ]
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
        ringOuterRadius: 65,
        moons: [
            { name: "Titan", radius: 4.0, distance: 80, speed: 0.12 },
            { name: "Rhea", radius: 1.2, distance: 95, speed: 0.1 },
            { name: "Iapetus", radius: 1.1, distance: 110, speed: 0.08 },
            { name: "Dione", radius: 0.9, distance: 88, speed: 0.11 }
        ]
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

// Performance monitoring
const performanceMonitor = {
    drawCalls: 0,
    triangles: 0,
    textures: 0,
    geometries: 0,
    windowCount: 1
};

// Initialize the scene
function init() {
    // Setup scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 1000, 5000); // Add fog for depth
    
    // Setup camera
    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        10000
    );
    camera.position.set(0, 300, 600);
    camera.lookAt(0, 0, 0);
    
    // Setup renderer with performance optimizations
    renderer = new THREE.WebGLRenderer({ 
        antialias: window.devicePixelRatio < 2, // Disable AA on high DPI displays
        alpha: false,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance
    renderer.shadowMap.enabled = false; // Disable shadows for better performance
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
    
    // Create Milky Way band
    createMilkyWay();
    
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

// Create Milky Way band
function createMilkyWay() {
    // Create curved band geometry
    const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2000, 300, -1500),
        new THREE.Vector3(-1000, 200, -1600),
        new THREE.Vector3(0, 100, -1700),
        new THREE.Vector3(1000, 150, -1600),
        new THREE.Vector3(2000, 250, -1500)
    ]);
    
    // Create tube geometry following the curve
    const tubeGeometry = new THREE.TubeGeometry(curve, 100, 300, 8, false);
    
    // Create shader material for Milky Way
    const milkyWayMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            baseColor: { value: new THREE.Color(0x8B7355) },
            glowColor: { value: new THREE.Color(0xFFF8DC) },
            starDensity: { value: 2.0 }
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
            uniform vec3 baseColor;
            uniform vec3 glowColor;
            uniform float starDensity;
            varying vec2 vUv;
            varying vec3 vPosition;
            
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
            }
            
            float noise(vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);
                float a = random(i);
                float b = random(i + vec2(1.0, 0.0));
                float c = random(i + vec2(0.0, 1.0));
                float d = random(i + vec2(1.0, 1.0));
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }
            
            void main() {
                vec2 st = vUv * vec2(20.0, 5.0);
                
                // Create star clusters
                float stars = 0.0;
                for(int i = 0; i < 3; i++) {
                    float n = noise(st * (1.0 + float(i) * 0.5) + time * 0.01);
                    stars += pow(n, 3.0 + float(i)) * (1.0 / float(i + 1));
                }
                stars *= starDensity;
                
                // Create dust clouds
                float dust = noise(st * 0.5 + time * 0.005) * 0.5 + 0.5;
                dust *= noise(st * 1.5 - time * 0.002) * 0.5 + 0.5;
                
                // Mix colors
                vec3 color = mix(baseColor, glowColor, stars);
                color = mix(color * 0.2, color, dust);
                
                // Edge fade
                float edgeFade = 1.0 - abs(vUv.y - 0.5) * 2.0;
                edgeFade = smoothstep(0.0, 0.3, edgeFade);
                
                // Distance fade
                float distFade = 1.0 - smoothstep(1500.0, 2500.0, length(vPosition));
                
                float alpha = (dust * 0.3 + stars * 0.7) * edgeFade * distFade * 0.6;
                
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    
    const milkyWay = new THREE.Mesh(tubeGeometry, milkyWayMaterial);
    milkyWay.name = 'milkyWay';
    scene.add(milkyWay);
    
    // Add additional star cluster planes for depth
    for (let i = 0; i < 3; i++) {
        const planeGeometry = new THREE.PlaneGeometry(3000, 600);
        const planeMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                opacity: { value: 0.2 - i * 0.05 }
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
                uniform float opacity;
                varying vec2 vUv;
                
                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
                }
                
                void main() {
                    vec2 st = vUv * vec2(50.0, 10.0);
                    float stars = 0.0;
                    
                    // Create point stars
                    vec2 pos = floor(st);
                    float r = random(pos);
                    if(r > 0.98) {
                        float dist = length(fract(st) - 0.5);
                        stars = 1.0 - smoothstep(0.0, 0.05, dist);
                    }
                    
                    gl_FragColor = vec4(1.0, 0.95, 0.9, stars * opacity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.position.set(
            (Math.random() - 0.5) * 500,
            100 + i * 50,
            -1700 - i * 100
        );
        plane.rotation.x = -0.2 + Math.random() * 0.4;
        plane.rotation.y = -0.5 + Math.random() * 1.0;
        plane.userData = { isMilkyWayPlane: true };
        scene.add(plane);
    }
}

// Create sun texture (similar to main.js)
function createSunTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Complex sun surface gradient
    const gradient = ctx.createRadialGradient(
        canvas.width/2, canvas.height/2, 0,
        canvas.width/2, canvas.height/2, canvas.width/2
    );
    gradient.addColorStop(0, '#FFFF00');
    gradient.addColorStop(0.2, '#FFD700');
    gradient.addColorStop(0.4, '#FFA500');
    gradient.addColorStop(0.6, '#FF8C00');
    gradient.addColorStop(0.8, '#FF6347');
    gradient.addColorStop(1, '#FF4500');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add sunspots
    for(let i = 0; i < 8; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 20 + 10;
        const spotGrad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        spotGrad.addColorStop(0, 'rgba(100,50,0,0.8)');
        spotGrad.addColorStop(1, 'rgba(200,100,0,0)');
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// Create moon texture
function createMoonTexture(moonName = 'default') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    switch(moonName) {
        case 'Moon': // Earth's Moon
            // Gray base with maria
            const moonGrad = ctx.createRadialGradient(128, 64, 0, 128, 64, 100);
            moonGrad.addColorStop(0, '#D3D3D3');
            moonGrad.addColorStop(0.5, '#C0C0C0');
            moonGrad.addColorStop(1, '#A9A9A9');
            ctx.fillStyle = moonGrad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add maria (dark regions)
            for(let i = 0; i < 5; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const r = Math.random() * 30 + 10;
                const mariaGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
                mariaGrad.addColorStop(0, 'rgba(80,80,80,0.5)');
                mariaGrad.addColorStop(1, 'rgba(100,100,100,0)');
                ctx.fillStyle = mariaGrad;
                ctx.fillRect(x - r, y - r, r * 2, r * 2);
            }
            
            // Add craters
            for(let i = 0; i < 15; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const r = Math.random() * 8 + 2;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.4 + 0.2})`;
                ctx.fill();
            }
            break;
            
        case 'Phobos': // Mars moon
        case 'Deimos': // Mars moon
            // Irregular rocky surface
            ctx.fillStyle = '#8B7355';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            for(let i = 0; i < 10; i++) {
                ctx.beginPath();
                ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 
                    Math.random() * 5 + 1, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.fill();
            }
            break;
            
        case 'Io': // Jupiter moon - volcanic
            // Yellow-orange base
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Volcanic spots
            for(let i = 0; i < 10; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const r = Math.random() * 15 + 5;
                const volcanoGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
                volcanoGrad.addColorStop(0, '#FF4500');
                volcanoGrad.addColorStop(0.5, '#FF6347');
                volcanoGrad.addColorStop(1, '#FFD700');
                ctx.fillStyle = volcanoGrad;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
            
        case 'Europa': // Jupiter moon - icy
            // Ice blue base
            ctx.fillStyle = '#E0FFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Linear ice cracks
            ctx.strokeStyle = '#4682B4';
            ctx.lineWidth = 1;
            for(let i = 0; i < 20; i++) {
                ctx.beginPath();
                ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
                ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
                ctx.stroke();
            }
            break;
            
        case 'Titan': // Saturn moon - atmosphere
            // Orange hazy atmosphere
            const titanGrad = ctx.createRadialGradient(128, 64, 0, 128, 64, 100);
            titanGrad.addColorStop(0, '#FF8C00');
            titanGrad.addColorStop(0.5, '#FFA500');
            titanGrad.addColorStop(1, '#FF7F50');
            ctx.fillStyle = titanGrad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;
            
        default:
            // Generic gray moon
            ctx.fillStyle = '#C0C0C0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            for(let i = 0; i < 20; i++) {
                ctx.beginPath();
                ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 
                    Math.random() * 8 + 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.4 + 0.1})`;
                ctx.fill();
            }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// Create the Sun
function createSun() {
    // Sun core
    const sunGeometry = new THREE.SphereGeometry(60, 64, 64);
    const sunTexture = createSunTexture();
    // Use MeshBasicMaterial similar to main.js for better compatibility
    const sunMaterial = new THREE.MeshBasicMaterial({
        map: sunTexture,
        emissive: 0xFFAA00,
        emissiveIntensity: 1
    });
    
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.copy(sunPosition);
    scene.add(sun);
    
    // Corona layers
    // Layer 1
    const glowGeometry1 = new THREE.SphereGeometry(80, 32, 32);
    const glowMaterial1 = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    sunGlow1 = new THREE.Mesh(glowGeometry1, glowMaterial1);
    sunGlow1.position.copy(sunPosition);
    scene.add(sunGlow1);
    
    // Layer 2
    const glowGeometry2 = new THREE.SphereGeometry(100, 32, 32);
    const glowMaterial2 = new THREE.MeshBasicMaterial({
        color: 0xFF8C00,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    sunGlow2 = new THREE.Mesh(glowGeometry2, glowMaterial2);
    sunGlow2.position.copy(sunPosition);
    scene.add(sunGlow2);
    
    // Layer 3
    const glowGeometry3 = new THREE.SphereGeometry(120, 32, 32);
    const glowMaterial3 = new THREE.MeshBasicMaterial({
        color: 0xFF6347,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
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
        const colors = new Float32Array(flareCount * 3);
        
        // Initialize particles
        for (let j = 0; j < flareCount; j++) {
            resetFlareParticle(positions, velocities, sizes, lifetimes, j);
            // Set initial colors (orange to yellow gradient)
            colors[j * 3] = 1.0; // R
            colors[j * 3 + 1] = 0.7 + Math.random() * 0.3; // G
            colors[j * 3 + 2] = 0.0; // B
        }
        
        flareGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        flareGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        flareGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        // Create texture for flares
        const flareCanvas = document.createElement('canvas');
        flareCanvas.width = 32;
        flareCanvas.height = 32;
        const flareCtx = flareCanvas.getContext('2d');
        
        // Create radial gradient for flare particle
        const flareGrad = flareCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
        flareGrad.addColorStop(0, 'rgba(255,255,255,1)');
        flareGrad.addColorStop(0.2, 'rgba(255,215,0,1)');
        flareGrad.addColorStop(0.4, 'rgba(255,140,0,0.8)');
        flareGrad.addColorStop(0.7, 'rgba(255,69,0,0.4)');
        flareGrad.addColorStop(1, 'rgba(255,0,0,0)');
        
        flareCtx.fillStyle = flareGrad;
        flareCtx.fillRect(0, 0, 32, 32);
        
        const flareTexture = new THREE.CanvasTexture(flareCanvas);
        flareTexture.needsUpdate = true;
        
        // Simple point material for flares
        const flareMaterial = new THREE.PointsMaterial({
            map: flareTexture,
            size: 8,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
            vertexColors: true
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
    
    // Update performance settings based on window count
    performanceMonitor.windowCount = count;
    adjustPerformanceSettings(count);
    
    // Update planets based on window count
    updatePlanets(count);
}

// Adjust performance settings based on window count
function adjustPerformanceSettings(windowCount) {
    // Reduce particle count for multiple windows
    if (windowCount > 4) {
        // Reduce star field density
        if (starField1) {
            starField1.visible = windowCount <= 6;
        }
        if (starField2) {
            starField2.visible = windowCount <= 8;
        }
        
        // Reduce nebula effects
        nebulaPlanes.forEach((nebula, index) => {
            nebula.visible = index === 0 || windowCount <= 5;
        });
        
        // Reduce solar flare particles
        solarFlares.forEach(flare => {
            flare.visible = windowCount <= 7;
        });
    } else {
        // Restore all effects for fewer windows
        if (starField1) starField1.visible = true;
        if (starField2) starField2.visible = true;
        nebulaPlanes.forEach(nebula => nebula.visible = true);
        solarFlares.forEach(flare => flare.visible = true);
    }
    
    // Adjust renderer pixel ratio
    if (windowCount > 6) {
        renderer.setPixelRatio(1); // Force 1x for many windows
    } else {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
}

// Update planets based on window count
function updatePlanets(windowCount) {
    // Remove existing planets
    planets.forEach(planet => {
        scene.remove(planet.mesh);
        if (planet.rings) scene.remove(planet.rings);
        if (planet.clouds) scene.remove(planet.clouds);
        if (planet.label) document.body.removeChild(planet.label);
        
        // Remove moons
        if (planet.moons) {
            planet.moons.forEach(moon => {
                scene.remove(moon.group);
                if (moon.label) document.body.removeChild(moon.label);
            });
        }
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
    
    // Create planet sphere with LOD
    const lod = new THREE.LOD();
    
    // High detail (close)
    const geometryHigh = new THREE.SphereGeometry(data.radius, 64, 64);
    // Medium detail
    const geometryMed = new THREE.SphereGeometry(data.radius, 32, 32);
    // Low detail (far)
    const geometryLow = new THREE.SphereGeometry(data.radius, 16, 16);
    
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
        material = new THREE.MeshPhongMaterial({
            color: 0xFFC649,
            emissive: 0xE8B547,
            emissiveIntensity: 0.1,
            shininess: 20,
            specular: 0x222222
        });
    } else if (data.name === "Earth") {
        // Earth - blue marble with continents
        material = new THREE.MeshPhongMaterial({
            color: 0x2E6FFF,
            emissive: 0x112288,
            emissiveIntensity: 0.1,
            shininess: 50,
            specular: 0x222222
        });
    } else if (data.name === "Mars") {
        // Mars - red planet with polar caps
        material = new THREE.MeshPhongMaterial({
            color: 0xCD5C5C,
            emissive: 0x8B3626,
            emissiveIntensity: 0.1,
            shininess: 15,
            specular: 0x111111
        });
    } else if (data.name === "Jupiter") {
        // Jupiter with Great Red Spot and bands
        material = new THREE.MeshPhongMaterial({
            color: 0xD4A76A,
            emissive: 0x8B6F47,
            emissiveIntensity: 0.1,
            shininess: 30,
            specular: 0x222222
        });
    } else if (data.name === "Saturn") {
        // Saturn - pale gold with subtle bands
        material = new THREE.MeshPhongMaterial({
            color: 0xFAD5A5,
            emissive: 0xE8C88C,
            emissiveIntensity: 0.08,
            shininess: 35,
            specular: 0x333333
        });
    } else if (data.name === "Uranus") {
        // Uranus - pale blue-green
        material = new THREE.MeshPhongMaterial({
            color: 0x4FD0E0,
            emissive: 0x276873,
            emissiveIntensity: 0.1,
            shininess: 40,
            specular: 0x444444
        });
    } else if (data.name === "Neptune") {
        // Neptune - deep blue with storm features
        material = new THREE.MeshPhongMaterial({
            color: 0x4B70DD,
            emissive: 0x25386E,
            emissiveIntensity: 0.1,
            shininess: 45,
            specular: 0x333333
        });
    } else {
        // Default planet material
        material = new THREE.MeshPhongMaterial({
            color: data.color,
            shininess: 30,
            specular: 0x111111
        });
    }
    
    // Create LOD meshes
    const meshHigh = new THREE.Mesh(geometryHigh, material);
    const meshMed = new THREE.Mesh(geometryMed, material);
    const meshLow = new THREE.Mesh(geometryLow, material);
    
    // Add LOD levels (distance from camera)
    lod.addLevel(meshHigh, 0);
    lod.addLevel(meshMed, data.radius * 20);
    lod.addLevel(meshLow, data.radius * 50);
    
    planetObject.mesh = lod;
    
    // Add special planetary features
    if (data.name === "Jupiter") {
        // Add Great Red Spot as a separate feature
        const spotRadius = data.radius * 0.15;
        const spotGeometry = new THREE.SphereGeometry(data.radius * 1.001, 32, 16, 
            Math.PI * 0.2, Math.PI * 0.3, // Limit to a section
            Math.PI * 0.4, Math.PI * 0.2  // Limit vertically
        );
        const spotMaterial = new THREE.MeshPhongMaterial({
            color: 0xCD5C5C,
            emissive: 0x8B3626,
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        const redSpot = new THREE.Mesh(spotGeometry, spotMaterial);
        redSpot.rotation.y = Math.PI * 0.3; // Position on Jupiter
        lod.getObjectForDistance(0).add(redSpot); // Add to high detail mesh
        planetObject.redSpot = redSpot;
    }
    
    if (data.name === "Saturn") {
        // Add hexagonal storm at north pole
        const hexRadius = data.radius * 0.2;
        const hexShape = new THREE.Shape();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = Math.cos(angle) * hexRadius;
            const y = Math.sin(angle) * hexRadius;
            if (i === 0) hexShape.moveTo(x, y);
            else hexShape.lineTo(x, y);
        }
        hexShape.closePath();
        
        const hexGeometry = new THREE.ShapeGeometry(hexShape);
        const hexMaterial = new THREE.MeshPhongMaterial({
            color: 0xE8C88C,
            emissive: 0xC4915C,
            emissiveIntensity: 0.1,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const hexStorm = new THREE.Mesh(hexGeometry, hexMaterial);
        hexStorm.position.y = data.radius * 0.95; // Position at north pole
        hexStorm.rotation.x = -Math.PI / 2; // Face upward
        lod.getObjectForDistance(0).add(hexStorm);
        planetObject.hexStorm = hexStorm;
    }
    
    if (data.name === "Earth" || data.name === "Mars") {
        // Add polar ice caps
        const iceCaps = new THREE.Group();
        
        // North pole ice cap
        const northCapGeometry = new THREE.SphereGeometry(
            data.radius * 1.001, 32, 16,
            0, Math.PI * 2,
            0, Math.PI * 0.15  // Top section
        );
        const iceCapMaterial = new THREE.MeshPhongMaterial({
            color: data.name === "Earth" ? 0xFFFFFF : 0xF0E6DC,
            emissive: 0xEEEEEE,
            emissiveIntensity: 0.05,
            shininess: 80,
            transparent: true,
            opacity: data.name === "Earth" ? 0.9 : 0.8,
            side: THREE.DoubleSide
        });
        const northCap = new THREE.Mesh(northCapGeometry, iceCapMaterial);
        iceCaps.add(northCap);
        
        // South pole ice cap
        const southCapGeometry = new THREE.SphereGeometry(
            data.radius * 1.001, 32, 16,
            0, Math.PI * 2,
            Math.PI * 0.85, Math.PI * 0.15  // Bottom section
        );
        const southCap = new THREE.Mesh(southCapGeometry, iceCapMaterial);
        iceCaps.add(southCap);
        
        lod.getObjectForDistance(0).add(iceCaps);
        planetObject.iceCaps = iceCaps;
    }
    
    if (data.name === "Neptune") {
        // Add Great Dark Spot
        const darkSpotGeometry = new THREE.SphereGeometry(data.radius * 1.001, 16, 16,
            Math.PI * 0.5, Math.PI * 0.2, // Horizontal section
            Math.PI * 0.45, Math.PI * 0.1  // Vertical section
        );
        const darkSpotMaterial = new THREE.MeshPhongMaterial({
            color: 0x1E3A8A,
            emissive: 0x000033,
            emissiveIntensity: 0.1,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const darkSpot = new THREE.Mesh(darkSpotGeometry, darkSpotMaterial);
        darkSpot.rotation.y = Math.PI * 0.6;
        lod.getObjectForDistance(0).add(darkSpot);
        planetObject.darkSpot = darkSpot;
    }
    
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
            
            // Create ring material with simple texture
            const ringCanvas = document.createElement('canvas');
            ringCanvas.width = 256;
            ringCanvas.height = 16;
            const ringCtx = ringCanvas.getContext('2d');
            
            // Create gradient for ring texture
            const ringGrad = ringCtx.createLinearGradient(0, 0, ringCanvas.width, 0);
            const baseColorHex = '#' + ring.color.toString(16).padStart(6, '0');
            ringGrad.addColorStop(0, baseColorHex + '80');
            ringGrad.addColorStop(0.3, baseColorHex + 'CC');
            ringGrad.addColorStop(0.5, baseColorHex + 'FF');
            ringGrad.addColorStop(0.7, baseColorHex + 'CC');
            ringGrad.addColorStop(1, baseColorHex + '80');
            
            ringCtx.fillStyle = ringGrad;
            ringCtx.fillRect(0, 0, ringCanvas.width, ringCanvas.height);
            
            // Add some noise
            for(let i = 0; i < 100; i++) {
                ringCtx.fillStyle = `rgba(255,255,255,${Math.random() * 0.1})`;
                ringCtx.fillRect(Math.random() * ringCanvas.width, Math.random() * ringCanvas.height, 1, 1);
            }
            
            const ringTexture = new THREE.CanvasTexture(ringCanvas);
            ringTexture.needsUpdate = true;
            
            const ringMaterial = new THREE.MeshPhongMaterial({
                map: ringTexture,
                color: ring.color,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: ring.opacity,
                shininess: 50,
                specular: 0x222222,
                emissive: ring.color,
                emissiveIntensity: 0.05,
                depthWrite: false
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
    
    // Add moons if planet has them
    if (data.moons && data.moons.length > 0) {
        planetObject.moons = [];
        data.moons.forEach((moonData, moonIndex) => {
            const moonGroup = new THREE.Group();
            
            // Create moon sphere
            const moonGeometry = new THREE.SphereGeometry(moonData.radius, 16, 16);
            const moonTexture = createMoonTexture(moonData.name);
            const moonMaterial = new THREE.MeshPhongMaterial({
                map: moonTexture,
                shininess: 5,
                emissive: 0x111111,
                emissiveIntensity: 0.05
            });
            const moon = new THREE.Mesh(moonGeometry, moonMaterial);
            moonGroup.add(moon);
            
            // Create moon label
            const moonLabel = document.createElement('div');
            moonLabel.className = 'planet-label';
            moonLabel.textContent = moonData.name;
            moonLabel.style.fontSize = '10px';
            moonLabel.style.color = '#cccccc';
            document.body.appendChild(moonLabel);
            
            // Store moon data
            const moonObject = {
                mesh: moon,
                group: moonGroup,
                data: moonData,
                label: moonLabel,
                angle: Math.random() * Math.PI * 2
            };
            
            planetObject.moons.push(moonObject);
            scene.add(moonGroup);
        });
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
    
    // Update moon positions
    if (planet.moons) {
        planet.moons.forEach((moon) => {
            moon.group.position.copy(planet.mesh.position);
        });
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
        
        // Update moon labels
        if (planet.moons) {
            planet.moons.forEach(moon => {
                if (moon.label) {
                    const moonWorldPos = new THREE.Vector3();
                    moon.mesh.getWorldPosition(moonWorldPos);
                    moonWorldPos.y += moon.data.radius + 5;
                    moonWorldPos.project(camera);
                    
                    const x = (moonWorldPos.x * 0.5 + 0.5) * window.innerWidth;
                    const y = (-moonWorldPos.y * 0.5 + 0.5) * window.innerHeight;
                    
                    moon.label.style.left = x + 'px';
                    moon.label.style.top = y + 'px';
                    moon.label.style.display = moonWorldPos.z < 1 ? 'block' : 'none';
                }
            });
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
        sun.rotation.y += 0.001;
    }
    
    if (sunGlow1) {
        sunGlow1.position.copy(sunPosition);
        // Animate glow with pulsing effect
        const glowScale = 1 + Math.sin(elapsedTime * 2) * 0.05;
        sunGlow1.scale.set(glowScale, glowScale, glowScale);
    }
    
    if (sunGlow2) {
        sunGlow2.position.copy(sunPosition);
        const glowScale2 = 1 + Math.sin(elapsedTime * 1.5) * 0.03;
        sunGlow2.scale.set(glowScale2, glowScale2, glowScale2);
    }
    
    if (sunGlow3) {
        sunGlow3.position.copy(sunPosition);
        const glowScale3 = 1 + Math.sin(elapsedTime * 1) * 0.02;
        sunGlow3.scale.set(glowScale3, glowScale3, glowScale3);
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
        
        // Flare material doesn't need time update anymore
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
    
    // Animate Milky Way
    const milkyWay = scene.getObjectByName('milkyWay');
    if (milkyWay && milkyWay.material.uniforms) {
        milkyWay.material.uniforms.time.value = elapsedTime;
        milkyWay.rotation.z += 0.00005; // Very slow rotation
    }
    
    // Animate Milky Way planes
    scene.traverse((child) => {
        if (child.userData.isMilkyWayPlane && child.material.uniforms) {
            child.material.uniforms.time.value = elapsedTime;
        }
    });
    
    // Animate planets
    planets.forEach(planet => {
        // Orbital motion
        planet.angle += planet.data.speed * deltaTime;
        updatePlanetPosition(planet);
        
        // Rotation
        planet.mesh.rotation.y += planet.data.rotationSpeed;
        
        // Special animations for planetary features
        if (planet.data.name === "Jupiter" && planet.redSpot) {
            // Animate Great Red Spot
            planet.redSpot.rotation.y += 0.001; // Slow drift
            const spotScale = 1 + Math.sin(elapsedTime * 0.5) * 0.1;
            planet.redSpot.scale.set(spotScale, 1, spotScale);
        }
        
        if (planet.data.name === "Saturn" && planet.hexStorm) {
            // Rotate hexagonal storm
            planet.hexStorm.rotation.z += 0.0005;
        }
        
        if (planet.data.name === "Neptune" && planet.darkSpot) {
            // Drift dark spot
            planet.darkSpot.rotation.y += 0.0008;
        }
        
        if (planet.clouds) {
            planet.clouds.rotation.y += 0.001;
        }
        
        if (planet.rings) {
            // Animate ring rotation
            planet.rings.rotation.z += 0.0002;
        }
        
        // Animate moons
        if (planet.moons) {
            planet.moons.forEach(moon => {
                // Update moon orbital angle
                moon.angle += moon.data.speed * deltaTime;
                
                // Calculate moon position relative to planet
                const moonX = moon.data.distance * Math.cos(moon.angle);
                const moonZ = moon.data.distance * Math.sin(moon.angle);
                
                moon.mesh.position.set(moonX, 0, moonZ);
                
                // Rotate moon on its axis
                moon.mesh.rotation.y += 0.01;
            });
        }
    });
    
    // Update labels
    updateLabels();
    
    // Render the scene
    renderer.render(scene, camera);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
