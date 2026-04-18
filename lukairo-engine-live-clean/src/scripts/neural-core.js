/**
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
        document.removeEventListener("visibilitychange", this.boundHandlers.visibilityChange, false);
      }

      if (this.renderer && this.renderer.domElement) {
        if (this.boundHandlers.contextLost) {
          this.renderer.domElement.removeEventListener("webglcontextlost", this.boundHandlers.contextLost, false);
        }

        if (this.boundHandlers.contextRestored) {
          this.renderer.domElement.removeEventListener("webglcontextrestored", this.boundHandlers.contextRestored, false);
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
