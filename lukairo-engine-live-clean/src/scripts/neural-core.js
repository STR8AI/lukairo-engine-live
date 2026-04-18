/**
 * file: lukairo-engine-live-clean/src/scripts/neural-core.js
 * LUKAIRO Neural Core - Three.js Visualization Module
 */

(function (window) {
  "use strict";

  const defaultConfig = {
    containerId: "neural-core-container",
    texturePath: "./images/",
    textures: {
      gears: "lukairo_gears.png",
      circuits: "lukairo_circuits.png",
      globe: "lukairo_globe.png",
    },
    layers: {
      gears: { radius: 1, speed: 0.003, reverse: false },
      circuits: { radius: 1.5, speed: 0.002, reverse: true },
      globe: { radius: 2, speed: 0.001, reverse: false },
    },
    starfield: {
      count: 1200,
      radius: 50,
    },
    camera: {
      fov: 45,
      near: 0.1,
      far: 1000,
      position: { x: 0, y: 0, z: 6 },
    },
    scene: {
      fogColor: 0x090c11,
      fogNear: 10,
      fogFar: 50,
      clearColor: 0x090c11,
    },
  };

  class NeuralCore {
    constructor(userConfig = {}) {
      this.config = this.mergeConfig(defaultConfig, userConfig);
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.container = null;
      this.layers = {};
      this.starfield = null;
      this.animationId = null;
      this.isPageVisible = true;
      this.isInitialized = false;

      this.boundHandlers = {
        contextLost: null,
        contextRestored: null,
        resize: null,
        visibilityChange: null,
      };
    }

    mergeConfig(baseConfig, userConfig) {
      return {
        ...baseConfig,
        ...userConfig,
        textures: {
          ...baseConfig.textures,
          ...(userConfig.textures || {}),
        },
        layers: {
          ...baseConfig.layers,
          ...(userConfig.layers || {}),
        },
        starfield: {
          ...baseConfig.starfield,
          ...(userConfig.starfield || {}),
        },
        camera: {
          ...baseConfig.camera,
          ...(userConfig.camera || {}),
          position: {
            ...baseConfig.camera.position,
            ...((userConfig.camera && userConfig.camera.position) || {}),
          },
        },
        scene: {
          ...baseConfig.scene,
          ...(userConfig.scene || {}),
        },
      };
    }

    checkWebGLSupport() {
      try {
        const canvas = document.createElement("canvas");
        const gl =
          canvas.getContext("webgl") ||
          canvas.getContext("experimental-webgl");
        return Boolean(gl);
      } catch (_error) {
        return false;
      }
    }

    init() {
      if (this.isInitialized) {
        console.warn("Neural Core already initialized");
        return;
      }

      if (!window.THREE) {
        console.error(
          "Three.js not loaded. Please include Three.js before initializing Neural Core."
        );
        this.showFallback();
        return;
      }

      if (!this.checkWebGLSupport()) {
        console.warn("WebGL not supported");
        this.showFallback();
        return;
      }

      try {
        this.initScene();
        this.setupEventListeners();
        this.animate();
        this.isInitialized = true;
      } catch (error) {
        console.error("Failed to initialize Neural Core:", error);
        this.showFallback();
      }
    }

    initScene() {
      const container = document.getElementById(this.config.containerId);
      if (!container) {
        throw new Error(
          `Container element #${this.config.containerId} not found`
        );
      }

      this.container = container;

      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.Fog(
        this.config.scene.fogColor,
        this.config.scene.fogNear,
        this.config.scene.fogFar
      );

      const { width, height } = this.getViewportSize();

      this.camera = new THREE.PerspectiveCamera(
        this.config.camera.fov,
        width / height,
        this.config.camera.near,
        this.config.camera.far
      );
      this.camera.position.set(
        this.config.camera.position.x,
        this.config.camera.position.y,
        this.config.camera.position.z
      );

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setClearColor(this.config.scene.clearColor, 1);
      container.appendChild(this.renderer.domElement);

      this.boundHandlers.contextLost = this.handleContextLost.bind(this);
      this.boundHandlers.contextRestored = this.handleContextRestored.bind(this);

      this.renderer.domElement.addEventListener(
        "webglcontextlost",
        this.boundHandlers.contextLost,
        false
      );
      this.renderer.domElement.addEventListener(
        "webglcontextrestored",
        this.boundHandlers.contextRestored,
        false
      );

      this.setupLighting();
      this.createStarfield();
      this.loadTextures();
    }

    getViewportSize() {
      if (!this.container) {
        return {
          width: window.innerWidth || 1,
          height: window.innerHeight || 1,
        };
      }

      const width = this.container.clientWidth || window.innerWidth || 1;
      const height = this.container.clientHeight || window.innerHeight || 1;

      return {
        width: Math.max(width, 1),
        height: Math.max(height, 1),
      };
    }

    setupLighting() {
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      this.scene.add(ambientLight);

      const pointLight1 = new THREE.PointLight(0x6cead9, 1, 100);
      pointLight1.position.set(5, 5, 5);
      this.scene.add(pointLight1);

      const pointLight2 = new THREE.PointLight(0x8ab4f8, 0.8, 100);
      pointLight2.position.set(-5, -5, 5);
      this.scene.add(pointLight2);
    }

    createStarfield() {
      const geometry = new THREE.BufferGeometry();
      const vertices = [];

      for (let i = 0; i < this.config.starfield.count; i += 1) {
        const radius = this.config.starfield.radius;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);

        vertices.push(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi)
        );
      }

      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
      );

      const material = new THREE.PointsMaterial({
        color: 0x6cead9,
        size: 0.05,
        transparent: true,
        opacity: 0.6,
      });

      this.starfield = new THREE.Points(geometry, material);
      this.scene.add(this.starfield);
    }

    loadTextures() {
      const loadingManager = new THREE.LoadingManager();
      const loader = new THREE.TextureLoader(loadingManager);
      const layerNames = Object.keys(this.config.layers);

      if (layerNames.length === 0) {
        this.hideLoading();
        return;
      }

      loadingManager.onLoad = () => {
        this.hideLoading();
      };

      loadingManager.onError = (url) => {
        console.warn("Texture loading failed:", url, "- using fallback");
      };

      layerNames.forEach((layerName) => {
        const textureFile = this.config.textures[layerName];
        const texturePath = `${this.config.texturePath}${textureFile || ""}`;

        if (!textureFile) {
          this.createLayer(layerName, null);
          return;
        }

        loader.load(
          texturePath,
          (texture) => {
            this.createLayer(layerName, texture);
          },
          undefined,
          () => {
            console.warn(
              `Failed to load ${layerName} texture, creating without texture`
            );
            this.createLayer(layerName, null);
          }
        );
      });
    }

    createLayer(name, texture) {
      const layerConfig = this.config.layers[name];
      const geometry = new THREE.SphereGeometry(layerConfig.radius, 64, 64);

      if (texture && name === "globe") {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.repeat.x = -1;
        texture.needsUpdate = true;
      }

      const material = new THREE.MeshPhongMaterial({
        map: texture || null,
        transparent: true,
        opacity: 0.7,
        side: THREE.FrontSide,
        wireframe: !texture,
      });

      const mesh = new THREE.Mesh(geometry, material);

      if (name === "globe") {
        mesh.rotation.y = Math.PI;
      }

      mesh.userData = {
        speed: layerConfig.speed,
        reverse: layerConfig.reverse,
      };

      this.layers[name] = mesh;
      this.scene.add(mesh);
    }

    hideLoading() {
      const overlay = document.getElementById("loading-overlay");
      if (!overlay) {
        return;
      }

      overlay.classList.add("hidden");
      window.setTimeout(() => {
        overlay.style.display = "none";
      }, 500);
    }

    showFallback() {
      const fallback = document.getElementById("fallback-message");
      if (fallback) {
        fallback.classList.add("active");
      }
      this.hideLoading();
    }

    handleContextLost(event) {
      event.preventDefault();
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      console.warn("WebGL context lost");
    }

    handleContextRestored() {
      console.log("WebGL context restored");
      this.disposeSceneObjects();
      this.isInitialized = false;
      this.init();
    }

    animate() {
      this.animationId = requestAnimationFrame(() => this.animate());

      if (!this.isPageVisible || !this.renderer || !this.scene || !this.camera) {
        return;
      }

      Object.keys(this.layers).forEach((layerName) => {
        const layer = this.layers[layerName];
        const direction = layer.userData.reverse ? -1 : 1;
        layer.rotation.y += layer.userData.speed * direction;
        layer.rotation.x += layer.userData.speed * 0.5 * direction;
      });

      if (this.starfield) {
        this.starfield.rotation.y += 0.0001;
      }

      this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
      if (!this.camera || !this.renderer) {
        return;
      }

      const { width, height } = this.getViewportSize();

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }

    handleVisibilityChange() {
      this.isPageVisible = !document.hidden;
    }

    setupEventListeners() {
      this.boundHandlers.resize = () => this.onWindowResize();
      this.boundHandlers.visibilityChange = () => this.handleVisibilityChange();

      window.addEventListener("resize", this.boundHandlers.resize, false);
      document.addEventListener(
        "visibilitychange",
        this.boundHandlers.visibilityChange,
        false
      );
    }

    disposeSceneObjects() {
      Object.values(this.layers).forEach((layer) => {
        if (layer.geometry) {
          layer.geometry.dispose();
        }

        if (layer.material) {
          if (layer.material.map) {
            layer.material.map.dispose();
          }
          layer.material.dispose();
        }

        if (this.scene) {
          this.scene.remove(layer);
        }
      });

      this.layers = {};

      if (this.starfield) {
        if (this.starfield.geometry) {
          this.starfield.geometry.dispose();
        }
        if (this.starfield.material) {
          this.starfield.material.dispose();
        }
        if (this.scene) {
          this.scene.remove(this.starfield);
        }
        this.starfield = null;
      }
    }

    dispose() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }

      if (this.boundHandlers.resize) {
        window.removeEventListener("resize", this.boundHandlers.resize, false);
      }

      if (this.boundHandlers.visibilityChange) {
        document.removeEventListener(
          "visibilitychange",
          this.boundHandlers.visibilityChange,
          false
        );
      }

      if (this.renderer && this.renderer.domElement) {
        if (this.boundHandlers.contextLost) {
          this.renderer.domElement.removeEventListener(
            "webglcontextlost",
            this.boundHandlers.contextLost,
            false
          );
        }

        if (this.boundHandlers.contextRestored) {
          this.renderer.domElement.removeEventListener(
            "webglcontextrestored",
            this.boundHandlers.contextRestored,
            false
          );
        }

        if (
          this.container &&
          this.renderer.domElement.parentNode === this.container
        ) {
          this.container.removeChild(this.renderer.domElement);
        }
      }

      this.disposeSceneObjects();

      if (this.renderer) {
        this.renderer.dispose();
      }

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.container = null;
      this.isInitialized = false;
    }
  }

  window.NeuralCore = NeuralCore;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }

  function autoInit() {
    const containers = document.querySelectorAll(
      "[data-neural-core-auto-init]"
    );

    containers.forEach((container) => {
      let config = { containerId: container.id };

      if (container.dataset.neuralCoreConfig) {
        try {
          config = JSON.parse(container.dataset.neuralCoreConfig);
        } catch (error) {
          console.warn("Invalid neural core config JSON:", error);
        }
      }

      if (!config.containerId) {
        config.containerId = container.id;
      }

      const core = new NeuralCore(config);
      core.init();
    });
  }
})(window);
