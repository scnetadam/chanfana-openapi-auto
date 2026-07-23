#!/bin/bash
# 龟钮体系 — 服务器一键部署脚本
# 腾讯云CVM: 159.75.17.54 | 域名: x402.chinaauto.ccwu.cc
# 用法: bash server-setup.sh [--skip-ssl] [--skip-nginx] [--skip-services]

set -e

SKIP_SSL=false
SKIP_NGINX=false
SKIP_SERVICES=false

for arg in "$@"; do
  case $arg in
    --skip-ssl) SKIP_SSL=true ;;
    --skip-nginx) SKIP_NGINX=true ;;
    --skip-services) SKIP_SERVICES=true ;;
  esac
done

echo "=============================================="
echo "  龟钮体系 — 服务器部署"
echo "  腾讯云CVM: $(curl -s ifconfig.me 2>/dev/null || echo 'N/A')"
echo "  域名: x402.chinaauto.ccwu.cc"
echo "=============================================="
echo ""

# ========== 1. 系统依赖 ==========
echo "===== [1/6] 安装系统依赖 ====="
apt-get update -qq
apt-get install -y -qq nginx curl openssl python3 python3-pip nodejs npm supervisor 2>/dev/null || true
echo "系统依赖安装完成"
echo ""

# ========== 2. SSL 证书 ==========
if [ "$SKIP_SSL" = false ]; then
  echo "===== [2/6] 部署 SSL 证书 ====="
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  if [ -f "$SCRIPT_DIR/setup-ssl.sh" ]; then
    bash "$SCRIPT_DIR/setup-ssl.sh"
  else
    echo "setup-ssl.sh 未找到，手动部署证书"
    mkdir -p /etc/nginx/ssl
  fi
else
  echo "===== [2/6] 跳过 SSL 证书 ====="
fi
echo ""

# ========== 3. Nginx 配置 ==========
if [ "$SKIP_NGINX" = false ]; then
  echo "===== [3/6] 配置 Nginx ====="
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  CONF_SRC="$SCRIPT_DIR/nginx-guiniu.conf"
  if [ -f "$CONF_SRC" ]; then
    cp "$CONF_SRC" /etc/nginx/conf.d/guiniu.conf
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && echo "Nginx 配置验证通过" || echo "Nginx 配置有误，请检查"
  else
    echo "nginx-guiniu.conf 未找到"
  fi
else
  echo "===== [3/6] 跳过 Nginx ====="
fi
echo ""

# ========== 4. 防火墙 ==========
echo "===== [4/6] 配置防火墙 ====="
ufw allow 80/tcp 2>/dev/null || iptables -A INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || iptables -A INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
ufw allow 3000/tcp 2>/dev/null || true
ufw allow 3001/tcp 2>/dev/null || true
ufw allow 3003/tcp 2>/dev/null || true
echo "防火墙已开放 80/443/3000/3001/3003"
echo ""

# ========== 5. 服务部署 ==========
if [ "$SKIP_SERVICES" = false ]; then
  echo "===== [5/6] 启动后端服务 ====="

  PROJECT_DIR="/opt/guiniu"

  mkdir -p "$PROJECT_DIR"

  cat > /etc/supervisor/conf.d/guiniu-seal.conf << 'EOF'
[program:guiniu-seal]
command=node /opt/guiniu/seal/src/index.js
directory=/opt/guiniu/seal
environment=NODE_ENV="production",PORT="3000"
autostart=true
autorestart=true
stdout_logfile=/var/log/guiniu-seal.log
stderr_logfile=/var/log/guiniu-seal-error.log
EOF

  cat > /etc/supervisor/conf.d/guiniu-deveco.conf << 'EOF'
[program:guiniu-deveco]
command=node /opt/guiniu/deveco/src/index.js
directory=/opt/guiniu/deveco
environment=NODE_ENV="production",PORT="3003"
autostart=true
autorestart=true
stdout_logfile=/var/log/guiniu-deveco.log
stderr_logfile=/var/log/guiniu-deveco-error.log
EOF

  supervisorctl update 2>/dev/null || true
  echo "Supervisor 配置已创建（需先部署代码到 $PROJECT_DIR）"
else
  echo "===== [5/6] 跳过服务部署 ====="
fi
echo ""

# ========== 6. 启动 Nginx ==========
echo "===== [6/6] 启动 Nginx ====="
systemctl enable nginx
systemctl restart nginx
echo ""

# ========== 验证 ==========
echo "===== 部署验证 ====="
echo ""

echo "--- Nginx 状态 ---"
systemctl is-active nginx && echo "Nginx: 运行中" || echo "Nginx: 未运行"

echo ""
echo "--- 端口监听 ---"
ss -tlnp | grep -E ':(80|443|3000|3001|3003) ' || echo "暂无服务监听（需部署后端代码）"

echo ""
echo "--- SSL 证书 ---"
if [ -f /etc/nginx/ssl/cloudflare-origin.pem ]; then
  openssl x509 -in /etc/nginx/ssl/cloudflare-origin.pem -noout -dates 2>/dev/null || echo "证书已存在"
else
  echo "证书未部署"
fi

echo ""
echo "--- HTTPS 测试 ---"
curl -sk https://x402.chinaauto.ccwu.cc/health 2>/dev/null || echo "外部HTTPS暂不可达（需Cloudflare DNS指向此服务器）"
curl -s http://127.0.0.1/health 2>/dev/null || echo "本地HTTP暂不可达"

echo ""
echo "=============================================="
echo "  部署完成!"
echo ""
echo "  Cloudflare 设置提醒:"
echo "  1. DNS: A记录 x402.chinaauto.ccwu.cc → 159.75.17.54 (Proxy开启)"
echo "  2. SSL/TLS: 加密模式选 Full (Strict)"
echo "  3. Edge Certificates: 启用 Always Use HTTPS"
echo "  4. Minimum TLS Version: TLS 1.2"
echo ""
echo "  CVM 控制:"
echo "  开机: https://x402.chinaauto.ccwu.cc/autocvm/start?token=x402-autocvm-2026"
echo "  关机: https://x402.chinaauto.ccwu.cc/autocvm/stop?token=x402-autocvm-2026"
echo "=============================================="
