#!/bin/bash

echo "============================================"
echo " X402-DEVECO 快速修复脚本"
echo "============================================"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${PROJECT_DIR}"

echo ""
echo "正在修复所有已知问题..."
echo ""

# 1. 修复 build-profile.json5
echo "[1/6] 修复 build-profile.json5..."
if grep -q '"name": "debug",' build-profile.json5; then
    sed -i 's/"name": "debug",/"name": "debug"/g' build-profile.json5
    echo "  ✅ 已修复语法错误"
else
    echo "  ✅ 无需修复"
fi

# 2. 添加 modelVersion 到 oh-package.json5
echo "[2/6] 修复 oh-package.json5..."
if ! grep -q '"modelVersion"' oh-package.json5; then
    sed -i '/"license": "MIT",/a\  "modelVersion": "5.0.3",' oh-package.json5
    echo "  ✅ 已添加 modelVersion"
else
    echo "  ✅ modelVersion 已存在"
fi

# 3. 添加 modelVersion 到 entry/oh-package.json5
echo "[3/6] 修复 entry/oh-package.json5..."
if ! grep -q '"modelVersion"' entry/oh-package.json5 2>/dev/null; then
    sed -i '/"license": "",/a\  "modelVersion": "5.0.3",' entry/oh-package.json5
    echo "  ✅ 已添加 modelVersion"
else
    echo "  ✅ modelVersion 已存在"
fi

# 4. 修复 module.json5
echo "[4/6] 修复 module.json5..."
if grep -q '"srcEntry"' entry/src/main/module.json5; then
    sed -i 's/"srcEntry":/"srcEntrance":/g' entry/src/main/module.json5
    echo "  ✅ 已修复 srcEntrance"
else
    echo "  ✅ 无需修复"
fi

# 5. 创建 hvigorw 脚本
echo "[5/6] 创建构建脚本..."
if [ ! -f "hvigorw" ]; then
    cat > hvigorw << 'EOF'
#!/bin/bash
node "$(dirname "$0")/hvigor/hvigor-wrapper.js" "$@"
EOF
    chmod +x hvigorw
    echo "  ✅ 已创建 hvigorw"
fi

if [ ! -f "hvigorw.bat" ]; then
    cat > hvigorw.bat << 'EOF'
@echo off
node "%~dp0hvigor\hvigor-wrapper.js" %*
EOF
    echo "  ✅ 已创建 hvigorw.bat"
fi

# 6. 清理缓存
echo "[6/6] 清理构建缓存..."
rm -rf entry/build/.hvigor .hvigor build 2>/dev/null
echo "  ✅ 已清理"

echo ""
echo "============================================"
echo " ✅ 修复完成！"
echo "============================================"
echo ""
echo "下一步："
echo "  1. 安装 Command Line Tools（如果还没有）"
echo "  2. 运行构建: ./build-docker-x86.sh"
echo ""
