/**
 * file: lukairo-engine-live-clean/src/scripts/neural-core.js
 * Procedural Neural Core version.
 * This avoids the broken globe texture mapping and renders a stable final scene.
 */

(function (window) {
  "use strict";

  const defaultConfig = {
    containerId: "neural-core-container",
    starfield: {
      count: 1200,
      radius: 50,
    },
    camera: {
      fov: 45,
      near: 0.1,
      far: 1000,
      position: { x: 0, y: 0, z: 7 },
    },
    scene: {
      fogColor: 0x090c11,
      fogNear: 10,
      fogFar: 60,
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
      this.animationId = null;
      this.isPageVisible = true;
      this.isInitialized = false;

      this.coreGroup = null;
      this.starfield = null;
      this.objects = [];

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
        return;
      }

      if (!window.THREE) {
        console.error("Three.js not loaded.");
        this.showFallback();
        return;
      }

      if (!this.checkWebGLSupport()) {
        this.showFallback();
        return;
      }

      try {
        this.initScene();
        this.setupEventListeners();
        this.animate();
        this.isInitialized = true;
        this.hideLoading();
      } catch (error) {
        console.error("Failed to initialize Neural Core:", error);
        this.showFallback();
      }
    }

    initScene() {
      const container = document.getElementById(this.config.containerId);
      if (!container) {
        throw new Error(`Container element #${this.config.containerId} not found`);
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

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
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
      this.createCore();
    }

    getViewportSize() {
      if (!this.container) {
        return { width: window.innerWidth || 1, height: window.innerHeight || 1 };
      }

      const width = this.container.clientWidth || window.innerWidth || 1;
      const height = this.container.clientHeight || window.innerHeight || 1;

      return {
        width: Math.max(width, 1),
        height: Math.max(height, 1),
      };
    }

    setupLighting() {
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
      this.scene.add(ambientLight);

      const pointLight1 = new THREE.PointLight(0x6cead9, 1.5, 100);
      pointLight1.position.set(5, 5, 6);
      this.scene.add(pointLight1);

      const pointLight2 = new THREE.PointLight(0x8ab4f8, 1.0, 100);
      pointLight2.position.set(-5, -4, 6);
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
        size: 0.045,
        transparent: true,
        opacity: 0.5,
      });

      this.starfield = new THREE.Points(geometry, material);
      this.scene.add(this.starfield);
    }

    createCore() {
      this.coreGroup = new THREE.Group();
      this.scene.add(this.coreGroup);

      const outerSphere = new THREE.Mesh(
        new THREE.SphereGeometry(2.2, 96, 96),
        new THREE.MeshPhongMaterial({
          color: 0x14313b,
          transparent: true,
          opacity: 0.22,
          side: THREE.FrontSide,
          shininess: 60,
          emissive: 0x0a1b20,
          emissiveIntensity: 0.5,
        })
      );
      this.coreGroup.add(outerSphere);
      this.objects.push(outerSphere);

      const innerSphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.25, 64, 64),
        new THREE.MeshPhongMaterial({
          color: 0x223547,
          transparent: true,
          opacity: 0.32,
          side: THREE.FrontSide,
          emissive: 0x14293a,
          emissiveIntensity: 0.65,
        })
      );
      this.coreGroup.add(innerSphere);
      this.objects.push(innerSphere);

      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.35, 0.018, 24, 128),
        new THREE.MeshBasicMaterial({
          color: 0x6cead9,
          transparent: true,
          opacity: 0.95,
        })
      );
      halo.rotation.x = Math.PI / 2;
      this.coreGroup.add(halo);
      this.objects.push(halo);

      const equatorRing = this.createRing(2.0, 0x7cf3e6, 0.9);
      equatorRing.rotation.x = Math.PI * 0.5;
      this.coreGroup.add(equatorRing);

      const ringA = this.createRing(1.78, 0x7ed8ff, 0.6);
      ringA.rotation.x = 0.95;
      ringA.rotation.y = 0.3;
      this.coreGroup.add(ringA);

      const ringB = this.createRing(1.6, 0x6cead9, 0.55);
      ringB.rotation.x = 2.2;
      ringB.rotation.z = 0.4;
      this.coreGroup.add(ringB);

      const ringC = this.createRing(1.36, 0x8ab4f8, 0.45);
      ringC.rotation.y = 1.1;
      ringC.rotation.z = 1.2;
      this.coreGroup.add(ringC);

      const nodes = this.createNodes(10, 1.55);
      nodes.forEach((node) => {
        this.coreGroup.add(node);
        this.objects.push(node);
      });

      this.objects.push(equatorRing, ringA, ringB, ringC);
    }

    createRing(radius, color, opacity) {
      return new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.015, 16, 220),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
        })
      );
    }

    createNodes(count, radius) {
      const nodes = [];

      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2;
        const y = Math.sin(angle * 1.7) * 0.7;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        const node = new THREE.Mesh(
          new THREE.SphereGeometry(0.07, 20, 20),
          new THREE.MeshBasicMaterial({
            color: 0x6cead9,
            transparent: true,
            opacity: 0.9,
          })
        );

        node.position.set(x, y, z);
        nodes.push(node);
      }

      return nodes;
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
    }

    handleContextRestored() {
      this.disposeSceneObjects();
      this.isInitialized = false;
      this.init();
    }

    animate() {
      this.animationId = requestAnimationFrame(() => this.animate());

      if (!this.isPageVisible || !this.renderer || !this.scene || !this.camera) {
        return;
      }

      if (this.coreGroup) {
        this.coreGroup.rotation.y += 0.0025;
        this.coreGroup.rotation.x += 0.0007;
      }

      if (this.objects[2]) {
        this.objects[2].rotation.z += 0.025;
      }

      if (this.objects[3]) {
        this.objects[3].rotation.z += 0.003;
      }

      if (this.objects[4]) {
        this.objects[4].rotation.y -= 0.004;
      }

      if (this.objects[5]) {
        this.objects[5].rotation.x += 0.005;
      }

      if (this.starfield) {
        this.starfield.rotation.y += 0.00012;
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
      this.objects.forEach((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }

        if (object.material) {
          object.material.dispose();
        }

        if (this.scene && object.parent) {
          object.parent.remove(object);
        }
      });

      this.objects = [];

      if (this.coreGroup) {
        this.scene.remove(this.coreGroup);
        this.coreGroup = null;
      }

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

        if (this.container && this.renderer.domElement.parentNode === this.container) {
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
})(window);
