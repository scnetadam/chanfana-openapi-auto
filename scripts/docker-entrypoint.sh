#!/bin/bash

DNS_CONFIGURED=0

if [ ! -f /etc/resolv.conf.original ]; then
    cp /etc/resolv.conf /etc/resolv.conf.original 2>/dev/null || true
fi

if [ -w /etc/resolv.conf ]; then
    if ! grep -q "nameserver" /etc/resolv.conf 2>/dev/null; then
        echo "INFO: /etc/resolv.conf is empty, configuring DNS..."
        {
            echo "nameserver 114.114.114.114"
            echo "nameserver 223.5.5.5"
            echo "nameserver 8.8.8.8"
        } > /etc/resolv.conf
        DNS_CONFIGURED=1
    elif ! grep -q "114.114.114.114\|223.5.5.5\|8.8.8.8" /etc/resolv.conf 2>/dev/null; then
        echo "INFO: Adding fallback DNS to /etc/resolv.conf..."
        {
            cat /etc/resolv.conf.original 2>/dev/null || cat /etc/resolv.conf
            echo "nameserver 114.114.114.114"
            echo "nameserver 223.5.5.5"
            echo "nameserver 8.8.8.8"
        } > /etc/resolv.conf
        DNS_CONFIGURED=1
    else
        echo "INFO: DNS already configured in /etc/resolv.conf"
        DNS_CONFIGURED=1
    fi
else
    echo "WARN: /etc/resolv.conf not writable, DNS may not be configured"
    echo "INFO: Trying mount-based workaround..."
    mkdir -p /tmp/dns 2>/dev/null
    {
        echo "nameserver 114.114.114.114"
        echo "nameserver 223.5.5.5"
        echo "nameserver 8.8.8.8"
    } > /tmp/dns/resolv.conf 2>/dev/null
    mount --bind /tmp/dns/resolv.conf /etc/resolv.conf 2>/dev/null && \
        echo "INFO: DNS configured via bind mount" || \
        echo "WARN: Could not bind mount DNS config, network may fail"
fi

echo "INFO: Current /etc/resolv.conf:"
cat /etc/resolv.conf 2>/dev/null || echo "  (not readable)"

echo "INFO: DNS configuration ${DNS_CONFIGURED}"

echo "INFO: Testing DNS resolution..."
if nslookup repo.huaweicloud.com >/dev/null 2>&1; then
    echo "INFO: DNS resolution OK (repo.huaweicloud.com reachable)"
elif host repo.huaweicloud.com >/dev/null 2>&1; then
    echo "INFO: DNS resolution OK (repo.huaweicloud.com reachable via host)"
elif ping -c 1 -W 3 repo.huaweicloud.com >/dev/null 2>&1; then
    echo "INFO: DNS resolution OK (repo.huaweicloud.com reachable via ping)"
else
    echo "WARN: DNS resolution test inconclusive, proceeding anyway..."
fi

exec "$@"
