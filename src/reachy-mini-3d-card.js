// Reachy Mini 3D Card - Direct Daemon Connection
// Version: 2.0.0
// https://github.com/Desmond-Dong/ha-reachy-mini-card

(function () {
  'use strict';

  // 注册 custom card
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: 'reachy-mini-3d-card',
    name: 'Reachy Mini 3D Card',
    description: 'Real-time 3D visualization of Reachy Mini robot',
    documentationURL: 'https://github.com/Desmond-Dong/ha-reachy-mini-card'
  });

  // 被动关节名称常量
  const PASSIVE_JOINT_NAMES = [
    'passive_1_x', 'passive_1_y', 'passive_1_z',
    'passive_2_x', 'passive_2_y', 'passive_2_z',
    'passive_3_x', 'passive_3_y', 'passive_3_z',
    'passive_4_x', 'passive_4_y', 'passive_4_z',
    'passive_5_x', 'passive_5_y', 'passive_5_z',
    'passive_6_x', 'passive_6_y', 'passive_6_z',
    'passive_7_x', 'passive_7_y', 'passive_7_z',
  ];

  // 图形化配置编辑器 - 必须在主卡之前定义和注册
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
        input[type="text"],
        input[type="number"] {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--primary-color);
          border-radius: 4px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          box-sizing: border-box;
        }
        input[type="text"]:focus,
        input[type="number"]:focus {
          outline: none;
          border-color: var(--accent-color);
        }
        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .checkbox-row input[type="checkbox"] {
          width: auto;
          margin: 0;
        }
        .checkbox-row label {
          margin-bottom: 0;
          flex: 1;
        }
        .hint {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-top: 4px;
        }
        .section-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--primary-text-color);
          margin-top: 16px;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      </style>
      
      <div class="section-title">Connection</div>
      
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
          value="${config.daemon_port || 8000}"
          placeholder="8000"
        />
        <div class="hint">WebSocket port (default: 8000)</div>
      </div>
      
      <div class="section-title">Display</div>
      
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
      
      <div class="form-row">
        <label for="background">Background Color</label>
        <input
          id="background"
          type="text"
          value="${config.background_color || '#f5f5f5'}"
          placeholder="#f5f5f5"
        />
        <div class="hint">Background color (hex code)</div>
      </div>
      
      <div class="form-row">
        <label for="camera_distance">Camera Distance</label>
        <input
          id="camera_distance"
          type="number"
          step="0.1"
          value="${config.camera_distance || 0.5}"
          placeholder="0.5"
        />
        <div class="hint">Initial camera distance (0.2 - 1.5)</div>
      </div>
      
      <div class="section-title">Features</div>
      
      <div class="checkbox-row">
        <input type="checkbox" id="enable_passive" ${config.enable_passive_joints !== false ? 'checked' : ''}>
        <label for="enable_passive">Enable Passive Joints</label>
      </div>
      <div class="hint">Show Stewart platform passive joints (requires daemon support)</div>
      
      <div class="checkbox-row">
        <input type="checkbox" id="enable_pose" ${config.enable_head_pose !== false ? 'checked' : ''}>
        <label for="enable_pose">Enable Head Pose</label>
      </div>
      <div class="hint">Use 4x4 pose matrix for head positioning</div>
      
      <div class="checkbox-row">
        <input type="checkbox" id="enable_grid" ${config.enable_grid !== false ? 'checked' : ''}>
        <label for="enable_grid">Show Grid</label>
      </div>
      <div class="hint">Display ground grid helper</div>
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

      this.shadowRoot.getElementById('background').addEventListener('change', (e) => {
        this._config = { ...this._config, background_color: e.target.value };
        this.dispatchConfig();
      });

      this.shadowRoot.getElementById('camera_distance').addEventListener('change', (e) => {
        this._config = { ...this._config, camera_distance: parseFloat(e.target.value) };
        this.dispatchConfig();
      });

      this.shadowRoot.getElementById('enable_passive').addEventListener('change', (e) => {
        this._config = { ...this._config, enable_passive_joints: e.target.checked };
        this.dispatchConfig();
      });

      this.shadowRoot.getElementById('enable_pose').addEventListener('change', (e) => {
        this._config = { ...this._config, enable_head_pose: e.target.checked };
        this.dispatchConfig();
      });

      this.shadowRoot.getElementById('enable_grid').addEventListener('change', (e) => {
        this._config = { ...this._config, enable_grid: e.target.checked };
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

  // 先注册编辑器
  customElements.define('reachy-mini-3d-card-editor', ReachyMini3DCardEditor);

  // 主卡类
  class ReachyMini3DCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      
      // 性能优化相关
      this._frameCount = 0;
      this._lastDataVersion = -1;
      this._robotState = {
        headJoints: null,
        headPose: null,
        passiveJoints: null,
        antennas: [0, 0],
        dataVersion: 0
      };
      
      // WebSocket 重连控制
      this._reconnectAttempts = 0;
      this._maxReconnectAttempts = 10;
      this._reconnectDelay = 3000;
      this._reconnectTimeout = null;
    }

    static get getConfigElement() {
      return document.createElement('reachy-mini-3d-card-editor');
    }

    static getStubConfig() {
      return {
        daemon_host: 'localhost',
        daemon_port: 8000,
        height: 400,
        enable_passive_joints: true,
        enable_head_pose: true,
        background_color: '#f5f5f5',
        enable_grid: true,
        camera_distance: 0.5
      };
    }

    setConfig(config) {
      this._config = {
        daemon_host: 'localhost',
        daemon_port: 8000,
        height: 400,
        enable_passive_joints: true,
        enable_head_pose: true,
        background_color: '#f5f5f5',
        enable_grid: true,
        camera_distance: 0.5,
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
          transition: all 0.3s ease;
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
        #fps-counter {
          position: absolute;
          top: 10px;
          right: 10px;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          color: white;
          background: rgba(0, 0, 0, 0.6);
          z-index: 10;
        }
      </style>
      <ha-card>
        <div id="container">
          <div id="status" class="connecting">Connecting...</div>
          <div id="fps-counter">0 FPS</div>
          <div id="loading" class="loading">
            <ha-circular-progress indeterminate></ha-circular-progress>
          </div>
        </div>
      </ha-card>
    `;
    }

    async init() {
      try {
        // 初始化 Three.js
        await this.initThreeJS();

        // 连接 WebSocket
        this.connectWebSocket();

        // 加载机器人模型
        await this.loadRobot();

      } catch (err) {
        console.error('Init error:', err);
        this.showError(err.message);
      }
    }

    async initThreeJS() {
      const container = this.shadowRoot.querySelector('#container');
      const canvas = document.createElement('canvas');
      container.appendChild(canvas);

      // 动态导入 Three.js 和依赖
      // 使用 CDN 以确保在 Home Assistant 环境中正常工作
      try {
        const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.181.0/build/three.module.js');
        const { OrbitControls } = await import('https://cdn.jsdelivr.net/npm/three@0.181.0/examples/jsm/controls/OrbitControls.js');

        this._THREE = THREE;
      } catch (err) {
        console.error('❌ Failed to load Three.js:', err);
        this.showError('Failed to load 3D library. Please check your internet connection.');
        throw err;
      }

      // 场景
      this._scene = new this._THREE.Scene();
      this._scene.background = new this._THREE.Color(this._config.background_color || '#f5f5f5');

      // 相机
      this._camera = new this._THREE.PerspectiveCamera(
        50,
        container.clientWidth / this._config.height,
        0.01,
        1000
      );
      this._camera.position.set(0.3, 0.3, this._config.camera_distance || 0.5);

      // 渲染器
      this._renderer = new this._THREE.WebGLRenderer({ canvas, antialias: true });
      this._renderer.setSize(container.clientWidth, this._config.height);
      this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // 控制器
      this._controls = new OrbitControls(this._camera, canvas);
      this._controls.enableDamping = true;
      this._controls.dampingFactor = 0.05;
      this._controls.minDistance = 0.2;
      this._controls.maxDistance = 1.5;

      // 灯光
      this._scene.add(new this._THREE.AmbientLight(0xffffff, 0.6));

      const directionalLight = new this._THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      this._scene.add(directionalLight);

      const backLight = new this._THREE.DirectionalLight(0xffffff, 0.3);
      backLight.position.set(-1, -1, -1);
      this._scene.add(backLight);

      // 地面网格
      if (this._config.enable_grid !== false) {
        this._scene.add(new this._THREE.GridHelper(0.4, 20, 0x888888, 0xcccccc));
      }

      // FPS 计数器
      this._fpsCounter = {
        frameCount: 0,
        lastTime: performance.now(),
        fps: 0
      };

      // 动画循环
      const animate = () => {
        requestAnimationFrame(animate);
        
        // FPS 计算
        this._fpsCounter.frameCount++;
        const currentTime = performance.now();
        if (currentTime - this._fpsCounter.lastTime >= 1000) {
          this._fpsCounter.fps = this._fpsCounter.frameCount;
          this._fpsCounter.frameCount = 0;
          this._fpsCounter.lastTime = currentTime;
          
          const fpsEl = this.shadowRoot.querySelector('#fps-counter');
          if (fpsEl) {
            fpsEl.textContent = `${this._fpsCounter.fps} FPS`;
          }
        }
        
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

      // 初始化所有关节为零
      this._initializeJoints();

      // 隐藏加载动画
      const loading = this.shadowRoot.querySelector('#loading');
      if (loading) loading.style.display = 'none';
    }

    _initializeJoints() {
      if (!this._robot || !this._robot.joints) return;

      // 初始化 yaw_body
      if (this._robot.joints['yaw_body']) {
        this._robot.setJointValue('yaw_body', 0);
      }

      // 初始化 stewart 关节
      const stewartJoints = ['stewart_1', 'stewart_2', 'stewart_3', 'stewart_4', 'stewart_5', 'stewart_6'];
      stewartJoints.forEach(jointName => {
        if (this._robot.joints[jointName]) {
          this._robot.setJointValue(jointName, 0);
        }
      });

      // 初始化被动关节
      PASSIVE_JOINT_NAMES.forEach(jointName => {
        if (this._robot.joints[jointName]) {
          this._robot.setJointValue(jointName, 0);
        }
      });

      // 初始化天线
      ['left_antenna', 'right_antenna'].forEach(jointName => {
        if (this._robot.joints[jointName]) {
          this._robot.setJointValue(jointName, 0);
        }
      });

      // 强制更新矩阵
      this._robot.traverse((child) => {
        if (child.isObject3D) {
          child.updateMatrix();
          child.updateMatrixWorld(true);
        }
      });
    }

    getBasePath() {
      const scripts = document.getElementsByTagName('script');
      const src = scripts[scripts.length - 1]?.src || '';
      return src ? src.substring(0, src.lastIndexOf('/') + 1) : '/hacsfiles/ha-reachy-mini-card/';
    }

    connectWebSocket() {
      const { daemon_host, daemon_port } = this._config;
      
      // 构建 WebSocket URL，包含所有需要的参数
      let wsUrl = `ws://${daemon_host}:${daemon_port}/api/state/ws/full?frequency=20`;
      wsUrl += '&with_head_joints=true';
      wsUrl += '&with_antenna_positions=true';
      
      if (this._config.enable_passive_joints !== false) {
        wsUrl += '&with_passive_joints=true';
      }
      
      if (this._config.enable_head_pose !== false) {
        wsUrl += '&with_head_pose=true';
        wsUrl += '&use_pose_matrix=true';
      }

      console.log('🔌 Connecting to WebSocket:', wsUrl);

      this._ws = new WebSocket(wsUrl);

      this._ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this._reconnectAttempts = 0;
        this.updateStatus('connected', 'Connected');
      };

      this._ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          this._processRobotData(data);
        } catch (err) {
          console.error('❌ Parse error:', err);
        }
      };

      this._ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.updateStatus('error', 'Error');
      };

      this._ws.onclose = () => {
        console.log('🔌 WebSocket closed');
        this.updateStatus('error', 'Disconnected');
        
        // 重连逻辑
        if (this._reconnectAttempts < this._maxReconnectAttempts) {
          this._reconnectAttempts++;
          const delay = Math.min(this._reconnectDelay * Math.pow(1.5, this._reconnectAttempts - 1), 30000);
          
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this._reconnectAttempts}/${this._maxReconnectAttempts})`);
          
          this._reconnectTimeout = setTimeout(() => {
            this.connectWebSocket();
          }, delay);
        } else {
          console.error('❌ Max reconnection attempts reached');
          this.updateStatus('error', 'Connection Failed');
        }
      };
    }

    _processRobotData(data) {
      // 提取 head_joints (7 values)
      if (data.head_joints && Array.isArray(data.head_joints) && data.head_joints.length === 7) {
        this._robotState.headJoints = data.head_joints;
      }

      // 提取 head_pose (4x4 matrix)
      if (data.head_pose) {
        const headPoseArray = Array.isArray(data.head_pose) 
          ? data.head_pose 
          : data.head_pose.m;
        
        if (headPoseArray && headPoseArray.length === 16) {
          this._robotState.headPose = headPoseArray;
        }
      }

      // 提取天线位置
      if (data.antennas_position && Array.isArray(data.antennas_position) && data.antennas_position.length >= 2) {
        this._robotState.antennas = data.antennas_position;
      }

      // 提取被动关节 (21 values)
      if (data.passive_joints && Array.isArray(data.passive_joints) && data.passive_joints.length >= 21) {
        this._robotState.passiveJoints = data.passive_joints;
      }

      // 增加数据版本号
      this._robotState.dataVersion++;

      // 更新机器人
      this._updateRobot();
    }

    _updateRobot() {
      if (!this._robot) return;

      // 性能优化：帧节流（每3帧更新一次，约20Hz）
      this._frameCount++;
      if (this._frameCount % 3 !== 0) {
        return;
      }

      // 性能优化：如果数据版本没有变化，跳过更新
      if (this._robotState.dataVersion === this._lastDataVersion) {
        return;
      }
      this._lastDataVersion = this._robotState.dataVersion;

      // 应用 head_joints
      if (this._robotState.headJoints) {
        const j = this._robotState.headJoints;
        
        if (this._robot.joints['yaw_body']) {
          this._robot.setJointValue('yaw_body', j[0]);
        }
        
        const stewartJoints = ['stewart_1', 'stewart_2', 'stewart_3', 'stewart_4', 'stewart_5', 'stewart_6'];
        stewartJoints.forEach((jointName, index) => {
          if (this._robot.joints[jointName]) {
            this._robot.setJointValue(jointName, j[index + 1]);
          }
        });
      }

      // 应用被动关节
      if (this._config.enable_passive_joints !== false && this._robotState.passiveJoints) {
        const passiveArray = this._robotState.passiveJoints;
        for (let i = 0; i < 21; i++) {
          const jointName = PASSIVE_JOINT_NAMES[i];
          if (this._robot.joints[jointName]) {
            this._robot.setJointValue(jointName, passiveArray[i]);
          }
        }
      }

      // 应用天线位置（注意：需要反转映射和值）
      if (this._robotState.antennas) {
        const antennas = this._robotState.antennas;
        
        // 左天线（视觉上在右侧）
        if (this._robot.joints['left_antenna']) {
          this._robot.setJointValue('left_antenna', -antennas[1]);
        }
        
        // 右天线（视觉上在左侧）
        if (this._robot.joints['right_antenna']) {
          this._robot.setJointValue('right_antenna', -antennas[0]);
        }
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
      // 清理 WebSocket
      if (this._ws) {
        this._ws.close();
        this._ws = null;
      }
      
      // 清理重连超时
      if (this._reconnectTimeout) {
        clearTimeout(this._reconnectTimeout);
        this._reconnectTimeout = null;
      }
      
      // 清理渲染器
      if (this._renderer) {
        this._renderer.dispose();
        this._renderer = null;
      }
      
      // 清理场景
      if (this._scene) {
        this._scene.clear();
        this._scene = null;
      }
    }
  }

  customElements.define('reachy-mini-3d-card', ReachyMini3DCard);

})();
