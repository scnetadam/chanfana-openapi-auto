#!/bin/bash

echo "============================================"
echo " X402-DEVECO 构建问题自动修复脚本"
echo " 华为云 4C8G AMDx86 + Docker"
echo "============================================"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${PROJECT_DIR}"

echo ""
echo "[1/10] 检查项目结构..."
echo ""

MISSING_FILES=0

if [ ! -f "package.json" ]; then
    echo "❌ 缺少 package.json"
    MISSING_FILES=1
fi

if [ ! -f "oh-package.json5" ]; then
    echo "❌ 缺少 oh-package.json5"
    MISSING_FILES=1
fi

if [ ! -f "build-profile.json5" ]; then
    echo "❌ 缺少 build-profile.json5"
    MISSING_FILES=1
fi

if [ ! -f "hvigor/hvigor-config.json5" ]; then
    echo "❌ 缺少 hvigor/hvigor-config.json5"
    MISSING_FILES=1
fi

if [ ! -d "entry/src/main/ets" ]; then
    echo "❌ 缺少源代码目录"
    MISSING_FILES=1
fi

if [ $MISSING_FILES -eq 1 ]; then
    echo ""
    echo "错误: 项目结构不完整"
    exit 1
fi

echo "✅ 项目结构完整"

echo ""
echo "[2/10] 检查配置文件..."
echo ""

if grep -q '"name": "debug",' build-profile.json5; then
    echo "⚠️  发现 build-profile.json5 语法错误，正在修复..."
    sed -i 's/"name": "debug",/"name": "debug"/g' build-profile.json5
    echo "✅ 已修复 build-profile.json5"
else
    echo "✅ build-profile.json5 正常"
fi

if ! grep -q '"modelVersion"' oh-package.json5; then
    echo "⚠️  oh-package.json5 缺少 modelVersion，正在添加..."
    sed -i '/"license": "MIT",/a\  "modelVersion": "5.0.3",' oh-package.json5
    echo "✅ 已添加 modelVersion"
else
    echo "✅ oh-package.json5 包含 modelVersion"
fi

if ! grep -q '"modelVersion"' entry/oh-package.json5 2>/dev/null; then
    echo "⚠️  entry/oh-package.json5 缺少 modelVersion，正在添加..."
    sed -i '/"license": "",/a\  "modelVersion": "5.0.3",' entry/oh-package.json5
    echo "✅ 已添加 modelVersion 到 entry"
else
    echo "✅ entry/oh-package.json5 包含 modelVersion"
fi

echo ""
echo "[3/10] 检查 module.json5..."
echo ""

if grep -q '"srcEntry"' entry/src/main/module.json5; then
    echo "⚠️  发现 srcEntry 字段，正在修复为 srcEntrance..."
    sed -i 's/"srcEntry":/"srcEntrance":/g' entry/src/main/module.json5
    echo "✅ 已修复 module.json5"
else
    echo "✅ module.json5 正常"
fi

echo ""
echo "[4/10] 检查 ArkTS 代码问题..."
echo ""

ASYNC_ISSUES=$(grep -r "async aboutToAppear" entry/src/main/ets --include="*.ets" | wc -l)

if [ "$ASYNC_ISSUES" -gt 0 ]; then
    echo "⚠️  发现 $ASYNC_ISSUES 个 async aboutToAppear 问题"
    echo "   这需要手动修复，请参考 FIXES_APPLIED.md"
    echo ""
    echo "   受影响的文件:"
    grep -r "async aboutToAppear" entry/src/main/ets --include="*.ets" | cut -d: -f1 | sort -u
else
    echo "✅ 未发现 async aboutToAppear 问题"
fi

echo ""
echo "[5/10] 检查 npm 依赖..."
echo ""

if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules 不存在，正在安装依赖..."
        npm install --registry=https://repo.huaweicloud.com/repository/npm/ --legacy-peer-deps
    if [ $? -ne 0 ]; then
        echo "❌ npm 安装失败"
        exit 1
    fi
    echo "✅ 依赖安装完成"
else
    OHOS_PACKAGES=$(ls node_modules/@ohos 2>/dev/null | wc -l)
    if [ "$OHOS_PACKAGES" -eq 0 ]; then
        echo "⚠️  @ohos 包未安装，正在重新安装..."
    npm install --registry=https://repo.huaweicloud.com/repository/npm/ --legacy-peer-deps
    else
        echo "✅ node_modules 存在，包含 $OHOS_PACKAGES 个 @ohos 包"
    fi
fi

echo ""
echo "[6/10] 检查 hvigorw 脚本..."
echo ""

if [ ! -f "hvigorw" ]; then
    echo "⚠️  创建 hvigorw 脚本..."
    cat > hvigorw << 'EOF'
#!/bin/bash
node "$(dirname "$0")/hvigor/hvigor-wrapper.js" "$@"
EOF
    chmod +x hvigorw
    echo "✅ 已创建 hvigorw"
else
    echo "✅ hvigorw 存在"
fi

if [ ! -f "hvigorw.bat" ]; then
    echo "⚠️  创建 hvigorw.bat 脚本..."
    cat > hvigorw.bat << 'EOF'
@echo off
node "%~dp0hvigor\hvigor-wrapper.js" %*
EOF
    echo "✅ 已创建 hvigorw.bat"
else
    echo "✅ hvigorw.bat 存在"
fi

echo ""
echo "[7/10] 检查 hvigor-wrapper.js..."
echo ""

if ! grep -q "return '5.15.5'" hvigor/hvigor-wrapper.js; then
    echo "⚠️  修复 hvigor-wrapper.js 版本获取..."
    sed -i 's/const match = content.match.*$/return '\''5.15.5'\'';/g' hvigor/hvigor-wrapper.js
    echo "✅ 已修复 hvigor-wrapper.js"
else
    echo "✅ hvigor-wrapper.js 正常"
fi

echo ""
echo "[8/10] 检查 .npmrc 配置..."
echo ""

if [ ! -f ".npmrc" ]; then
    echo "⚠️  创建 .npmrc..."
    cat > .npmrc << 'EOF'
registry=https://repo.huaweicloud.com/repository/npm/
@ohos:registry=https://repo.harmonyos.com/npm/
strict-ssl=false
EOF
    echo "✅ 已创建 .npmrc"
else
    echo "✅ .npmrc 存在"
fi

echo ""
echo "[9/10] 清理构建缓存..."
echo ""

rm -rf entry/build/.hvigor 2>/dev/null
rm -rf .hvigor 2>/dev/null
rm -rf build 2>/dev/null

echo "✅ 已清理构建缓存"

echo ""
echo "[10/10] 验证修复结果..."
echo ""

ERRORS=0

if grep -q '"name": "debug",' build-profile.json5; then
    echo "❌ build-profile.json5 仍有错误"
    ERRORS=1
else
    echo "✅ build-profile.json5 正确"
fi

if ! grep -q '"modelVersion"' oh-package.json5; then
    echo "❌ oh-package.json5 缺少 modelVersion"
    ERRORS=1
else
    echo "✅ oh-package.json5 正确"
fi

if grep -q '"srcEntry"' entry/src/main/module.json5; then
    echo "❌ module.json5 仍有 srcEntry"
    ERRORS=1
else
    echo "✅ module.json5 正确"
fi

if [ ! -d "node_modules/@ohos/hvigor" ]; then
    echo "❌ @ohos/hvigor 未安装"
    ERRORS=1
else
    echo "✅ @ohos/hvigor 已安装"
fi

echo ""
echo "============================================"

if [ $ERRORS -eq 0 ]; then
    echo " ✅ 所有检查通过！"
    echo "============================================"
    echo ""
    echo "下一步操作："
    echo ""
    echo "1. 确保 Command Line Tools 已安装："
    echo "   ls ~/commandline-tools/sdk/openharmony"
    echo ""
    echo "2. 运行 Docker 构建："
    echo "   ./build-docker-x86.sh"
    echo ""
    echo "3. 或运行裸机构建："
    echo "   ./build-cloud.sh"
    echo ""
else
    echo " ❌ 仍有错误需要手动修复"
    echo "============================================"
    echo ""
    echo "请查看以下文档："
    echo "  - ISSUES_FOUND.md"
    echo "  - FIXES_APPLIED.md"
    echo ""
    exit 1
fi
