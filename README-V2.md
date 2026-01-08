# Reachy Mini 3D Card V2 - 直接连接版本

## 🎯 重大更新 - 无需 ESPHome!

这个版本完全重构,直接连接 Reachy Mini daemon,**不再需要 ESPHome 配置**!

参考了 [reachy-mini-desktop-app](./reachy-mini-desktop-app) 的实现方式,使用 WebSocket 直接获取机器人实时数据。

## ✨ 新版本特性

### 与原版的主要区别

| 特性 | 原版 (V1) | 新版 (V2) |
|------|----------|----------|
| 数据源 | ESPHome 实体 | Reachy Mini Daemon |
| 配置复杂度 | 需要配置 ESPHome 设备 | 只需配置 daemon 地址 |
| 数据延迟 | ESPHome → HA → Card | 直接 WebSocket (20Hz) |
| 实时性 | ~500ms 延迟 | ~50ms 延迟 |
| 维护成本 | 需要维护 ESPHome 固件 | 无需额外配置 |
| 连接状态 | 依赖 HA 状态更新 | 实时连接指示器 |

### 新增功能

- ✅ **直接 WebSocket 连接** - 无中间层,最低延迟
- ✅ **实时状态指示器** - 显示连接状态 (连接中/已连接/错误)
- ✅ **自动重连机制** - 断线自动重连 (最多3次,指数退避)
- ✅ **更简洁的配置** - 只需配置 daemon_host 和 daemon_port
- ✅ **完整的数据支持** - head_joints, head_pose, antennas, passive_joints
- ✅ **错误处理** - 友好的错误提示和连接状态显示

## 📦 安装

### 前置要求

- Home Assistant 2023.11.0 或更高版本
- HACS 已安装
- **Reachy Mini daemon 正在运行** (默认端口 3333)

### 步骤 1: 安装卡片

1. 打开 Home Assistant → **HACS** → **Frontend**
2. 点击 **Explore & Download Repositories**
3. 搜索 `Reachy Mini 3D Card`
4. 点击 **Download** → 选择最新版本
5. 等待安装完成

### 步骤 2: 添加资源

1. 前往 **Settings** → **Dashboard** → **Resources**
2. 点击 **Add Resource**
3. 搜索并选择 `Reachy Mini 3D Card`
4. 点击 **Add Resource**
5. 刷新浏览器 (Ctrl+Shift+R)

### 步骤 3: 添加到仪表板

1. 编辑仪表板 (点击 **...** → **Edit dashboard**)
2. 点击 **Add Card** (+ 按钮)
3. 搜索 `Reachy Mini 3D Card`
4. 点击添加
5. 配置 (见下方)
6. 点击 **Save**

## ⚙️ 配置

### 可视化配置编辑器 (推荐)

点击卡片右上角的 **⚙️** 图标:

- **Daemon Host**: Daemon 主机地址 (默认: `localhost`)
- **Daemon Port**: Daemon 端口 (默认: `3333`)
- **Height**: 卡片高度 (200-800px)
- **Auto Rotate**: 自动旋转视图

### YAML 配置

如果更喜欢 YAML 编辑:

```yaml
type: custom:reachy-mini-3d-card
daemon_host: localhost    # Daemon 主机地址 (默认: localhost)
daemon_port: 3333         # Daemon 端口 (默认: 3333)
height: 400                # 可选: 卡片高度 (200-800)
show_controls: true        # 可选: 显示控制按钮 (默认: true)
auto_rotate: false         # 可选: 自动旋转 (默认: false)
```

### 连接远程 Daemon

如果 Reachy Mini daemon 运行在其他设备上:

```yaml
type: custom:reachy-mini-3d-card
daemon_host: 192.168.1.100  # Reachy Mini 的 IP 地址
daemon_port: 3333
```

**注意**: 确保防火墙允许访问端口 3333

## 🔌 连接模式

### USB 模式 (默认)
Reachy Mini 通过 USB 连接到运行 Home Assistant 的设备:

```yaml
daemon_host: localhost
daemon_port: 3333
```

### WiFi 模式
Reachy Mini 和 Home Assistant 在同一网络的不同设备上:

```yaml
daemon_host: 192.168.1.100  # Reachy Mini 的 IP
daemon_port: 3333
```

### 网络配置

确保 Reachy Mini daemon 监听所有网络接口 (不仅 localhost):

```bash
# Reachy Mini 上启动 daemon 时使用:
reachy-mini-daemon --host 0.0.0.0 --port 3333
```

## 🎮 使用

### 视图控制

- **旋转**: 左键拖拽
- **缩放**: 鼠标滚轮或双指缩放
- **平移**: 右键拖拽或双指拖拽

### 连接状态

卡片左上角显示实时连接状态:

- 🟢 **Connected** - 已连接到 daemon,数据实时更新
- 🟡 **Connecting...** - 正在连接 daemon
- 🔴 **Disconnected** - 连接断开,尝试重连中
- ❌ **Connection Error** - 连接失败,请检查 daemon 是否运行

### 错误排查

#### 显示 "Connection Failed"

1. **检查 daemon 是否运行**:
   ```bash
   # 在 Reachy Mini 设备上
   curl http://localhost:3333/api/state/full
   ```

2. **检查网络连接**:
   ```bash
   # 在 Home Assistant 设备上
   telnet <daemon_host> 3333
   ```

3. **检查防火墙**:
   ```bash
   # 允许端口 3333
   sudo ufw allow 3333
   ```

4. **查看浏览器控制台** (F12) 查看详细错误信息

#### 机器人不移动

1. 检查 WebSocket 连接状态 (左上角指示器)
2. 确认 daemon 正在发布数据:
   ```bash
   # 检查 WebSocket 端点
   curl http://localhost:3333/api/state/ws/full
   ```
3. 重启 Home Assistant 浏览器窗口 (Ctrl+Shift+R)

#### 性能问题

- 降低卡片高度
- 关闭自动旋转
- 使用有线网络连接
- 关闭其他浏览器标签页

## 🔄 升级从 V1

### 配置迁移

V1 配置 (使用 ESPHome):
```yaml
type: custom:reachy-mini-3d-card
entity_prefix: reachy_mini
height: 400
```

V2 配置 (直接连接):
```yaml
type: custom:reachy-mini-3d-card
daemon_host: localhost
daemon_port: 3333
height: 400
```

### 完全卸载 ESPHome

升级到 V2 后,如果不再需要 ESPHome:

1. 在 Home Assistant 中删除 ESPHome 设备
2. 删除 ESPHome 配置 (YAML)
3. 重启 Home Assistant

## 🆚 V1 vs V2 对比

### 架构对比

**V1 (ESPHome 版本)**:
```
Reachy Mini Daemon → ESPHome → Home Assistant → HA Card
```

**V2 (直接连接版本)**:
```
Reachy Mini Daemon → HA Card (WebSocket)
```

### 数据流对比

**V1**:
1. Daemon 更新 robot state
2. ESPHome 轮询 daemon (每 100ms)
3. ESPHome 更新 HA entities
4. HA Card 从 entities 读取
5. **总延迟**: ~500ms

**V2**:
1. Daemon 发布 WebSocket 数据 (20Hz)
2. HA Card 直接接收 WebSocket
3. **总延迟**: ~50ms

### 优势

✅ **零配置** - 无需 ESPHome 设备和 YAML
✅ **更低延迟** - 10倍实时性提升
✅ **更高可靠性** - 减少中间层故障点
✅ **更易维护** - 与 desktop app 相同的数据源
✅ **实时状态** - 连接指示器显示实时状态

## 🛠️ 开发

```bash
# 克隆仓库
git clone https://github.com/djhui5710/ha-reachy-mini-card.git
cd ha-reachy-mini-card

# 安装依赖
npm install

# 开发模式 (V2)
npm run dev:watch

# 构建 V2 版本
npm run build:v2

# 构建 V1 版本 (向后兼容)
npm run build:v1
```

## 📝 许可证

Apache License 2.0 - 详见 [LICENSE](LICENSE)

## 🤝 贡献

欢迎贡献!请:

1. Fork 仓库
2. 创建特性分支
3. 提交更改
4. 创建 Pull Request

## 📞 支持

- **Issues**: [GitHub Issues](https://github.com/djhui5710/ha-reachy-mini-card/issues)
- **Discussions**: [GitHub Discussions](https://github.com/djhui5710/ha-reachy-mini-card/discussions)

## 🔗 相关项目

- **参考实现**: [reachy-mini-desktop-app](./reachy-mini-desktop-app)
- **机器人制造商**: [Pollen Robotics](https://www.pollen-robotics.com/)
- **原始项目**: [reachy_mini_ha_voice](https://github.com/djhui5710/reachy_mini_ha_voice)

---

<div align="center">

**为 Reachy Mini 社区用 ❤️ 制作**

</div>
