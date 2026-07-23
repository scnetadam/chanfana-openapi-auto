#!/bin/bash
# 龟钮体系 — Cloudflare Origin CA SSL 证书部署脚本
# 腾讯云CVM: 159.75.17.54
# 域名: x402.chinaauto.ccwu.cc
# 用法: bash setup-ssl.sh

set -e

echo "===== 龟钮体系 SSL 证书部署 ====="
echo "域名: x402.chinaauto.ccwu.cc"
echo ""

SSL_DIR="/etc/nginx/ssl"
mkdir -p "$SSL_DIR"

cat > "$SSL_DIR/cloudflare-origin.pem" << 'PEM_EOF'
-----BEGIN CERTIFICATE-----
MIIErjCCA5agAwIBAgIUb3HB1fKL3JpPRs41wfl6ZH99YI0wDQYJKoZIhvcNAQEL
BQAwgYsxCzAJBgNVBAYTAlVTMRkwFwYDVQQKExBDbG91ZEZsYXJlLCBJbmMuMTQw
MgYDVQQLEytDbG91ZEZsYXJlIE9yaWdpbiBTU0wgQ2VydGlmaWNhdGUgQXV0aG9y
aXR5MRYwFAYDVQQHEw1TYW4gRnJhbmNpc2NvMRMwEQYDVQQIEwpDYWxpZm9ybmlh
MB4XDTI2MDcyMTE4MjEwMFoXDTQxMDcxNzE4MjEwMFowYjEZMBcGA1UEChMQQ2xv
dWRGbGFyZSwgSW5jLjEdMBsGA1UECxMUQ2xvdWRGbGFyZSBPcmlnaW4gQ0ExJjAk
BgNVBAMTHUNsb3VkRmxhcmUgT3JpZ2luIENlcnRpZmljYXRlMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwcjtoOar3k9pME9MZJx/fhryJQR0TV/6HisK
gdYw5FdAz5RDTXhEmBD5voaBV2dbYbOXPoulg51usPxVzPxQCmBM33F1LRXbTQDl
39VP5sOy4hZ79Bhz84j4aPhy+16Y9HAyQBe7lJsckxsuagFejPvO0zhMx8A08LHh
OxT1oEsnlXPTAhyiIPk+pIIGlXdy1cFWUci6k3NuJSJ8EXxK2ELTYk5Oa9zQr8PD
TQaRsKXX3ZD5wacJ4t9jQPBwd3egTYs2/f3NLqGIwg9w/Jp1CJnrGv4b5rQbD4V/
BYJ4ZBI/f8vBgnav9ER3m+6rSZBIEwGTiun8/Ed+6MGIsBxjSQIDAQABo4IBMDCC
ASwwDgYDVR0PAQH/BAQDAgWgMB0GA1UdJQQWMBQGCCsGAQUFBwMCBggrBgEFBQcD
ATAMBgNVHRMBAf8EAjAAMB0GA1UdDgQWBBTpGrFamu9sHr+jGCr1aZxYky7sWjAf
BgNVHSMEGDAWgBQk6FNXXXw0QIep65TbuuEWePwppDBABggrBgEFBQcBAQQ0MDIw
MAYIKwYBBQUHMAGGJGh0dHA6Ly9vY3NwLmNsb3VkZmxhcmUuY29tL29yaWdpbl9j
YTAxBgNVHREEKjAoghMqLmNoaW5hYXV0by5jY3d1LmNjghFjaGluYWF1dG8uY2N3
dS5jYzA4BgNVHR8EMTAvMC2gK6AphidodHRwOi8vY3JsLmNsb3VkZmxhcmUuY29t
L29yaWdpbl9jYS5jcmwwDQYJKoZIhvcNAQELBQADggEBAFiweRAid/XlKnAdw4Hz
VHKfWEXO8IFKqRXU6MIcBCSPoSwvHuALXyGN9D6Vlv+ScC/yM8QH+84uo9EaQ+7j
zA1QKkcxxqCOM4G8h8UF7/byDKTSSZuc+qcwzwbW2ylhoNrINdYZHB1IDFaU1Bp+
MxX+lceL7IHKqy2Z0kfVHrol92yJKH5g9hNlF4t37NJimcHrfXlk/+uQsnj1+jhQ
E89FAnx72m3sSNkqF+0QG4IcPnhAuQ+W3SMEAW5yR0Sk4zoWC7CcMbdgk0G/8uVR
cSI/16+WEr8pbcxIFDfo1Ak693RGnlk9tt648vHC+EiEaVW5e6WWXKra8TLpvZWq
U+Q=
-----END CERTIFICATE-----
PEM_EOF

cat > "$SSL_DIR/cloudflare-origin.key" << 'KEY_EOF'
-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDByO2g5qveT2kw
T0xknH9+GvIlBHRNX/oeKwqB1jDkV0DPlENNeESYEPm+hoFXZ1ths5c+i6WDnW6w
/FXM/FAKYEzfcXUtFdtNAOXf1U/mw7LiFnv0GHPziPho+HL7Xpj0cDJAF7uUmxyT
Gy5qAV6M+87TOEzHwDTwseE7FPWgSyeVc9MCHKIg+T6kggaVd3LVwVZRyLqTc24l
InwRfErYQtNiTk5r3NCvw8NNBpGwpdfdkPnBpwni32NA8HB3d6BNizb9/c0uoYjC
D3D8mnUImesa/hvmtBsPhX8FgnhkEj9/y8GCdq/0RHeb7qtJkEgTAZOK6fz8R37o
wYiwHGNJAgMBAAECggEAAZ93XAGxqUo4If+jIJ7qWonR9JzozFSJhtn8mDwpoH6Z
k0U/9u9hOT2VJ6TbdLohkEMoTlvRiryADAPoi0UGr5RzDbLIsU0qFjVed3qfqlKs
pFJBKY5QiZ31vYRtJ6Yq3Hz9SBSFeB8OjB+f2OomMBgijouvaScvoW2jf+R6Enni
6OgM1jf222lrlorBgianz4U1fGqGBElsA+r10/NAo6xBuhtGQ7vJpHck6RAwpcEu
+iOBgIrifCwbu9cOi3mIavN7Z6ZjNbwdwefoCqTcGTUffQhA9VRiUxsaGvwJab2H
OlSqfFuY3MJgO9IzpbbzbVNBNmgxoxUxAsr+KxOiQQKBgQDy6MZbDT4DkpnILpVA
FUbM5J4gw95fHNkjePI3XuFxsBewh0P/7cWUorcV+1MH6UpDx4b+v7vniDyVWRYQ
4i/eGr0ia/Rrv/aU2nFPnO8t36YBYP1QnzGc+2Fr3ObCx/WWmejcBz67O68Wa+I9
73i6ofKam5gOHWJof3RooliBYQKBgQDMOmxeAnZxWGKL3mk7+nvw8M30eCG8tbBR
lpOAUxtOKNoQiN8yabMJtwrrzOtEkSnSkNGyvdkWH29LtTBJiwI7/lPeHny0ID9r
qSumD0vitKizt8PuPCSa8xkhzC2AJzXZLGrJvn/64JxGjHgA7Bm9o6HTTLMYrjvj
g5Zlr7fi6QKBgQCPpaBHkBkwO629d+7DKtHnsPriHXKPhJvUIl366J0hgiVAO323
B4FkWKU01p9PemJ0mrX2SKRyU1qgZ0JpUZlFG0Ll7DlqzuafOF7x2biHxE6DWjvz
RXEtiGsgQk4kueM94F6YX6B1UOJFvB7ayZb3p3W0gHb3QeFEMrtAdWEpgQKBgQCy
dpc9617/GyI6YWeKPw/Rc0w2RkgM9KQYF8HbUEQ7H5229zQ7hHwskCRd+9rXNxbZ
5y0nyZiLKXsDKFkC2xNfw5YcMn38lXV2KgV3fkRs3jvRmFMButKuCKK8kwRryVfX
6GWE2BBT9bT6PUOcYrT3r6b40zxp4893uART5aKGCQKBgQCoOOoZDV7vEqmgNe85
7u9+MRUwYP5lEWrLSs9QMGRKu1ICeEDW5fhXlgIKn3KqAufMJ6Lzf6erQj7+AVa/
i2gSPE6KllPsqf1X8iixs1N0iwPhWdIkljoV4s2wOA7FkRPlbky3yLufTPSG5KBz
Lw6XBL8+MAtFKOHy8e1vyoMj5A==
-----END PRIVATE KEY-----
KEY_EOF

chmod 600 "$SSL_DIR/cloudflare-origin.key"
chmod 644 "$SSL_DIR/cloudflare-origin.pem"

echo "SSL 证书已部署:"
echo "  证书: $SSL_DIR/cloudflare-origin.pem"
echo "  私钥: $SSL_DIR/cloudflare-origin.key"
echo ""
echo "Cloudflare Origin CA 证书有效期: 2026-07-21 ~ 2041-07-17"
echo "覆盖域名: chinaauto.ccwu.cc, *.chinaauto.ccwu.cc"
echo ""

echo "===== 验证证书 ====="
openssl x509 -in "$SSL_DIR/cloudflare-origin.pem" -noout -subject -dates -ext subjectAltName 2>/dev/null || echo "openssl 未安装，跳过验证"

echo ""
echo "===== 下一步 ====="
echo "1. 将 nginx-guiniu.conf 复制到 /etc/nginx/conf.d/"
echo "2. nginx -t && systemctl reload nginx"
echo "3. 在 Cloudflare 面板设置 SSL 模式为 Full (Strict)"
