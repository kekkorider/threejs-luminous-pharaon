import { Scene } from 'three/src/scenes/Scene'
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer'
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera'
import { Color } from 'three/src/math/Color'
import { Vector2 } from 'three/src/math/Vector2'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Points } from 'three/src/objects/Points'
import { ShaderMaterial } from 'three/src/materials/ShaderMaterial'
import { Clock } from 'three/src/core/Clock'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'

import Tweakpane from 'tweakpane'

const vertexShader = require('./shaders/vertex.glsl')
const fragmentShader = require('./shaders/fragment.glsl')

class App {
  constructor(container) {
    this.container = document.querySelector(container)

    this.config = {
      color_1: [107, 17, 210],
      color_2: [53, 191, 210],
      bloomPass: {
        threshold: 0.1,
        strength: 0.7,
        radius: 0.5
      }
    }

    this._resizeCb = () => this._onResize()
  }

  init() {
    this._createScene()
    this._createCamera()
    this._createRenderer()
    // this._createControls()
    this._createClock()
    this._createPostProcess()
    this._addListeners()

    this._createDebugPanel()

    this._loadModel().then(() => {
      this.renderer.setAnimationLoop(() => {
        this._update()
        this._render()
      })
    })
  }

  destroy() {
    this.renderer.dispose()
    this._removeListeners()
  }

  _update() {
    this.points.material.uniforms.u_time.value = this.clock.getElapsedTime()
    this.points.material.uniformsNeedUpdate = true
  }

  _render() {
    this.composer.render(this.scene, this.camera)
  }

  _createScene() {
    this.scene = new Scene()
  }

  _createCamera() {
    this.camera = new PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 100)
    this.camera.position.set(0, 1, 20)
  }

  _createRenderer() {
    this.renderer = new WebGLRenderer({
      alpha: true,
      antialias: true
    })

    this.container.appendChild(this.renderer.domElement)

    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio))
    this.renderer.setClearColor(0x121212)
    this.renderer.gammaOutput = true
    this.renderer.physicallyCorrectLights = true
  }

  _loadModel() {
    return new Promise(resolve => {
      this.loader = new GLTFLoader()

      const dracoLoader = new DRACOLoader()
      dracoLoader.setDecoderPath('/')

      this.loader.setDRACOLoader(dracoLoader)

      this.loader.load('./king.glb', gltf => {
        console.log(gltf.scene)
        this.mesh = gltf.scene.children[0]

        const material = new ShaderMaterial({
          vertexShader,
          fragmentShader,
          transparent: true,
          blending: 1, // THREE.NormalBlending,
          uniforms: {
            u_time: { type: 'f', value: 0 },
            u_color_1: { type: 'vec3', value: new Color().setRGB(this.config.color_1[0] / 255, this.config.color_1[1] / 255, this.config.color_1[2] / 255) },
            u_color_2: { type: 'vec3', value: new Color().setRGB(this.config.color_2[0] / 255, this.config.color_2[1] / 255, this.config.color_2[2] / 255) }
          }
        })

        this.points = new Points(this.mesh.geometry, material)

        this.scene.add(this.points)

        resolve()
      })
    })
  }

  _createControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
  }

  _createClock() {
    this.clock = new Clock()
  }

  _createDebugPanel() {
    this.pane = new Tweakpane()

    /**
     * Scene configuration
     */
    const sceneFolder = this.pane.addFolder({ title: 'Scene' })

    let params = { background: { r: 18, g: 18, b: 18 } }

    sceneFolder.addInput(params, 'background', { label: 'Background Color' }).on('change', value => {
      this.renderer.setClearColor(new Color().setRGB(value.r / 255, value.g / 255, value.b / 255))
    })

    /**
     * Colors configuration
     */
    const colorsFolder = this.pane.addFolder({ title: 'Colors' })

    params = {
      color_1: { r: this.config.color_1[0], g: this.config.color_1[1], b: this.config.color_1[2] },
      color_2: { r: this.config.color_2[0], g: this.config.color_2[1], b: this.config.color_2[2] }
    }

    colorsFolder.addInput(params, 'color_1', { label: 'Color 1' }).on('change', value => {
      this.points.material.uniforms.u_color_1.value = new Color().setRGB(value.r / 255, value.g / 255, value.b / 255)
      this.points.material.uniformsNeedUpdate = true
    })

    colorsFolder.addInput(params, 'color_2', { label: 'Color 2' }).on('change', value => {
      this.points.material.uniforms.u_color_2.value = new Color().setRGB(value.r / 255, value.g / 255, value.b / 255)
      this.points.material.uniformsNeedUpdate = true
    })

    /**
     * Bloom
     */
    const bloomFolder = this.pane.addFolder({ title: 'Bloom' })

    params = {
      threshold: this.config.bloomPass.threshold,
      strength: this.config.bloomPass.strength,
      radius: this.config.bloomPass.radius
    }

    bloomFolder.addInput(params, 'threshold', { label: 'Threshold', min: 0.1, max: 0.5 }).on('change', value => {
      this.bloomPass.threshold = value
    })

    bloomFolder.addInput(params, 'strength', { label: 'Strength', min: 0, max: 1 }).on('change', value => {
      this.bloomPass.strength = value
    })

    bloomFolder.addInput(params, 'radius', { label: 'Radius', min: 0, max: 1 }).on('change', value => {
      this.bloomPass.radius = value
    })
  }

  _createPostProcess() {
    const renderPass = new RenderPass(this.scene, this.camera)

    this.bloomPass = new UnrealBloomPass(
      new Vector2(this.container.clientWidth, this.container.clientHeight),
      this.config.bloomPass.strength,
      this.config.bloomPass.radius,
      this.config.bloomPass.threshold
    )

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(renderPass)
    this.composer.addPass(this.bloomPass)
  }

  _addListeners() {
    window.addEventListener('resize', this._resizeCb, { passive: true })
  }

  _removeListeners() {
    window.removeEventListener('resize', this._resizeCb, { passive: true })
  }

  _onResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.composer.setSize(this.container.clientWidth, this.container.clientHeight)
  }
}

const app = new App('#app')
app.init()
