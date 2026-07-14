/**
 * 龟钮印信 — KOL/KOC IP 数据存证引擎
 *
 * 职责：KOL身份、内容IP、传播链、分佣权属的 HASH 存证
 * 与龟钮印证的支付数据存证独立分离
 *
 * 存证类型:
 *   kol_identity    — KOL身份认证存证
 *   kol_ip          — KOL/KOC的IP数据存证 (内容版权、传播权属)
 *   content_publish — 内容发布存证
 *   content_share   — 内容传播存证
 *   commission      — 分佣权属存证
 *   opc_identity    — OPC创业身份存证
 *   booking_convert — 预约转化存证
 *   biz_product     — 商家产品存证
 */

const crypto = require('crypto');

class HashEngine {
  digest(data, nonce = '') {
    const raw = (typeof data === 'string' ? data : JSON.stringify(data)) + nonce;
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const digest = crypto.createHash('sha256')
      .update(typeof data === 'string' ? data : JSON.stringify(data))
      .digest('hex')
      .slice(0, 16);
    return { hash, digest };
  }

  verify(data, originalHash, nonce = '') {
    const { hash } = this.digest(data, nonce);
    return hash === originalHash;
  }
}

module.exports = new HashEngine();
