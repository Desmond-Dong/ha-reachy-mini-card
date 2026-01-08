# Reachy Mini HA Card - 新架构设计

## 问题分析
当前项目依赖 ESPHome 实体作为数据源:
- 需要配置 ESPHome 设备
- 数据链路: Daemon → ESPHome → HA → Card (有延迟)
- 维护成本高

## 参考项目架构
reachy-mini-desktop-app 直接连接 daemon 的 WebSocket:
```javascript
// 连接: ws://localhost:3333/api/state/ws/full
// 数据: { head_joints, head_pose, antennas_position, passive_joints }
// 频率: 20Hz (每50ms更新一次)
```

## 新架构方案

### 1. 数据获取层
直接连接 Reachy Mini daemon,无需 ESPHome 中间层

**WebSocket 连接**:
```javascript
wsUrl: ws://localhost:3333/api/state/ws/full?frequency=20&with_head_pose=true&with_head_joints=true&with_antenna_positions=true&with_passive_joints=true
```

**数据格式**:
```json
{
  "head_pose": [16个浮点数 - 4x4变换矩阵],
  "head_joints": [yaw_body, stewart_1-6],
  "antennas_position": [left, right],
  "passive_joints": [21个浮点数 - 7个关节的x/y/z]
}
```

### 2. 配置界面
用户只需配置 daemon URL (默认 localhost:3333)

**配置项**:
- `daemon_host`: Daemon 主机地址 (默认: localhost)
- `daemon_port`: Daemon 端口 (默认: 3333)
- `height`: 卡片高度
- `auto_rotate`: 自动旋转

### 3. 连接模式
参考 desktop app 支持3种模式:
1. **USB Mode**: 直连 USB (localhost:3333)
2. **WiFi Mode**: 网络连接 (http://IP:3333)
3. **HTTP Fallback**: WebSocket 失败时降级到 HTTP 轮询

### 4. 错误处理
- WebSocket 重连机制 (最多3次,然后降级到HTTP)
- 显示连接状态指示器
- 连接失败时显示友好提示

### 5. 优势
✅ 无需 ESPHome 配置
✅ 更低延迟 (直接连接)
✅ 更高实时性 (20Hz WebSocket)
✅ 更简洁的架构
✅ 与 desktop app 一致的数据源
