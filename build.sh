#!/bin/bash
# x402-Alipay 构建脚本 — 支持华为云镜像源
# 用法:
#   bash build.sh                          # Docker Hub 默认源
#   bash build.sh latest aliyun           # 阿里云镜像
#   bash build.sh latest tencent          # 腾讯云镜像
#   bash build.sh latest ''               # 不走镜像源（docker pull 直连）

set -e

IMAGE_NAME="x402-alipay"
IMAGE_TAG="${1:-latest}"
FULL_TAG="${IMAGE_NAME}:${IMAGE_TAG}"

# 镜像源选择
MIRROR="${2:-}"
case "${MIRROR}" in
  aliyun|ali)
    REGISTRY="registry.cn-hangzhou.aliyuncs.com/"
    PIP_INDEX="https://mirrors.aliyun.com/pypi/simple/"
    echo "镜像源: 阿里云"
    ;;
  tencent|tx)
    REGISTRY="ccr.ccs.tencentyun.com/"
    PIP_INDEX="https://mirrors.cloud.tencent.com/pypi/simple/"
    echo "镜像源: 腾讯云"
    ;;
  huawei|hw)
    REGISTRY="swr.cn-east-3.myhuaweicloud.com/"
    PIP_INDEX="https://repo.huaweicloud.com/repository/pypi/simple/"
    echo "镜像源: 华为云"
    ;;
  *)
    REGISTRY="docker.io/"
    PIP_INDEX="https://pypi.org/simple/"
    echo "镜像源: 默认（Docker Hub）"
    ;;
esac

cd "$(dirname "$0")"

echo "============================================"
echo "  构建 ${FULL_TAG}"
echo "  镜像仓库: ${REGISTRY}"
echo "  pip 源: ${PIP_INDEX}"
echo "============================================"

# 检查 .env
if [ ! -f .env ]; then
    echo "错误: .env 文件不存在！"
    exit 1
fi

# 语法检查
echo ""
echo "-> 语法检查..."
for f in server.py payment_backends/*.py; do
    python -m py_compile "$f" && echo "  $f OK"
done

echo ""
echo "-> 构建 Docker 镜像..."
docker build \
    --build-arg "REGISTRY=${REGISTRY}" \
    --build-arg "PIP_INDEX=${PIP_INDEX}" \
    -t "${FULL_TAG}" .

echo ""
echo "============================================"
echo "  构建成功！"
echo ""
echo "  运行:"
echo "    docker run -d -p 8000:8000 ${FULL_TAG}"
echo ""
echo "  测试:"
echo "    curl http://localhost:8000"
echo "============================================"
