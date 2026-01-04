!function(){"use strict";var t="undefined"!=typeof document?document.currentScript:null;(async()=>{const e=new URL(t&&"SCRIPT"===t.tagName.toUpperCase()&&t.src||new URL("reachy-mini-3d-card.js",document.baseURI).href);e.origin,e.pathname.replace(/\/[^/]*$/,"/"),await s("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"),await s("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/controls/OrbitControls.js"),await s("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/loaders/STLLoader.js");const{LitElement:i,html:o,css:n}=await async function(){if(window.LitElement)return{LitElement:window.LitElement,html:window.html,css:window.css};return await s("https://cdn.jsdelivr.net/npm/lit@3.1.0/index.js"),await s("https://cdn.jsdelivr.net/npm/lit@3.1.0/decorators.js"),await s("https://cdn.jsdelivr.net/npm/lit@3.1.0/polyfill-support.js"),await s("https://cdn.jsdelivr.net/npm/@lit/reactive-element@1.6.0/reactive-element.js"),await s("https://cdn.jsdelivr.net/npm/lit@3.1.0/lit-element.js"),{LitElement:window.LitElement||window.LitElementElement,html:window.html||((t,...e)=>({strings:t,values:e})),css:window.css||((t,...e)=>t.join(""))}}();class ReachyMini3DCard extends i{static get properties(){return{hass:Object,config:Object,_editing:{type:Boolean,state:!0}}}static get styles(){return n`
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
        .control-btn:active {
          transform: translateY(0);
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
        .config-item input[type="number"],
        .config-item select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .config-item input:focus,
        .config-item select:focus {
          outline: none;
          border-color: var(--primary-color, #03a9f4);
          box-shadow: 0 0 0 3px rgba(3, 169, 244, 0.1);
        }
        .config-item ha-switch {
          display: block;
        }
        .entity-selector {
          position: relative;
        }
        .entity-selector input {
          padding-right: 30px;
        }
        .entity-icon {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          color: #999;
        }
        .preset-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 16px;
        }
        .preset-btn {
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }
        .preset-btn:hover {
          background: var(--primary-color, #03a9f4);
          color: white;
          border-color: var(--primary-color, #03a9f4);
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
      `}static getStubConfig(){return{entity_prefix:"reachy_mini",height:400,show_controls:!0,auto_rotate:!1,xray_mode:!1,wireframe:!1}}setConfig(t){if(!t.entity_prefix)throw new Error("You need to define an entity prefix");this.config={...ReachyMini3DCard.getStubConfig(),...t}}getCardSize(){return Math.ceil(this.config.height/50)}connectedCallback(){super.connectedCallback(),this.initThreeJS()}disconnectedCallback(){super.disconnectedCallback(),this.cleanup()}async initThreeJS(){const t=this.shadowRoot.getElementById("canvas-container");if(!t)return;this.scene=new THREE.Scene,this.scene.background=new THREE.Color(15790320);const e=t.clientWidth,i=this.config.height||400;this.camera=new THREE.PerspectiveCamera(50,e/i,.01,1e3),this.camera.position.set(.3,.3,.5),this.renderer=new THREE.WebGLRenderer({antialias:!0,alpha:!0}),this.renderer.setSize(e,i),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=THREE.PCFSoftShadowMap,t.appendChild(this.renderer.domElement),this.controls=new THREE.OrbitControls(this.camera,this.renderer.domElement),this.controls.enableDamping=!0,this.controls.dampingFactor=.05,this.controls.minDistance=.2,this.controls.maxDistance=1;const o=new THREE.AmbientLight(16777215,.6);this.scene.add(o);const n=new THREE.DirectionalLight(16777215,.8);n.position.set(1,1,1),n.castShadow=!0,this.scene.add(n);const s=new THREE.GridHelper(.4,20,8947848,13421772);this.scene.add(s),await this.loadRobotModel(),this.animate(),window.addEventListener("resize",this.onWindowResize.bind(this)),this.startStateUpdate()}async loadRobotModel(){try{const t=(await import("../../../../../../hacsfiles/reachy-mini-3d-card/lib/urdf-loader.js")).default,e="/hacsfiles/reachy-mini-3d-card/assets/reachy-mini.urdf",i=new t;i.workingPath="/hacsfiles/reachy-mini-3d-card/assets/",i.pathPrefix=t=>"/hacsfiles/reachy-mini-3d-card/assets/"+t,this.robot=await i.load(e),this.scene.add(this.robot),this.robot.position.set(0,0,0),this.joints=this.robot.joints,console.log("Robot model loaded successfully:",this.robot),console.log("Available joints:",Object.keys(this.robot.joints))}catch(t){console.error("Failed to load URDF model:",t);const e=document.createElement("div");e.style.cssText="\n          position: absolute;\n          top: 50%;\n          left: 50%;\n          transform: translate(-50%, -50%);\n          text-align: center;\n          color: #f44336;\n          padding: 20px;\n          background: white;\n          border-radius: 8px;\n          box-shadow: 0 2px 8px rgba(0,0,0,0.1);\n        ",e.innerHTML=`\n          <div style="font-size: 48px;">⚠️</div>\n          <div style="font-size: 16px; margin-top: 10px;">\n            <strong>模型加载失败</strong><br>\n            <small style="color: #666;">${t.message}</small><br>\n            <small style="color: #999; font-size: 11px;">请确保文件已正确安装到 HACS</small>\n          </div>\n        `,this.shadowRoot.getElementById("canvas-container").appendChild(e)}}startStateUpdate(){this.updateInterval=setInterval(()=>{this.hass&&this.robot&&this.updateRobotState()},50)}updateRobotState(){if(!this.robot||!this.robot.joints)return;const t=this.config.entity_prefix,e=(e,i)=>{const o=`${e}.${t}_${i}`,n=this.hass.states[o];return n?parseFloat(n.state):0},i=this.hass.states[`sensor.${t}_head_joints`];if(this.hass.states[`sensor.${t}_head_pose`],i&&"unknown"!==i.state)try{const t=JSON.parse(i.state);this.robot.setJointValue("yaw_body",t[0]||0),this.robot.setJointValue("stewart_1",t[1]||0),this.robot.setJointValue("stewart_2",t[2]||0),this.robot.setJointValue("stewart_3",t[3]||0),this.robot.setJointValue("stewart_4",t[4]||0),this.robot.setJointValue("stewart_5",t[5]||0),this.robot.setJointValue("stewart_6",t[6]||0)}catch(t){console.warn("Failed to parse head_joints:",t)}const o=e("number","antenna_left"),n=e("number","antenna_right");this.robot.setJointValue("left_antenna",-o),this.robot.setJointValue("right_antenna",-n)}animate(){this.renderer&&(requestAnimationFrame(this.animate.bind(this)),this.controls&&this.controls.update(),this.config.auto_rotate&&this.robot&&(this.robot.rotation.y+=.005),this.renderer&&this.scene&&this.camera&&this.renderer.render(this.scene,this.camera))}onWindowResize(){if(!this.camera||!this.renderer)return;const t=this.shadowRoot.getElementById("canvas-container");if(!t)return;const e=t.clientWidth,i=this.config.height||400;this.camera.aspect=e/i,this.camera.updateProjectionMatrix(),this.renderer.setSize(e,i)}cleanup(){this.updateInterval&&clearInterval(this.updateInterval),window.removeEventListener("resize",this.onWindowResize.bind(this)),this.renderer&&this.renderer.dispose()}showError(t){const e=this.shadowRoot.getElementById("canvas-container");e&&(e.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#f44336;font-size:14px;">${t}</div>`)}toggleEditMode(){this._editing=!this._editing}updateConfig(t){this.config={...this.config,...t},this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this.config},bubbles:!0}))}render(){return o`
        <ha-card>
          <div class="card-container">
            ${this._editing?o`
              <div class="config-panel open">
                <div class="config-header">
                  <h3>⚙️ Card Configuration</h3>
                  <button class="close-btn" @click="${()=>this.toggleEditMode()}">×</button>
                </div>

                <div class="preset-buttons">
                  <button class="preset-btn" @click="${()=>this.applyPreset("default")}">🏠 Default</button>
                  <button class="preset-btn" @click="${()=>this.applyPreset("compact")}">📱 Compact</button>
                  <button class="preset-btn" @click="${()=>this.applyPreset("detailed")}">📊 Detailed</button>
                  <button class="preset-btn" @click="${()=>this.applyPreset("minimal")}">✨ Minimal</button>
                </div>

                <div class="config-item">
                  <label>Entity Prefix</label>
                  <div class="entity-selector">
                    <input type="text"
                           .value="${this.config.entity_prefix}"
                           @change="${t=>this.updateConfig({entity_prefix:t.target.value})}">
                    <span class="entity-icon">🔗</span>
                  </div>
                </div>

                <div class="config-item">
                  <label>Height (${this.config.height}px)</label>
                  <input type="range"
                         min="200"
                         max="800"
                         step="50"
                         .value="${this.config.height}"
                         @input="${t=>this.updateConfig({height:parseInt(t.target.value)})}">
                </div>

                <div class="config-item">
                  <label>Options</label>
                  <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <input type="checkbox"
                           ?checked="${this.config.show_controls}"
                           @change="${t=>this.updateConfig({show_controls:t.target.checked})}">
                    Show Controls
                  </label>
                  <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <input type="checkbox"
                           ?checked="${this.config.auto_rotate}"
                           @change="${t=>this.updateConfig({auto_rotate:t.target.checked})}">
                    Auto Rotate
                  </label>
                  <label style="display:flex;align-items:center;gap:8px;">
                    <input type="checkbox"
                           ?checked="${this.config.xray_mode}"
                           @change="${t=>this.updateConfig({xray_mode:t.target.checked})}">
                    X-Ray Mode
                  </label>
                </div>
              </div>
            `:""}

            <div id="canvas-container" style="height:${this.config.height}px"></div>

            ${this.config.show_controls?o`
              <div class="controls">
                <button class="control-btn" @click="${()=>this.resetCamera()}" title="Reset View">🎯</button>
                <button class="control-btn" @click="${()=>this.toggleAutoRotate()}" title="Toggle Rotation">🔄</button>
              </div>
            `:""}

            <div class="edit-mode">
              <button class="edit-btn" @click="${()=>this.toggleEditMode()}" title="Edit Configuration">⚙️</button>
            </div>
          </div>
        </ha-card>
      `}resetCamera(){this.camera&&this.controls&&(this.camera.position.set(.3,.3,.5),this.controls.reset())}toggleAutoRotate(){this.updateConfig({auto_rotate:!this.config.auto_rotate})}applyPreset(t){const e={default:{height:400,show_controls:!0,auto_rotate:!1},compact:{height:300,show_controls:!1,auto_rotate:!0},detailed:{height:600,show_controls:!0,auto_rotate:!1,xray_mode:!0},minimal:{height:250,show_controls:!1,auto_rotate:!1}};this.updateConfig(e[t]||e.default)}}async function s(t){return new Promise((e,i)=>{const o=document.createElement("script");o.src=t,o.onload=e,o.onerror=i,document.head.appendChild(o)})}customElements.define("reachy-mini-3d-card",ReachyMini3DCard),window.customCards=window.customCards||[],window.customCards.push({type:"reachy-mini-3d-card",name:"Reachy Mini 3D Card",description:"Real-time 3D visualization of Reachy Mini robot with visual configuration editor",preview:!0,documentationURL:"https://github.com/djhui5710/reachy_mini_ha_voice"})})()}();
//# sourceMappingURL=reachy-mini-3d-card.js.map
