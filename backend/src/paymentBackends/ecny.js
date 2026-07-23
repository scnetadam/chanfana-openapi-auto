const { PaymentBackend } = require('./base');
const crypto = require('crypto');

class ECnyBackend extends PaymentBackend {
  constructor(config) {
    super(config);
    this.gatewayUrl = config.gatewayUrl || 'https://api.ccb.com/ecny/v1';
    this.mchId = config.mchId;
    this.appId = config.appId;
    this.apiKey = config.apiKey;
    this.notifyUrl = config.notifyUrl;
    this.environment = 'simulated';

    if (config.mchId && config.apiKey) {
      this.environment = 'sandbox';
    }

    this._tryLoadSdk();
  }

  _tryLoadSdk() {
    try {
      this._sdk = require('@ccb/ecny-sdk');
      if (this.mchId && this.apiKey) {
        this._client = new this._sdk({ mchId: this.mchId, apiKey: this.apiKey, gateway: this.gatewayUrl });
        this.environment = 'live';
        console.log('[ECnyBackend] e-CNY SDK 已加载，环境: live');
      }
    } catch (e) {
      console.log('[ECnyBackend] e-CNY SDK 未安装，使用模拟/沙箱模式:', e.message);
      this._sdk = null;
      this._client = null;
    }
  }

  _genTradeNo() {
    return `ecny_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  async createTradeQrcode(amount, subject, payeeWallet) {
    if (this._client) {
      try {
        const tradeNo = this._genTradeNo();
        const result = await this._client.createQrCode({
          tradeNo, amount, subject, payeeWallet: payeeWallet || '',
          notifyUrl: this.notifyUrl,
        });
        return { channel: 'ecny', tradeNo, totalAmount: typeof amount === 'number' ? amount.toFixed(2) : amount, subject, mode: 'qrcode', environment: 'live', qrCode: result.qrCode, payUrl: result.payUrl };
      } catch (e) {
        console.warn('[ECnyBackend] SDK调用失败，回退沙箱:', e.message);
      }
    }

    const tradeNo = this._genTradeNo();
    if (this.environment === 'sandbox') {
      return {
        channel: 'ecny', tradeNo, totalAmount: typeof amount === 'number' ? amount.toFixed(2) : amount, subject, mode: 'qrcode', environment: 'sandbox',
        qrCode: `ecny://pay?tradeNo=${tradeNo}&mchId=${this.mchId}`,
        payUrl: `${this.gatewayUrl}/trade/qrcode?tradeNo=${tradeNo}&mchId=${this.mchId}`,
      };
    }

    return {
      channel: 'ecny', tradeNo, totalAmount: typeof amount === 'number' ? amount.toFixed(2) : amount, subject, mode: 'qrcode', environment: 'simulated',
      qrCode: `ecny://pay?tradeNo=${tradeNo}&amount=${amount}&wallet=${payeeWallet || 'default'}`,
      payUrl: `https://ecny.ccb.com/mock/pay?tradeNo=${tradeNo}&amount=${amount}&subject=${encodeURIComponent(subject)}`,
      umbrellaSplit: this._buildUmbrellaSplit(amount, payeeWallet),
    };
  }

  _buildUmbrellaSplit(amount, payeeWallet) {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    const batchNo = `ecny_um_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      batchNo,
      sourceTradeNo: '',
      totalAmount: num,
      entries: [
        { ruleId: 'ecny_split_0', ruleName: '商户分账', targetType: 'merchant', targetAccountId: payeeWallet || 'merchant', targetWallet: payeeWallet || 'merchant', amount: parseFloat((num * 0.70).toFixed(2)), memo: '70% 商户' },
        { ruleId: 'ecny_split_1', ruleName: '平台储备', targetType: 'platform', targetAccountId: 'platform_reserve', targetWallet: 'platform_reserve', amount: parseFloat((num * 0.20).toFixed(2)), memo: '20% 平台' },
        { ruleId: 'ecny_split_2', ruleName: '伞列池', targetType: 'umbrella_pool', targetAccountId: 'umbrella_pool', targetWallet: 'umbrella_pool', amount: parseFloat((num * 0.10).toFixed(2)), memo: '10% 伞列' },
      ],
      withhold: 0,
      tips: { needsTips: false },
      invoice: { needsInvoice: false },
      executedAt: new Date().toISOString(),
    };
  }

  async queryTrade(outTradeNo) {
    if (this._client) {
      try {
        const result = await this._client.query({ tradeNo: outTradeNo });
        return { tradeNo: outTradeNo, tradeState: result.status || 'SUCCESS', totalAmount: result.amount || '0.01', environment: 'live' };
      } catch (e) {
        console.warn('[ECnyBackend] SDK查询失败，回退模拟:', e.message);
      }
    }

    if (this.environment === 'simulated') {
      return { tradeNo: outTradeNo, tradeState: 'SUCCESS', totalAmount: '0.01', environment: 'simulated' };
    }
    return { tradeNo: outTradeNo, tradeState: 'NOTPAY', environment: 'sandbox' };
  }

  async handleNotify(notificationData) {
    if (this._client && notificationData) {
      try {
        const verified = this._client.verifySignature(notificationData);
        return verified;
      } catch (e) {
        console.warn('[ECnyBackend] 通知验签失败:', e.message);
        return false;
      }
    }

    if (this.environment === 'simulated') return true;
    if (!notificationData || !notificationData.tradeNo) return false;
    return true;
  }

  async umbrellaSplit(params) {
    const { parentTradeNo, totalAmount, splits } = params;
    const num = typeof totalAmount === 'string' ? parseFloat(totalAmount) : totalAmount;

    if (splits && splits.length > 0) {
      const totalWeight = splits.reduce((s, sp) => s + (sp.weight || sp.percentage || 0), 0);
      const entries = splits.map((sp, i) => {
        const weight = sp.weight || sp.percentage || 0;
        const amount = totalWeight > 0 ? parseFloat((num * weight / totalWeight).toFixed(2)) : 0;
        return {
          ruleId: `ecny_split_${i}`,
          ruleName: sp.memo || `分账-${i}`,
          targetType: sp.targetType || sp.partyType || 'kol',
          targetAccountId: sp.accountId || sp.wallet || '',
          targetWallet: sp.wallet || '',
          amount,
          memo: sp.memo || '',
        };
      });

      const batchNo = `ecny_um_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
      return {
        batchNo,
        sourceTradeNo: parentTradeNo || '',
        totalAmount: num,
        entries,
        withhold: 0,
        tips: { needsTips: false },
        invoice: { needsInvoice: false },
        executedAt: new Date().toISOString(),
      };
    }

    return this._buildUmbrellaSplit(num);
  }
}

module.exports = { ECnyBackend };
