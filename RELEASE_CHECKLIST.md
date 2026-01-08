# V2.0.0 Release Checklist

## 📋 发布前检查清单

### ✅ 代码准备
- [x] V2 代码完成 (`src/reachy-mini-3d-card-v2.js`)
- [x] Rollup 配置更新 (`rollup.config.v2.js`)
- [x] package.json 更新 (版本 2.0.0)
- [x] GitHub Actions 工作流更新
- [x] 所有文档创建完成

### ✅ 资源文件验证
- [x] 45 个 STL mesh 文件
- [x] URDF 定义文件
- [x] urdf-loader 库文件

### ✅ 文档完整性
- [x] README-V2.md
- [x] MIGRATION_GUIDE.md
- [x] TECHNICAL_COMPARISON.md
- [x] PROJECT_STRUCTURE.md

## 🚀 发布步骤

### 步骤 1: 提交所有更改

```bash
git add .
git status
git commit -m "chore: prepare for V2.0.0 release

- Add V2 direct connection version
- Update build scripts for V2
- Update GitHub Actions workflow
- Add comprehensive documentation
- Update .gitignore
- Bump version to 2.0.0"
```

### 步骤 2: 推送到 GitHub

```bash
git push origin main
```

### 步骤 3: 创建并推送 Git Tag

```bash
# 创建带注释的 tag
git tag -a v2.0.0 -m "Release V2.0.0: Direct Daemon Connection

Major Features:
- Direct WebSocket connection to Reachy Mini daemon
- 10x lower latency (500ms → 50ms)
- Real-time connection status indicator
- Auto-reconnection with exponential backoff
- No ESPHome dependency

Breaking Changes:
- Configuration changed from entity_prefix to daemon_host/daemon_port
- Requires Reachy Mini daemon running on accessible port"

# 推送 tag
git push origin v2.0.0
```

### 步骤 4: GitHub Actions 自动构建

推送 tag 后,GitHub Actions 会自动:

1. ✅ 构建代码 (`npm run build:v2`)
2. ✅ 复制资源文件 (assets + lib)
3. ✅ 创建 HACS release 包 (`ha-reachy-mini-card.zip`)
4. ✅ 验证包完整性 (检查所有必需文件)
5. ✅ 创建 GitHub Release
6. ✅ 上传 release 文件

### 步骤 5: 验证 Release

1. 前往 GitHub Releases 页面
2. 检查 v2.0.0 release 是否创建
3. 验证附件:
   - `ha-reachy-mini-card.zip` (HACS 安装包)
   - `reachy-mini-3d-card.js` (单独的 JS 文件)
4. 检查 release 说明是否完整

### 步骤 6: 下载并测试 Release

```bash
# 下载 release
wget https://github.com/Desmond-Dong/ha-reachy-mini-card/releases/download/v2.0.0/ha-reachy-mini-card.zip

# 验证内容
unzip -l ha-reachy-mini-card.zip

# 应该看到:
# reachy-mini-3d-card.js
# reachy-mini-3d-card.js.map
# assets/reachy-mini.urdf
# assets/meshes/*.stl (45 files)
# lib/urdf-loader.js
# README.md
```

### 步骤 7: 提交到 HACS (如果还没有)

如果项目还没有在 HACS 中:

1. 前往 https://hacs.xyz
2. 点击 "Submit a new repository to the default store"
3. 填写信息:
   - **Category**: Frontend
   - **Full Name**: Desmond-Dong/ha-reachy-mini-card
   - **Description**: 3D visualization card for Reachy Mini robot with direct daemon connection
4. 提交并等待审核

## 📦 Release 包内容

最终用户下载的 `ha-reachy-mini-card.zip` 应包含:

```
ha-reachy-mini-card.zip
├── reachy-mini-3d-card.js        # 主卡片代码
├── reachy-mini-3d-card.js.map     # Source map
├── README.md                      # 快速开始指南
├── assets/
│   ├── reachy-mini.urdf          # 机器人定义
│   └── meshes/                   # 45 个 STL 文件
│       ├── 5w_speaker.stl
│       ├── antenna.stl
│       ├── ... (共 45 个)
│       └── stewart_tricap_3dprint.stl
└── lib/
    └── urdf-loader.js            # URDF 加载器库
```

## 🎯 用户安装方式

### HACS 安装 (推荐)

用户只需:

1. 打开 HACS
2. 搜索 "Reachy Mini 3D Card"
3. 点击下载
4. 配置并使用

### 手动安装

用户可以:

1. 从 GitHub Releases 下载 `ha-reachy-mini-card.zip`
2. 解压到 `/config/www/community/reachy-mini-3d-card/`
3. 添加到 Lovelace resources

## 🧪 本地测试构建

在发布前,您可以本地测试构建:

```bash
# 安装依赖
npm install

# 构建 V2
npm run build:v2

# 复制资源
cp -r assets dist/
mkdir -p dist/lib
cp node_modules/urdf-loader/src/URDFLoader.js dist/lib/urdf-loader.js

# 检查输出
ls -la dist/
ls -la dist/assets/meshes/ | wc -l  # 应该是 45
ls -la dist/lib/

# 创建测试 zip
mkdir -p release
cp dist/reachy-mini-3d-card.js release/
cp -r dist/assets release/
cp -r dist/lib release/
cd release
zip -r ../test-release.zip .
cd ..

# 验证
unzip -l test-release.zip
```

## 📊 发布后监控

发布后,请监控:

1. **GitHub Actions**: 检查构建是否成功
2. **Issues**: 关注用户报告的问题
3. **Stars/Forks**: 观察项目关注度
4. **HACS**: 检查是否通过审核

## 🔄 后续版本规划

### V2.0.1 (Bugfix)
- 修复用户报告的问题
- 改进错误提示
- 性能优化

### V2.1.0 (Features)
- 添加更多自定义选项
- 支持多机器人
- 改进 UI

### V3.0.0 (Major)
- 全新架构
- 突破性功能

## 💡 提示

1. **首次发布**: 第一次发布 V2.0.0,需要仔细测试
2. **向后兼容**: V2 不兼容 V1 配置,需要明确说明
3. **文档完整**: 确保所有文档都已更新
4. **测试充分**: 在真实环境中测试所有功能
5. **响应及时**: 发布后及时回应用户问题

## 🎉 发布成功!

如果看到:

- ✅ GitHub Actions 构建成功
- ✅ Release 创建成功
- ✅ zip 文件包含所有必需文件
- ✅ 本地测试通过

那么恭喜您!V2.0.0 发布成功! 🎊

---

**准备好发布了吗?** 让我们开始吧! 🚀
