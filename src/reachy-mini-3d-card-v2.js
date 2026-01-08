// Reachy Mini 3D Card for Home Assistant
// 直接连接版本 - 无需 ESPHome,直接连接 Reachy Mini Daemon
// 参考 reachy-mini-desktop-app 的 WebSocket 连接方式

// 立即注册 customCards
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'reachy-mini-3d-card',
  name: 'Reachy Mini 3D Card',
  description: 'Real-time 3D visualization of Reachy Mini robot with direct daemon connection',
  preview: true,
  documentationURL: 'https://github.com/Desmond-Dong/ha-reachy-mini-card'
});

(async () => {
  try {
    // 加载 Three.js 和依赖
    const loadScript = (url) => new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    if (!window.THREE) {
      await loadScript('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js');
    }
    await loadScript('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/controls/OrbitControls.js');
    await loadScript('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/loaders/STLLoader.js');

    // LitElement
    let LitElement, html, css;
    if (window.LitElement) {
      LitElement = window.LitElement;
      html = window.html;
      css = window.css;
    } else {
      await loadScript('https://cdn.jsdelivr.net/npm/@lit/reactive-element@1.6.0/reactive-element.js');
      await loadScript('https://cdn.jsdelivr.net/npm/lit@3.1.0/lit-element.js');
      LitElement = window.LitElement || window.LitElementElement;
      html = window.html || ((strings, ...values) => ({ strings, values }));
      css = window.css || ((strings, ...values) => strings.join(''));
    }

    class ReachyMini3DCard extends LitElement {
      static get properties() {
        return {
          hass: Object,
          config: Object,
          _editing: { type: Boolean, state: true },
          _loaded: { type: Boolean, state: true },
          _connectionStatus: { type: String, state: true },
          _robotData: { type: Object, state: true }
        };
      }

      static get styles() {
        return css`
          :host {
            display: block;
            width: 100%;
            position: relative;
          }
          ha-card {
            overflow: hidden;
            border-radius: var(--ha-card-border-radius, 12px);
            box-shadow: var(--ha-card-box-shadow, none);
          }
          .card-container {
            width: 100%;
            position: relative;
          }
          #canvas-container {
            width: 100%;
            height: 400px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            position: relative;
          }
          .status-overlay {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.6);
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            font-family: var(--font-family, Roboto);
            font-size: 12px;
            pointer-events: none;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .status-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #4caf50;
          }
          .status-indicator.connecting {
            background: #ff9800;
            animation: pulse 1s infinite;
          }
          .status-indicator.error {
            background: #f44336;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .controls {
            position: absolute;
            bottom: 10px;
            right: 10px;
            display: flex;
            gap: 8px;
          }
          .control-btn {
            background: rgba(255,255,255,0.9);
            border: none;
            border-radius: 8px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 20px;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          }
          .control-btn:hover {
            background: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          }
          .edit-mode {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 100;
          }
          .edit-btn {
            background: var(--primary-color, #03a9f4);
            color: white;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            transition: all 0.2s;
          }
          .edit-btn:hover {
            background: var(--primary-color, #0288d1);
            transform: scale(1.1);
          }
          .config-panel {
            position: absolute;
            top: 0;
            right: 0;
            width: 320px;
            height: 100%;
            background: white;
            box-shadow: -4px 0 16px rgba(0,0,0,0.1);
            border-radius: 12px 0 0 12px;
            padding: 20px;
            overflow-y: auto;
            z-index: 1000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
          }
          .config-panel.open {
            transform: translateX(0);
          }
          .config-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #f0f0f0;
          }
          .config-header h3 {
            margin: 0;
            color: #333;
            font-size: 18px;
          }
          .close-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 30px;
            height: 30px;
          }
          .close-btn:hover {
            color: #333;
          }
          .config-item {
            margin-bottom: 16px;
          }
          .config-item label {
            display: block;
            margin-bottom: 6px;
            font-size: 13px;
            color: #555;
            font-weight: 500;
          }
          .config-item input[type="text"],
          .config-item input[type="number"] {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            box-sizing: border-box;
            transition: border-color 0.2s;
          }
          .config-item input:focus {
            outline: none;
            border-color: var(--primary-color, #03a9f4);
            box-shadow: 0 0 0 3px rgba(3, 169, 244, 0.1);
          }
          .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255,255,255,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: #666;
            z-index: 50;
          }
          .error-message {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: #f44336;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
        `;
      }

      static getStubConfig() {
        return {
          daemon_host: 'localhost',
          daemon_port: 3333,
          height: 400,
          show_controls: true,
          auto_rotate: false
        };
      }

      setConfig(config) {
        if (!config.daemon_host && !config.daemon_port) {
          // 兼容旧版本配置
          if (config.entity_prefix) {
            console.warn('entity_prefix is deprecated. Please use daemon_host and daemon_port instead.');
          }
        }
        this.config = {
          ...ReachyMini3DCard.getStubConfig(),
          ...config
        };
      }

      getCardSize() {
        return Math.ceil(this.config.height / 50);
      }

      constructor() {
        super();
        this._loaded = false;
        this._editing = false;
        this._connectionStatus = 'disconnected';
        this._robotData = {
          headJoints: null,
          headPose: null,
          antennas: [0, 0],
          passiveJoints: null
        };
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
      }

      connectedCallback() {
        super.connectedCallback();
        requestAnimationFrame(() => {
          this.initThreeJS().catch(err => {
            console.error('Failed to initialize Three.js:', err);
            this._loaded = true;
          });
        });
      }

      disconnectedCallback() {
        super.disconnectedCallback();
        this.cleanup();
      }

      async initThreeJS() {
        const container = this.shadowRoot?.getElementById('canvas-container');
        if (!container) {
          await new Promise(resolve => setTimeout(resolve, 100));
          return this.initThreeJS();
        }

        try {
          // 场景
          this.scene = new THREE.Scene();
          this.scene.background = new THREE.Color(0xf0f0f0);

          // 相机
          const width = container.clientWidth;
          const height = this.config?.height || 400;
          this.camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 1000);
          this.camera.position.set(0.3, 0.3, 0.5);

          // 渲染器
          this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
          this.renderer.setSize(width, height);
          this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          this.renderer.shadowMap.enabled = true;
          this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
          container.appendChild(this.renderer.domElement);

          // 控制器
          this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
          this.controls.enableDamping = true;
          this.controls.dampingFactor = 0.05;
          this.controls.minDistance = 0.2;
          this.controls.maxDistance = 1;

          // 灯光
          const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
          this.scene.add(ambientLight);

          const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
          directionalLight.position.set(1, 1, 1);
          directionalLight.castShadow = true;
          this.scene.add(directionalLight);

          // 地面网格
          const gridHelper = new THREE.GridHelper(0.4, 20, 0x888888, 0xcccccc);
          this.scene.add(gridHelper);

          // 加载机器人模型
          await this.loadRobotModel();

          // 标记为已加载
          this._loaded = true;

          // 连接 WebSocket
          this.connectWebSocket();

          // 开始动画循环
          this.animate();

          // 监听窗口大小变化
          window.addEventListener('resize', this.onWindowResize.bind(this));
        } catch (error) {
          console.error('Error initializing Three.js:', error);
          this._loaded = true;
          this._connectionStatus = 'error';
          throw error;
        }
      }

      async loadRobotModel() {
        try {
          // 动态导入 urdf-loader
          const URDFLoader = (await import('/hacsfiles/reachy-mini-3d-card/lib/urdf-loader.js')).default;

          const urdfPath = '/hacsfiles/reachy-mini-3d-card/assets/reachy-mini.urdf';

          const loader = new URDFLoader();
          loader.workingPath = '/hacsfiles/reachy-mini-3d-card/assets/';
          loader.pathPrefix = (path) => '/hacsfiles/reachy-mini-3d-card/assets/' + path;

          this.robot = await loader.load(urdfPath);
          this.scene.add(this.robot);
          this.robot.position.set(0, 0, 0);
          this.joints = this.robot.joints;

          console.log('Robot model loaded successfully');
        } catch (error) {
          console.error('Failed to load URDF model:', error);
          this._connectionStatus = 'error';
          throw error;
        }
      }

      /**
       * 连接 Reachy Mini Daemon WebSocket
       * 参考 reachy-mini-desktop-app 的实现
       */
      connectWebSocket() {
        const host = this.config.daemon_host || 'localhost';
        const port = this.config.daemon_port || 3333;

        // 检查是否已超过最大重连次数
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.warn(`Max reconnection attempts (${this.maxReconnectAttempts}) reached. Please check if the daemon is running.`);
          this._connectionStatus = 'error';
          return;
        }

        try {
          // WebSocket URL: ws://localhost:3333/api/state/ws/full
          // 参数: frequency=20, with_head_pose=true, with_head_joints=true, with_antenna_positions=true, with_passive_joints=true
          const wsUrl = `ws://${host}:${port}/api/state/ws/full?frequency=20&with_head_pose=true&use_pose_matrix=true&with_head_joints=true&with_antenna_positions=true&with_passive_joints=true`;

          console.log(`Connecting to Reachy Mini daemon: ${wsUrl}`);
          this._connectionStatus = 'connecting';

          this.ws = new WebSocket(wsUrl);

          this.ws.onopen = () => {
            console.log('WebSocket connected to Reachy Mini daemon');
            this._connectionStatus = 'connected';
            this.reconnectAttempts = 0; // 重置重连计数器
          };

          this.ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              this.updateRobotFromWebSocket(data);
            } catch (err) {
              console.error('Failed to parse WebSocket message:', err);
            }
          };

          this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this._connectionStatus = 'error';
          };

          this.ws.onclose = () => {
            console.log('WebSocket connection closed');
            this._connectionStatus = 'disconnected';

            // 尝试重连
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.reconnectAttempts++;
              const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000); // 指数退避,最大10秒
              console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
              setTimeout(() => this.connectWebSocket(), delay);
            } else {
              console.warn('Max reconnection attempts reached');
              this._connectionStatus = 'error';
            }
          };
        } catch (error) {
          console.error('Failed to create WebSocket connection:', error);
          this._connectionStatus = 'error';
        }
      }

      /**
       * 从 WebSocket 数据更新机器人状态
       * 参考 reachy-mini-desktop-app 的数据解析逻辑
       */
      updateRobotFromWebSocket(data) {
        if (!this.robot || !this.robot.joints) return;

        try {
          // 提取 head_joints (7个值: yaw_body + stewart_1-6)
          if (data.head_joints && Array.isArray(data.head_joints) && data.head_joints.length === 7) {
            const headJoints = data.head_joints;

            // 更新 Stewart platform 关节
            this.robot.setJointValue('yaw_body', headJoints[0] || 0);
            this.robot.setJointValue('stewart_1', headJoints[1] || 0);
            this.robot.setJointValue('stewart_2', headJoints[2] || 0);
            this.robot.setJointValue('stewart_3', headJoints[3] || 0);
            this.robot.setJointValue('stewart_4', headJoints[4] || 0);
            this.robot.setJointValue('stewart_5', headJoints[5] || 0);
            this.robot.setJointValue('stewart_6', headJoints[6] || 0);

            this._robotData.headJoints = headJoints;
          }

          // 提取天线位置
          if (data.antennas_position && Array.isArray(data.antennas_position) && data.antennas_position.length === 2) {
            const [leftAntenna, rightAntenna] = data.antennas_position;

            // 天线映射 (角度可能需要反转,参考 desktop app)
            this.robot.setJointValue('left_antenna', -leftAntenna);
            this.robot.setJointValue('right_antenna', -rightAntenna);

            this._robotData.antennas = data.antennas_position;
          }

          // 存储 head_pose (4x4矩阵)
          if (data.head_pose) {
            const headPoseArray = Array.isArray(data.head_pose)
              ? data.head_pose
              : data.head_pose.m;

            if (headPoseArray && headPoseArray.length === 16) {
              this._robotData.headPose = headPoseArray;
            }
          }

          // 存储 passive_joints (21个值)
          if (data.passive_joints && Array.isArray(data.passive_joints) && data.passive_joints.length >= 21) {
            this._robotData.passiveJoints = data.passive_joints;
          }

          this._connectionStatus = 'connected';
        } catch (error) {
          console.error('Error updating robot state:', error);
          this._connectionStatus = 'error';
        }
      }

      animate() {
        if (!this.renderer) return;

        requestAnimationFrame(this.animate.bind(this));

        if (this.controls) {
          this.controls.update();
        }

        if (this.config.auto_rotate && this.robot) {
          this.robot.rotation.y += 0.005;
        }

        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      }

      onWindowResize() {
        if (!this.camera || !this.renderer) return;

        const container = this.shadowRoot.getElementById('canvas-container');
        if (!container) return;

        const width = container.clientWidth;
        const height = this.config.height || 400;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
      }

      cleanup() {
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        if (this.renderer) {
          this.renderer.dispose();
        }
      }

      // 配置相关方法
      toggleEditMode() {
        this._editing = !this._editing;
      }

      updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.dispatchEvent(new CustomEvent('config-changed', {
          detail: { config: this.config },
          bubbles: true
        }));

        // 如果连接配置改变,重新连接
        if (newConfig.daemon_host || newConfig.daemon_port) {
          if (this.ws) {
            this.ws.close();
          }
          this.reconnectAttempts = 0;
          this.connectWebSocket();
        }
      }

      render() {
        return html`
          <ha-card>
            <div class="card-container">
              ${this._editing ? html`
                <div class="config-panel open">
                  <div class="config-header">
                    <h3>⚙️ Configuration</h3>
                    <button class="close-btn" @click="${() => this.toggleEditMode()}">×</button>
                  </div>

                  <div class="config-item">
                    <label>Daemon Host</label>
                    <input type="text"
                           .value="${this.config?.daemon_host || 'localhost'}"
                           @change="${(e) => this.updateConfig({ daemon_host: e.target.value })}">
                  </div>

                  <div class="config-item">
                    <label>Daemon Port</label>
                    <input type="number"
                           .value="${this.config?.daemon_port || 3333}"
                           @change="${(e) => this.updateConfig({ daemon_port: parseInt(e.target.value) })}">
                  </div>

                  <div class="config-item">
                    <label>Height (${this.config?.height || 400}px)</label>
                    <input type="range"
                           min="200"
                           max="800"
                           step="50"
                           .value="${this.config?.height || 400}"
                           @input="${(e) => this.updateConfig({ height: parseInt(e.target.value) })}">
                  </div>

                  <div class="config-item">
                    <label>
                      <input type="checkbox"
                             ?checked="${this.config?.auto_rotate || false}"
                             @change="${(e) => this.updateConfig({ auto_rotate: e.target.checked })}">
                      Auto Rotate
                    </label>
                  </div>

                  <div class="config-item">
                    <p style="font-size:11px;color:#666;margin:8px 0;">
                      ℹ️ Make sure Reachy Mini daemon is running on the specified host and port.
                    </p>
                  </div>
                </div>
              ` : ''}

              <div id="canvas-container" style="height:${this.config?.height || 400}px">
                ${!this._loaded ? html`
                  <div class="loading-overlay">
                    <div style="text-align:center">
                      <div style="font-size:24px;margin-bottom:8px">🤖</div>
                      <div>Loading 3D model...</div>
                    </div>
                  </div>
                ` : ''}

                ${this._loaded && this._connectionStatus === 'error' ? html`
                  <div class="error-message">
                    <div style="font-size:48px;">⚠️</div>
                    <div style="font-size:16px;margin-top:10px;">
                      <strong>Connection Failed</strong><br>
                      <small style="color:#666;">Cannot connect to Reachy Mini daemon</small><br>
                      <small style="color:#999;font-size:11px;">
                        Host: ${this.config.daemon_host}:${this.config.daemon_port}<br>
                        Please check if the daemon is running
                      </small>
                    </div>
                  </div>
                ` : ''}
              </div>

              <!-- 状态指示器 -->
              ${this._loaded ? html`
                <div class="status-overlay">
                  <span class="status-indicator ${this._connectionStatus === 'connecting' ? 'connecting' : this._connectionStatus === 'error' ? 'error' : ''}"></span>
                  <span>
                    ${this._connectionStatus === 'connected' ? '🟢 Connected' : ''}
                    ${this._connectionStatus === 'connecting' ? '🟡 Connecting...' : ''}
                    ${this._connectionStatus === 'disconnected' ? '🔴 Disconnected' : ''}
                    ${this._connectionStatus === 'error' ? '❌ Connection Error' : ''}
                  </span>
                </div>
              ` : ''}

              ${this.config?.show_controls !== false ? html`
                <div class="controls">
                  <button class="control-btn" @click="${() => this.resetCamera()}" title="Reset View">🎯</button>
                  <button class="control-btn" @click="${() => this.toggleAutoRotate()}" title="Toggle Rotation">🔄</button>
                </div>
              ` : ''}

              <div class="edit-mode">
                <button class="edit-btn" @click="${() => this.toggleEditMode()}" title="Edit Configuration">⚙️</button>
              </div>
            </div>
          </ha-card>
        `;
      }

      resetCamera() {
        if (this.camera && this.controls) {
          this.camera.position.set(0.3, 0.3, 0.5);
          this.controls.reset();
        }
      }

      toggleAutoRotate() {
        this.updateConfig({ auto_rotate: !this.config.auto_rotate });
      }
    }

    // 注册自定义卡片
    customElements.define('reachy-mini-3d-card', ReachyMini3DCard);

    console.log('Reachy Mini 3D Card (Direct Connection) registered successfully');
  } catch (error) {
    console.error('Error initializing Reachy Mini 3D Card:', error);
  }
})();
