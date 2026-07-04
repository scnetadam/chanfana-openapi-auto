#!/bin/bash
set -e

echo "============================================"
echo " X402-DEVECO Mirror Fix (openEuler native)"
echo "============================================"

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: Please run as root (sudo ./fix-mirror.sh)"
  exit 1
fi

ARCH=$(uname -m)
echo "Architecture: ${ARCH}"

echo ""
echo "[1/3] Fixing /etc/docker/daemon.json ..."
mkdir -p /etc/docker
if [ -f /etc/docker/daemon.json ]; then
  cp /etc/docker/daemon.json /etc/docker/daemon.json.bak.$(date +%Y%m%d%H%M%S)
  echo "  Backed up old daemon.json"
fi

cat > /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://docker.m.daocloud.io"
  ],
  "max-concurrent-downloads": 2,
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}
EOF
echo "  New mirrors: 163 + Baidu + DaoCloud"
cat /etc/docker/daemon.json

echo ""
echo "[2/3] Restarting Docker ..."
systemctl restart docker || service docker restart
echo "  Docker restarted"

echo ""
echo "[3/3] Pre-pulling openeuler:22.03 (native ${ARCH})..."
docker pull openeuler/openeuler:22.03
if [ $? -eq 0 ]; then
  echo "  openeuler:22.03 pull SUCCESS"
else
  echo "  openeuler:22.03 pull failed, trying alternatives..."
  docker pull docker.io/openeuler/openeuler:22.03 || \
  docker pull swr.cn-north-1.myhuaweicloud.com/openeuler/openeuler:22.03 || \
  echo "  WARN: All pull attempts failed, check network"
fi

echo ""
echo "============================================"
echo " Mirror fix complete!"
echo " Now run: cd /home/root/x402-deveco && chmod +x docker-build.sh && ./docker-build.sh"
echo "============================================"
