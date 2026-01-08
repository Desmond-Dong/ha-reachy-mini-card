# 🚀 快速开始 - 发布 V2.0.0

## 立即发布的 5 个步骤

### 1️⃣ 提交代码

```bash
git add .
git commit -m "chore: prepare V2.0.0 release"
git push origin main
```

### 2️⃣ 创建 Tag

```bash
git tag -a v2.0.0 -m "Release V2.0.0: Direct Daemon Connection"
git push origin v2.0.0
```

### 3️⃣ 等待自动构建

GitHub Actions 会自动:
- ✅ 构建 V2 代码
- ✅ 打包所有资源
- ✅ 创建 Release
- ✅ 上传 zip 文件

### 4️⃣ 验证 Release

访问: https://github.com/Desmond-Dong/ha-reachy-mini-card/releases

检查:
- ✅ v2.0.0 release 已创建
- ✅ `ha-reachy-mini-card.zip` 已上传
- ✅ Release 说明完整

### 5️⃣ 测试安装

```bash
# 下载 release
wget https://github.com/Desmond-Dong/ha-reachy-mini-card/releases/download/v2.0.0/ha-reachy-mini-card.zip

# 验证内容
unzip -l ha-reachy-mini-card.zip
```

---

## 📦 自动化流程说明

### 构建流程

```
推送 tag (v2.0.0)
    ↓
GitHub Actions 触发
    ↓
安装依赖 (npm install)
    ↓
构建代码 (npm run build:v2)
    ↓
复制资源 (assets + lib)
    ↓
创建 zip 包
    ↓
验证完整性
    ↓
创建 GitHub Release
    ↓
上传文件 ✅
```

### Release 包内容

```
ha-reachy-mini-card.zip (约 5-10 MB)
├── reachy-mini-3d-card.js         # 主文件 (约 30KB)
├── reachy-mini-3d-card.js.map      # Source map (约 100KB)
├── README.md                       # 快速指南
├── assets/                         # 机器人资源
│   ├── reachy-mini.urdf            # 定义文件 (约 50KB)
│   └── meshes/                     # 3D 模型 (约 5MB)
│       └── *.stl                   # 45 个文件
└── lib/
    └── urdf-loader.js              # 加载器库 (约 50KB)
```

### 自动验证

GitHub Actions 会自动检查:

- ✅ `reachy-mini-3d-card.js` 存在
- ✅ `assets/reachy-mini.urdf` 存在
- ✅ `lib/urdf-loader.js` 存在
- ✅ 45 个 STL 文件全部存在

如果任何文件缺失,构建会失败并提示。

---

## 🎯 HACS 用户如何使用

### 安装

1. 打开 HACS → Frontend
2. 搜索 "Reachy Mini 3D Card"
3. 点击下载 v2.0.0
4. 刷新 Home Assistant

### 配置

```yaml
type: custom:reachy-mini-3d-card
daemon_host: localhost
daemon_port: 3333
height: 400
```

### 完成!

用户会看到:
- 🟢 连接状态指示器 (左上角)
- 🤖 实时 3D 机器人模型
- 🎮 交互控制按钮

---

## 🔧 本地测试命令

在发布前,您可以本地测试:

```bash
# 安装依赖
npm install

# 构建 V2
npm run build:v2

# 检查输出
ls -lah dist/

# 应该看到:
# reachy-mini-3d-card.js (约 30KB)
# reachy-mini-3d-card.js.map (约 100KB)
```

```bash
# 复制资源
cp -r assets dist/
mkdir -p dist/lib
cp node_modules/urdf-loader/src/URDFLoader.js dist/lib/urdf-loader.js

# 验证
ls -la dist/assets/meshes/ | wc -l  # 应该是 45
ls -la dist/lib/                     # 应该有 urdf-loader.js
```

```bash
# 创建测试 zip
mkdir -p test-release
cp dist/reachy-mini-3d-card.js test-release/
cp -r dist/assets test-release/
cp -r dist/lib test-release/
cd test-release
zip -r ../test.zip .
cd ..

# 验证 zip
unzip -l test.zip | less
```

---

## ✅ 发布前最终检查

- [ ] 所有代码已提交
- [ ] Tag 已创建并推送
- [ ] GitHub Actions 构建成功
- [ ] Release 已创建
- [ ] zip 文件完整
- [ ] 文档齐全

全部打勾? 🎉 **发布成功!**

---

## 📞 遇到问题?

### 构建失败

查看 GitHub Actions 日志:
1. 进入仓库 → Actions 标签
2. 点击最新的构建
3. 查看详细错误信息

### Release 创建失败

检查:
1. Tag 格式是否正确 (必须是 `v` 开头,如 `v2.0.0`)
2. GitHub Token 权限是否足够
3. 仓库设置是否允许创建 Releases

### 文件缺失

本地测试构建:
```bash
npm run build:v2
ls -la dist/
```

确保 `dist/` 目录包含所有文件。

---

**准备好了吗?** 让我们发布 V2.0.0! 🚀
