(function (window) {
  "use strict";

  class NeuralCore {
    constructor(userConfig = {}) {
      this.config = {
        containerId: "neural-core-container",
        ...userConfig,
      };
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.container = null;
      this.animationId = null;
      this.coreGroup = null;
      this.starfield = null;
      this.halo = null;
      this.equatorRing = null;
      this.ringA = null;
      this.ringB = null;
    }

    init() {
      if (!window.THREE) {
        throw new Error("Three.js not loaded");
      }

      this.container = document.getElementById(this.config.containerId);
      if (!this.container) {
        throw new Error(`Container #${this.config.containerId} not found`);
      }

      const width = this.container.clientWidth || window.innerWidth || 1;
      const height = this.container.clientHeight || window.innerHeight || 1;

      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.Fog(0x090c11, 10, 60);

      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      this.camera.position.set(0, 0, 7);

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setClearColor(0x090c11, 1);
      this.container.appendChild(this.renderer.domElement);

      this.setupLights();
      this.createStarfield();
      this.createCore();
      this.hideLoading();

      window.addEventListener("resize", () => this.onResize(), false);
      this.animate();
    }

    setupLights() {
      const ambient = new THREE.AmbientLight(0xffffff, 0.55);
      this.scene.add(ambient);

      const point1 = new THREE.PointLight(0x6cead9, 1.5, 100);
      point1.position.set(5, 5, 6);
      this.scene.add(point1);

      const point2 = new THREE.PointLight(0x8ab4f8, 1.0, 100);
      point2.position.set(-5, -4, 6);
      this.scene.add(point2);
    }

    createStarfield() {
      const geometry = new THREE.BufferGeometry();
      const vertices = [];

      for (let i = 0; i < 1200; i += 1) {
        const radius = 50;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);

        vertices.push(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi)
        );
      }

      geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));

      const material = new THREE.PointsMaterial({
        color: 0x6cead9,
        size: 0.045,
        transparent: true,
        opacity: 0.5,
      });

      this.starfield = new THREE.Points(geometry, material);
      this.scene.add(this.starfield);
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

      this.halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.35, 0.018, 24, 128),
        new THREE.MeshBasicMaterial({
          color: 0x6cead9,
          transparent: true,
          opacity: 0.95,
        })
      );
      this.halo.rotation.x = Math.PI / 2;
      this.coreGroup.add(this.halo);

      this.equatorRing = this.createRing(2.0, 0x7cf3e6, 0.9);
      this.equatorRing.rotation.x = Math.PI * 0.5;
      this.coreGroup.add(this.equatorRing);

      this.ringA = this.createRing(1.78, 0x7ed8ff, 0.6);
      this.ringA.rotation.x = 0.95;
      this.ringA.rotation.y = 0.3;
      this.coreGroup.add(this.ringA);

      this.ringB = this.createRing(1.6, 0x6cead9, 0.55);
      this.ringB.rotation.x = 2.2;
      this.ringB.rotation.z = 0.4;
      this.coreGroup.add(this.ringB);

      const ringC = this.createRing(1.36, 0x8ab4f8, 0.45);
      ringC.rotation.y = 1.1;
      ringC.rotation.z = 1.2;
      this.coreGroup.add(ringC);

      this.createNodes(10, 1.55).forEach((node) => this.coreGroup.add(node));
    }

    hideLoading() {
      const overlay = document.getElementById("loading-overlay");
      if (!overlay) return;
      overlay.classList.add("hidden");
      window.setTimeout(() => {
        overlay.style.display = "none";
      }, 500);
    }

    onResize() {
      if (!this.camera || !this.renderer || !this.container) return;
      const width = this.container.clientWidth || window.innerWidth || 1;
      const height = this.container.clientHeight || window.innerHeight || 1;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }

    animate() {
      this.animationId = requestAnimationFrame(() => this.animate());

      if (!this.renderer || !this.scene || !this.camera) return;

      if (this.coreGroup) {
        this.coreGroup.rotation.y += 0.0025;
        this.coreGroup.rotation.x += 0.0007;
      }

      if (this.halo) this.halo.rotation.z += 0.025;
      if (this.equatorRing) this.equatorRing.rotation.z += 0.003;
      if (this.ringA) this.ringA.rotation.y -= 0.004;
      if (this.ringB) this.ringB.rotation.x += 0.005;
      if (this.starfield) this.starfield.rotation.y += 0.00012;

      this.renderer.render(this.scene, this.camera);
    }
  }

  window.NeuralCore = NeuralCore;
})(window);
