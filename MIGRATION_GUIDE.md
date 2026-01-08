# 从 V1 迁移到 V2 指南

本指南帮助您从使用 ESPHome 的 V1 版本迁移到直接连接的 V2 版本。

## 📋 迁移前检查清单

- [ ] Reachy Mini daemon 正在运行 (端口 3333)
- [ ] 知道 daemon 的主机地址 (localhost 或 IP 地址)
- [ ] Home Assistant 2023.11.0 或更高版本
- [ ] 已安装 V1 版本的卡片

## 🔄 迁移步骤

### 步骤 1: 备份当前配置

在迁移前,建议备份您的仪表板配置:

1. 前往 **Settings** → **Dashboard**
2. 找到您的仪表板
3. 点击 **...** → **Download** 备份当前配置

### 步骤 2: 记录当前 V1 配置

打开仪表板编辑,找到您的 Reachy Mini 卡片,记录当前配置:

**V1 配置示例**:
```yaml
type: custom:reachy-mini-3d-card
entity_prefix: reachy_mini
height: 400
show_controls: true
auto_rotate: false
```

### 步骤 3: 测试 Daemon 连接

在迁移前,确保能连接到 Reachy Mini daemon:

**选项 A: Daemon 在同一设备上 (USB 模式)**
```bash
# 在 Home Assistant 设备上测试
curl http://localhost:3333/api/state/full
```

**选项 B: Daemon 在网络设备上 (WiFi 模式)**
```bash
# 替换为 Reachy Mini 的 IP 地址
curl http://192.168.1.100:3333/api/state/full
```

如果返回 JSON 数据,说明连接正常。

### 步骤 4: 更新卡片配置

#### 方法 1: 使用可视化编辑器 (推荐)

1. 编辑仪表板
2. 点击卡片右上角的 **⚙️** 图标
3. 更新配置:
   - **Daemon Host**: `localhost` (USB 模式) 或 `192.168.1.100` (WiFi 模式)
   - **Daemon Port**: `3333`
   - **Height**: 保持原值
4. 点击 **Save**

#### 方法 2: 使用 YAML 编辑器

1. 编辑仪表板
2. 点击卡片,选择 **Edit in YAML**
3. 替换配置:

**旧配置 (V1)**:
```yaml
type: custom:reachy-mini-3d-card
entity_prefix: reachy_mini
height: 400
show_controls: true
auto_rotate: false
```

**新配置 (V2)**:
```yaml
type: custom:reachy-mini-3d-card
daemon_host: localhost      # 新增
daemon_port: 3333           # 新增
height: 400
show_controls: true
auto_rotate: false
```

**WiFi 模式示例**:
```yaml
type: custom:reachy-mini-3d-card
daemon_host: 192.168.1.100  # Reachy Mini 的 IP
daemon_port: 3333
height: 400
show_controls: true
auto_rotate: false
```

### 步骤 5: 验证迁移

1. 刷新浏览器页面 (Ctrl+Shift+R)
2. 检查卡片左上角的连接状态:
   - 🟢 **Connected** - 迁移成功!
   - 🟡 **Connecting...** - 正在连接,等待几秒
   - ❌ **Connection Error** - 查看错误排查部分
3. 验证机器人模型实时更新

### 步骤 6: (可选) 清理 ESPHome

如果迁移成功且不再需要 ESPHome:

1. **删除 ESPHome 设备**:
   - 前往 **Settings** → **Devices & services**
   - 找到 Reachy Mini ESPHome 设备
   - 点击 **...** → **Delete**

2. **删除 ESPHome 配置** (如果手动配置):
   - 编辑 `configuration.yaml`
   - 删除 Reachy Mini 的 ESPHome 条目
   - 重启 Home Assistant

## ⚠️ 常见问题

### 问题 1: 连接失败 - "Connection Error"

**原因**: 无法连接到 Reachy Mini daemon

**解决方案**:
1. 确认 daemon 正在运行:
   ```bash
   # 在 Reachy Mini 设备上
   ps aux | grep reachy-mini-daemon
   ```

2. 检查端口是否开放:
   ```bash
   # 在 Home Assistant 设备上
   telnet <daemon_host> 3333
   ```

3. 检查防火墙规则:
   ```bash
   # 在 Reachy Mini 设备上
   sudo ufw allow 3333
   ```

### 问题 2: 机器人不移动

**原因**: WebSocket 连接成功,但数据未更新

**解决方案**:
1. 检查浏览器控制台 (F12) 查看 WebSocket 消息
2. 验证 daemon 是否发布数据:
   ```bash
   curl http://<daemon_host>:3333/api/state/full
   ```
3. 重启 Reachy Mini daemon

### 问题 3: 性能下降

**原因**: 高频率更新 (20Hz) 可能影响性能

**解决方案**:
- 降低卡片高度
- 关闭自动旋转
- 使用有线网络
- 考虑降低 WebSocket 频率 (需要修改代码)

## 🎯 迁移后的优势

迁移成功后,您将获得:

✅ **10倍更低的延迟** - 从 500ms 降至 50ms
✅ **零 ESPHome 配置** - 移除中间层
✅ **实时状态指示器** - 连接状态一目了然
✅ **自动重连机制** - 网络波动自动恢复
✅ **更简单的维护** - 与 desktop app 相同的数据源

## 🔄 回滚到 V1

如果需要回滚到 ESPHome 版本:

1. 恢复备份的配置 (步骤 1)
2. 重新添加 ESPHome 设备
3. 使用旧配置:
   ```yaml
   type: custom:reachy-mini-3d-card
   entity_prefix: reachy_mini
   height: 400
   ```

## 📞 获取帮助

如果迁移过程中遇到问题:

1. 查看 [完整文档](./README-V2.md)
2. 检查 [GitHub Issues](https://github.com/djhui5710/ha-reachy-mini-card/issues)
3. 创建新的 Issue 并包含:
   - 错误截图
   - 浏览器控制台日志 (F12)
   - Home Assistant 版本
   - Daemon 配置

## ✅ 迁移成功检查清单

迁移完成后,确认:

- [ ] 卡片显示 🟢 Connected 状态
- [ ] 机器人模型实时更新
- [ ] 控制按钮正常工作
- [ ] 配置面板可以打开
- [ ] 浏览器控制台无错误信息

全部完成?恭喜您成功迁移到 V2! 🎉
