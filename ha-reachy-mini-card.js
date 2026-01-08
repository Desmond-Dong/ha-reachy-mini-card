// Reachy Mini 3D Card - Direct Daemon Connection
// Version: 2.0.0
// https://github.com/Desmond-Dong/ha-reachy-mini-card

(function () {
  'use strict';

  // Reachy Mini 3D Card - Direct Daemon Connection
  // Version: 2.0.0
  // https://github.com/Desmond-Dong/ha-reachy-mini-card

  (function () {

    // 注册 custom card
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: 'reachy-mini-3d-card',
    name: 'Reachy Mini 3D Card',
    description: 'Real-time 3D visualization of Reachy Mini robot',
    documentationURL: 'https://github.com/Desmond-Dong/ha-reachy-mini-card'
  });

  class ReachyMini3DCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    static get getConfigElement() {
      return document.createElement('reachy-mini-3d-card-editor');
    }

    static getStubConfig() {
      return {
        daemon_host: 'localhost',
        daemon_port: 3333,
        height: 400
      };
    }

    setConfig(config) {
      this._config = {
        daemon_host: 'localhost',
        daemon_port: 3333,
        height: 400,
        ...config
      };
    }

    getCardSize() {
      return this._config.height ? this._config.height / 50 : 8;
    }

    async connectedCallback() {
      this.render();
      await this.init();
    }

    render() {
      this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          overflow: hidden;
          border-radius: var(--ha-card-border-radius, 12px);
          box-shadow: var(--ha-card-box-shadow, none);
        }
        #container {
          position: relative;
          width: 100%;
          height: ${this._config.height}px;
        }
        #status {
          position: absolute;
          top: 10px;
          left: 10px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          color: white;
          z-index: 10;
        }
        .connected { background: #4caf50; }
        .connecting { background: #ff9800; }
        .error { background: #f44336; }
        .loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
      </style>
      <ha-card>
        <div id="container">
          <div id="status" class="connecting">Connecting...</div>
          <div id="loading" class="loading">
            <ha-circular-progress indeterminate></ha-circular-progress>
          </div>
        </div>
      </ha-card>
    `;
    }

    async init() {
      try {
        // 加载依赖
        await this.loadScripts();

        // 初始化 Three.js
        this.initThreeJS();

        // 连接 WebSocket
        this.connectWebSocket();

        // 加载机器人模型
        this.loadRobot();

      } catch (err) {
        console.error('Init error:', err);
        this.showError(err.message);
      }
    }

    async loadScripts() {
      // Three.js 和 URDFLoader 会通过 ES module 动态导入
      // 不需要预先加载任何脚本
    }

    async initThreeJS() {
      const container = this.shadowRoot.querySelector('#container');
      const canvas = document.createElement('canvas');
      container.appendChild(canvas);

      // 动态导入 Three.js 和依赖
      const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
      const { OrbitControls } = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js');

      // 场景
      this._scene = new THREE.Scene();
      this._scene.background = new THREE.Color(0xf5f5f5);

      // 相机
      this._camera = new THREE.PerspectiveCamera(50, container.clientWidth / this._config.height, 0.01, 1000);
      this._camera.position.set(0.3, 0.3, 0.5);

      // 渲染器
      this._renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      this._renderer.setSize(container.clientWidth, this._config.height);
      this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // 控制器
      this._controls = new OrbitControls(this._camera, canvas);
      this._controls.enableDamping = true;
      this._controls.minDistance = 0.2;
      this._controls.maxDistance = 1.0;

      // 灯光
      this._scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const light = new THREE.DirectionalLight(0xffffff, 0.8);
      light.position.set(1, 1, 1);
      this._scene.add(light);

      // 地面网格
      this._scene.add(new THREE.GridHelper(0.4, 20, 0x888888, 0xcccccc));

      // 动画循环
      const animate = () => {
        requestAnimationFrame(animate);
        this._controls.update();
        this._renderer.render(this._scene, this._camera);
      };
      animate();
    }

    async loadRobot() {
      const basePath = this.getBasePath();
      const { default: URDFLoader } = await import(`${basePath}lib/urdf-loader.js`);

      const loader = new URDFLoader();
      loader.workingPath = `${basePath}assets/`;

      this._robot = await loader.load(`${basePath}assets/reachy-mini.urdf`);
      this._scene.add(this._robot);

      // 隐藏加载动画
      const loading = this.shadowRoot.querySelector('#loading');
      if (loading) loading.style.display = 'none';
    }

    getBasePath() {
      const scripts = document.getElementsByTagName('script');
      const src = scripts[scripts.length - 1]?.src || '';
      return src ? src.substring(0, src.lastIndexOf('/') + 1) : '/hacsfiles/ha-reachy-mini-card/';
    }

    connectWebSocket() {
      const { daemon_host, daemon_port } = this._config;
      const url = `ws://${daemon_host}:${daemon_port}/api/state/ws/full?frequency=20&with_head_joints=true&with_antenna_positions=true`;

      this._ws = new WebSocket(url);

      this._ws.onopen = () => {
        this.updateStatus('connected', 'Connected');
      };

      this._ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          this.updateRobot(data);
        } catch (err) {
          console.error('Parse error:', err);
        }
      };

      this._ws.onerror = () => this.updateStatus('error', 'Error');
      this._ws.onclose = () => {
        this.updateStatus('error', 'Disconnected');
        setTimeout(() => this.connectWebSocket(), 3000);
      };
    }

    updateRobot(data) {
      if (!this._robot) return;

      if (data.head_joints?.length === 7) {
        const j = data.head_joints;
        this._robot.setJointValue('yaw_body', j[0]);
        this._robot.setJointValue('stewart_1', j[1]);
        this._robot.setJointValue('stewart_2', j[2]);
        this._robot.setJointValue('stewart_3', j[3]);
        this._robot.setJointValue('stewart_4', j[4]);
        this._robot.setJointValue('stewart_5', j[5]);
        this._robot.setJointValue('stewart_6', j[6]);
      }

      if (data.antennas_position?.length === 2) {
        this._robot.setJointValue('left_antenna', -data.antennas_position[0]);
        this._robot.setJointValue('right_antenna', -data.antennas_position[1]);
      }
    }

    updateStatus(state, msg) {
      const el = this.shadowRoot.querySelector('#status');
      if (el) {
        el.className = state;
        el.textContent = msg;
      }
    }

    showError(msg) {
      this.shadowRoot.querySelector('#container').innerHTML = `
      <div style="padding: 20px; color: #f44336;">Error: ${msg}</div>
    `;
    }

    disconnectedCallback() {
      if (this._ws) this._ws.close();
      if (this._renderer) this._renderer.dispose();
    }
  }

  customElements.define('reachy-mini-3d-card', ReachyMini3DCard);

  // 图形化配置编辑器
  class ReachyMini3DCardEditor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    setConfig(config) {
      this._config = config;
      this.render();
    }

    render() {
      const config = this._config || {};

      this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .form-row {
          display: flex;
          flex-direction: column;
          margin-bottom: 12px;
        }
        label {
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 4px;
          color: var(--primary-text-color);
        }
        input {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--primary-color);
          border-radius: 4px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          box-sizing: border-box;
        }
        input:focus {
          outline: none;
          border-color: var(--accent-color);
        }
        .hint {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-top: 4px;
        }
      </style>
      <div class="form-row">
        <label for="host">Daemon Host</label>
        <input
          id="host"
          type="text"
          value="${config.daemon_host || 'localhost'}"
          placeholder="localhost or IP address"
        />
        <div class="hint">Reachy Mini daemon hostname or IP address</div>
      </div>
      <div class="form-row">
        <label for="port">Daemon Port</label>
        <input
          id="port"
          type="number"
          value="${config.daemon_port || 3333}"
          placeholder="3333"
        />
        <div class="hint">WebSocket port (default: 3333)</div>
      </div>
      <div class="form-row">
        <label for="height">Card Height (px)</label>
        <input
          id="height"
          type="number"
          value="${config.height || 400}"
          placeholder="400"
        />
        <div class="hint">Height of the card in pixels</div>
      </div>
    `;

      // 监听输入变化
      this.shadowRoot.getElementById('host').addEventListener('change', (e) => {
        this._config = { ...this._config, daemon_host: e.target.value };
        this.dispatchConfig();
      });

      this.shadowRoot.getElementById('port').addEventListener('change', (e) => {
        this._config = { ...this._config, daemon_port: parseInt(e.target.value) };
        this.dispatchConfig();
      });

      this.shadowRoot.getElementById('height').addEventListener('change', (e) => {
        this._config = { ...this._config, height: parseInt(e.target.value) };
        this.dispatchConfig();
      });
    }

    dispatchConfig() {
      const event = new CustomEvent('config-changed', {
        detail: { config: this._config },
        bubbles: true,
        composed: true
      });
      this.dispatchEvent(event);
    }
  }

  customElements.define('reachy-mini-3d-card-editor', ReachyMini3DCardEditor);

  })();

})();
//# sourceMappingURL=ha-reachy-mini-card.js.map
