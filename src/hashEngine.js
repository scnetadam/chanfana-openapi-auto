/**
 * 龟钮自驭 — KOL/KOC IP 数据存证引擎
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

const ANTCHAIN_REST_URL = process.env.ANTCHAIN_REST_URL || 'https://restapi.tianrun.com/v3';
const ANTCHAIN_ACCESS_KEY = process.env.ANTCHAIN_ACCESS_KEY || '';
const ANTCHAIN_ACCESS_SECRET = process.env.ANTCHAIN_ACCESS_SECRET || '';
const GONGZHENGYUN_API = process.env.GONGZHENGYUN_API || '';
const GONGZHENGYUN_KEY = process.env.GONGZHENGYUN_KEY || '';
const NOTARY_PRICE = parseFloat(process.env.NOTARY_PRICE || '9.90');

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

  async submitToAntChain(hash, metadata = {}) {
    if (!ANTCHAIN_ACCESS_KEY || !ANTCHAIN_ACCESS_SECRET) {
      return {
        success: false,
        error: '蚂蚁链API未配置(ANTCHAIN_ACCESS_KEY/ANTCHAIN_ACCESS_SECRET)',
        simulated: true,
        chainTxId: 'antchain-sim-' + Date.now(),
        chainTimestamp: new Date().toISOString(),
        chainBlock: 'simulated'
      };
    }

    try {
      const timestamp = Date.now().toString();
      const signString = ANTCHAIN_ACCESS_KEY + timestamp + hash;
      const signature = crypto
        .createHmac('sha256', ANTCHAIN_ACCESS_SECRET)
        .update(signString)
        .digest('hex');

      const response = await fetch(ANTCHAIN_REST_URL + '/data/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AccessKey': ANTCHAIN_ACCESS_KEY,
          'X-Timestamp': timestamp,
          'X-Signature': signature,
        },
        body: JSON.stringify({
          hash: hash,
          bizType: metadata.dataType || 'kol_ip',
          bizId: metadata.txId || '',
          extra: JSON.stringify(metadata),
        }),
      });

      if (!response.ok) {
        throw new Error('蚂蚁链API返回错误: ' + response.status);
      }

      const result = await response.json();
      return {
        success: true,
        chainTxId: result.data?.txId || result.txId || '',
        chainTimestamp: result.data?.timestamp || new Date().toISOString(),
        chainBlock: result.data?.blockHash || '',
        chainExplorer: result.data?.explorerUrl || '',
      };
    } catch (err) {
      console.error('[HashEngine] 蚂蚁链提交失败:', err.message);
      return {
        success: false,
        error: err.message,
        simulated: true,
        chainTxId: 'antchain-err-' + Date.now(),
        chainTimestamp: new Date().toISOString(),
      };
    }
  }

  async submitToNotaryCloud(hash, metadata = {}) {
    if (!GONGZHENGYUN_API || !GONGZHENGYUN_KEY) {
      return {
        success: false,
        error: '公证云API未配置(GONGZHENGYUN_API/GONGZHENGYUN_KEY)',
        simulated: true,
        notaryId: 'notary-sim-' + Date.now(),
        notaryUrl: '',
        notaryTimestamp: new Date().toISOString(),
        price: NOTARY_PRICE,
      };
    }

    try {
      const timestamp = Date.now().toString();
      const signature = crypto
        .createHmac('sha256', GONGZHENGYUN_KEY)
        .update(hash + timestamp)
        .digest('hex');

      const response = await fetch(GONGZHENGYUN_API + '/evidence/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': GONGZHENGYUN_KEY,
          'X-Timestamp': timestamp,
          'X-Signature': signature,
        },
        body: JSON.stringify({
          hash: hash,
          evidenceType: metadata.dataType || 'kol_ip',
          description: 'X402龟钮自驭IP存证 - ' + (metadata.txId || ''),
          applicant: metadata.userId || '',
        }),
      });

      if (!response.ok) {
        throw new Error('公证云API返回错误: ' + response.status);
      }

      const result = await response.json();
      return {
        success: true,
        notaryId: result.data?.evidenceId || result.evidenceId || '',
        notaryUrl: result.data?.queryUrl || result.queryUrl || '',
        notaryTimestamp: result.data?.timestamp || new Date().toISOString(),
        price: NOTARY_PRICE,
      };
    } catch (err) {
      console.error('[HashEngine] 公证云提交失败:', err.message);
      return {
        success: false,
        error: err.message,
        simulated: true,
        notaryId: 'notary-err-' + Date.now(),
        notaryUrl: '',
        notaryTimestamp: new Date().toISOString(),
        price: NOTARY_PRICE,
      };
    }
  }

  getNotaryPrice() {
    return NOTARY_PRICE;
  }
}

module.exports = new HashEngine();
