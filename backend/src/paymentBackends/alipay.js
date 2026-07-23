const { PaymentBackend } = require('./base');
const crypto = require('crypto');

class AlipayBackend extends PaymentBackend {
  constructor(config) {
    super(config);
    this.appId = config.appId;
    this.gatewayUrl = config.gatewayUrl || 'https://openapi-sandbox.dl.alipaydev.com/gateway.do';
    this.notifyUrl = config.notifyUrl;
    this.returnUrl = config.returnUrl;
    this.environment = 'simulated';
    this._sdk = null;

    if (config.appPrivateKeyPath && config.alipayPublicKeyPath) {
      const fs = require('fs');
      try {
        this.appPrivateKey = fs.readFileSync(config.appPrivateKeyPath, 'utf-8');
        this.alipayPublicKey = fs.readFileSync(config.alipayPublicKeyPath, 'utf-8');
        this.environment = 'sandbox';
      } catch (e) {
        console.warn('[AlipayBackend] 密钥文件读取失败，回退模拟模式:', e.message);
        this.environment = 'simulated';
      }
    }

    this._tryLoadSdk();
  }

  _tryLoadSdk() {
    try {
      this._sdk = require('alipay-sdk');
      if (this.appPrivateKey && this.alipayPublicKey) {
        this._client = new this._sdk({
          appId: this.appId,
          privateKey: this.appPrivateKey,
          alipayPublicKey: this.alipayPublicKey,
          gateway: this.gatewayUrl,
          notifyUrl: this.notifyUrl,
          returnUrl: this.returnUrl,
        });
        this.environment = 'live';
        console.log('[AlipayBackend] alipay-sdk 已加载，环境: live');
      }
    } catch (e) {
      console.log('[AlipayBackend] alipay-sdk 未安装，使用模拟/沙箱模式:', e.message);
      this._sdk = null;
      this._client = null;
    }
  }

  _genTradeNo() {
    return `alipay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  async createTradePagePay(amount, subject) {
    if (this._client) {
      try {
        const result = await this._client.pageExec('alipay.trade.page.pay', {
          bizContent: { out_trade_no: this._genTradeNo(), total_amount: amount, subject, product_code: 'FAST_INSTANT_TRADE_PAY' },
        });
        return { channel: 'alipay', outTradeNo: this._genTradeNo(), totalAmount: amount, subject, mode: 'page', environment: 'live', payUrl: result };
      } catch (e) {
        console.warn('[AlipayBackend] SDK调用失败，回退沙箱:', e.message);
      }
    }

    const outTradeNo = this._genTradeNo();
    if (this.environment === 'sandbox') {
      return {
        channel: 'alipay', outTradeNo, totalAmount: amount, subject, mode: 'page', environment: 'sandbox',
        payUrl: `${this.gatewayUrl}?method=alipay.trade.page.pay&app_id=${this.appId}&out_trade_no=${outTradeNo}&total_amount=${amount}&subject=${encodeURIComponent(subject)}&notify_url=${this.notifyUrl || ''}&return_url=${this.returnUrl || ''}`,
      };
    }

    return {
      channel: 'alipay', outTradeNo, totalAmount: amount, subject, mode: 'page', environment: 'simulated',
      payUrl: `https://openapi-sandbox.dl.alipaydev.com/gateway.do?mock=1&outTradeNo=${outTradeNo}&subject=${encodeURIComponent(subject)}&totalAmount=${amount}`,
    };
  }

  async createTradePrecreate(amount, subject) {
    if (this._client) {
      try {
        const result = await this._client.exec('alipay.trade.precreate', {
          bizContent: { out_trade_no: this._genTradeNo(), total_amount: amount, subject },
        });
        return { channel: 'alipay', outTradeNo: result.outTradeNo, totalAmount: amount, subject, mode: 'qrcode', environment: 'live', qrCode: result.qrCode, payUrl: result.qrCode };
      } catch (e) {
        console.warn('[AlipayBackend] SDK调用失败，回退沙箱:', e.message);
      }
    }

    const outTradeNo = this._genTradeNo();
    return {
      channel: 'alipay', outTradeNo, totalAmount: amount, subject, mode: 'qrcode',
      environment: this.environment === 'sandbox' ? 'sandbox' : 'simulated',
      qrCode: `https://qr.alipay.com/${this.environment === 'sandbox' ? '' : 'mock_'}${outTradeNo}`,
      payUrl: `https://qr.alipay.com/${this.environment === 'sandbox' ? '' : 'mock_'}${outTradeNo}`,
    };
  }

  async createTradeAppPay(amount, subject) {
    if (this._client) {
      try {
        const result = await this._client.exec('alipay.trade.app.pay', {
          bizContent: { out_trade_no: this._genTradeNo(), total_amount: amount, subject, product_code: 'QUICK_MSECURITY_PAY' },
        });
        return { channel: 'alipay', outTradeNo: this._genTradeNo(), totalAmount: amount, subject, mode: 'app', environment: 'live', orderStr: result };
      } catch (e) {
        console.warn('[AlipayBackend] SDK调用失败，回退沙箱:', e.message);
      }
    }

    const outTradeNo = this._genTradeNo();
    if (this.environment === 'sandbox') {
      return {
        channel: 'alipay', outTradeNo, totalAmount: amount, subject, mode: 'app', environment: 'sandbox',
        orderStr: `app_id=${this.appId}&method=alipay.trade.app.pay&out_trade_no=${outTradeNo}&total_amount=${amount}&subject=${encodeURIComponent(subject)}`,
      };
    }

    return {
      channel: 'alipay', outTradeNo, totalAmount: amount, subject, mode: 'app', environment: 'simulated',
      payUrl: `alipays://platformapi/startapp?appId=${this.appId || 'mock'}&outTradeNo=${outTradeNo}`,
    };
  }

  async queryTrade(outTradeNo) {
    if (this._client) {
      try {
        const result = await this._client.exec('alipay.trade.query', {
          bizContent: { out_trade_no: outTradeNo },
        });
        return { outTradeNo, tradeStatus: result.tradeStatus || result.trade_status, totalAmount: result.totalAmount || result.total_amount, environment: 'live' };
      } catch (e) {
        console.warn('[AlipayBackend] SDK查询失败，回退模拟:', e.message);
      }
    }

    if (this.environment === 'simulated') {
      return { outTradeNo, tradeStatus: 'TRADE_SUCCESS', totalAmount: '0.01', environment: 'simulated' };
    }
    return { outTradeNo, tradeStatus: 'WAIT_BUYER_PAY', environment: 'sandbox' };
  }

  async handleNotify(notificationData) {
    if (this._client && notificationData) {
      try {
        const verified = this._client.checkNotifySign(notificationData);
        return verified;
      } catch (e) {
        console.warn('[AlipayBackend] 通知验签失败:', e.message);
        return false;
      }
    }

    if (this.environment === 'simulated') return true;
    if (!notificationData || !notificationData.sign) return false;
    return true;
  }
}

module.exports = { AlipayBackend };
