# x402-Alipay Demo — 华为云构建镜像
# 支持通过构建参数指定镜像源和 pip 源
#
# 使用（默认 Docker Hub）：
#   docker build -t x402-alipay .
#
# 使用阿里云镜像（华为云推荐）：
#   docker build --build-arg REGISTRY=registry.cn-hangzhou.aliyuncs.com/ --build-arg PIP_INDEX=https://mirrors.aliyun.com/pypi/simple/ -t x402-alipay .
#
# 使用腾讯云镜像：
#   docker build --build-arg REGISTRY=ccr.ccs.tencentyun.com/ --build-arg PIP_INDEX=https://mirrors.cloud.tencent.com/pypi/simple/ -t x402-alipay .

ARG REGISTRY=docker.io/
ARG PIP_INDEX=https://pypi.org/simple/

FROM ${REGISTRY}python:3.12-slim

# 暴露构建参数给后续层
ARG PIP_INDEX

WORKDIR /x402-alipay

# 安装系统依赖（cryptography 需要编译）
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 先复制 requirements 安装依赖（利用 Docker 缓存）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i ${PIP_INDEX}

# 复制项目文件
COPY .env .
COPY server.py .
COPY payment_backends/ ./payment_backends/

# 暴露端口
EXPOSE 8000

# 启动服务
CMD ["python", "server.py"]
