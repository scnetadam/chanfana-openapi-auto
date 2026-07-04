#!/bin/bash

echo "============================================"
echo " 环境检查脚本"
echo " 华为云 4C8G AMDx86"
echo "============================================"

echo ""
echo "[系统信息]"
echo "架构: $(uname -m)"
echo "CPU: $(nproc) 核心"
echo "内存: $(free -h | awk '/^Mem:/{print $2}')"
echo "磁盘: $(df -h . | awk 'NR==2{print $4 " 可用"}')"
echo "系统: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"

echo ""
echo "[Docker]"
if command -v docker &> /dev/null; then
    echo "版本: $(docker --version)"
    echo "状态: $(systemctl is-active docker 2>/dev/null || echo '未运行')"
    echo "内存: $(docker info 2>/dev/null | grep 'Memory' || echo '未知')"
else
    echo "❌ 未安装 Docker"
    echo "   安装: sudo dnf install -y docker"
fi

echo ""
echo "[Java]"
if command -v java &> /dev/null; then
    echo "版本: $(java -version 2>&1 | head -1)"
    echo "路径: $(which java)"
else
    echo "❌ 未安装 Java"
    echo "   安装: sudo dnf install -y java-17-openjdk-headless"
fi

echo ""
echo "[Node.js]"
if command -v node &> /dev/null; then
    echo "版本: $(node --version)"
    echo "路径: $(which node)"
    echo "npm: $(npm --version)"
else
    echo "❌ 未安装 Node.js"
    echo "   安装: 见 euler-init.sh"
fi

echo ""
echo "[Command Line Tools]"
CLT_DIR="$HOME/commandline-tools"
if [ -d "$CLT_DIR" ]; then
    echo "路径: $CLT_DIR"
    echo "SDK: $(ls $CLT_DIR/sdk/openharmony 2>/dev/null | head -3 || echo '未找到')"
    if command -v ohpm &> /dev/null; then
        echo "ohpm: $(ohpm --version 2>/dev/null || echo '已安装')"
    fi
else
    echo "❌ 未找到 Command Line Tools"
    echo "   下载: https://developer.huawei.com/consumer/cn/deveco-studio/"
    echo "   解压: unzip commandline-tools-linux-x64-*.zip -d ~/commandline-tools/"
fi

echo ""
echo "[内存建议]"
TOTAL_MEM=$(free -g | awk '/^Mem:/{print $2}')
if [ "$TOTAL_MEM" -lt 6 ]; then
    echo "⚠️  内存不足 6GB，建议创建 Swap"
    echo "   sudo fallocate -l 8G /swapfile"
    echo "   sudo chmod 600 /swapfile"
    echo "   sudo mkswap /swapfile"
    echo "   sudo swapon /swapfile"
else
    echo "✅ 内存充足 ($TOTAL_MEM GB)"
fi

echo ""
echo "============================================"
