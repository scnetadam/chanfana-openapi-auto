const { PaymentBackend } = require('./base');
const crypto = require('crypto');

class WechatPayBackend extends PaymentBackend {
  constructor(config) {
    super(config);
    this.appId = config.appId;
    this.mchId = config.mchId;
    this.apiV3Key = config.apiV3Key;
    this.notifyUrl = config.notifyUrl;
    this.serialNo = config.serialNo;
    this.privateKey = config.privateKey;
    this.environment = 'simulated';
    this._sdk = null;

    if (config.mchId && config.appId && config.apiV3Key) {
      this.environment = 'sandbox';
    }

    this._tryLoadSdk();
  }

  _tryLoadSdk() {
    try {
      const WxPay = require('wechatpay-node-v3');
      if (this.mchId && this.appId && this.apiV3Key && this.privateKey && this.serialNo) {
        this._client = new WxPay({
          appid: this.appId,
          mchid: this.mchId,
          publicKey: this.privateKey,
          privateKey: this.privateKey,
          apiv3_private_key: this.apiV3Key,
          serial_no: this.serialNo,
        });
        this.environment = 'live';
        console.log('[WechatPayBackend] wechatpay-node-v3 已加载，环境: live');
      }
    } catch (e) {
      console.log('[WechatPayBackend] wechatpay-node-v3 未安装，使用模拟/沙箱模式:', e.message);
      this._sdk = null;
      this._client = null;
    }
  }

  _genTradeNo() {
    return `wx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  async createJsapiPay(amount, subject, openid) {
    if (this._client) {
      try {
        const centsAmount = Math.round(parseFloat(amount) * 100);
        const outTradeNo = this._genTradeNo();
        const result = await this._client.jsapi({
          description: subject,
          out_trade_no: outTradeNo,
          amount: { total: centsAmount, currency: 'CNY' },
          payer: { openid: openid || '' },
          notify_url: this.notifyUrl,
        });
        return {
          channel: 'wechat', outTradeNo, totalAmount: amount, subject, mode: 'jsapi', environment: 'live',
          prepayId: result.prepay_id,
          paySign: result.paySign,
          nonceStr: result.nonceStr,
          timeStamp: result.timeStamp,
          package: `prepay_id=${result.prepay_id}`,
        };
      } catch (e) {
        console.warn('[WechatPayBackend] SDK调用失败，回退沙箱:', e.message);
      }
    }

    const outTradeNo = this._genTradeNo();
    const prepayId = `prepay_id_${this.environment === 'sandbox' ? '' : 'mock_'}${outTradeNo}`;
    const key = this.apiV3Key || 'mock_key';
    return {
      channel: 'wechat', outTradeNo, totalAmount: amount, subject, mode: 'jsapi',
      environment: this.environment === 'sandbox' ? 'sandbox' : 'simulated',
      prepayId,
      paySign: crypto.createHmac('sha256', key).update(`${prepayId}`).digest('hex'),
      nonceStr: crypto.randomBytes(16).toString('hex'),
      timeStamp: Math.floor(Date.now() / 1000).toString(),
      package: `prepay_id=${prepayId}`,
    };
  }

  async queryTrade(outTradeNo) {
    if (this._client) {
      try {
        const result = await this._client.query({ out_trade_no: outTradeNo });
        return { outTradeNo, tradeState: result.trade_state, totalAmount: result.amount?.total ? (result.amount.total / 100).toFixed(2) : '0.00', environment: 'live' };
      } catch (e) {
        console.warn('[WechatPayBackend] SDK查询失败，回退模拟:', e.message);
      }
    }

    if (this.environment === 'simulated') {
      return { outTradeNo, tradeState: 'SUCCESS', totalAmount: '0.01', environment: 'simulated' };
    }
    return { outTradeNo, tradeState: 'NOTPAY', environment: 'sandbox' };
  }

  async handleNotify(notificationData) {
    if (this._client && notificationData && notificationData.resource) {
      try {
        const decrypted = this._client.decipher(notificationData.resource);
        return decrypted && decrypted.trade_state === 'TRADE_SUCCESS';
      } catch (e) {
        console.warn('[WechatPayBackend] 通知解密失败:', e.message);
        return false;
      }
    }

    if (this.environment === 'simulated') return true;
    if (!notificationData || !notificationData.resource) return false;
    return true;
  }
}

module.exports = { WechatPayBackend };
