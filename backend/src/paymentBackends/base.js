class PaymentBackend {
  constructor(config) {
    this.config = config;
    this.environment = 'simulated';
  }

  async createTradePagePay(amount, subject) {
    throw new Error('Not implemented');
  }

  async createTradePrecreate(amount, subject) {
    throw new Error('Not implemented');
  }

  async createTradeAppPay(amount, subject) {
    throw new Error('Not implemented');
  }

  async createJsapiPay(amount, subject, openid) {
    throw new Error('Not implemented');
  }

  async createTradeQrcode(amount, subject, payeeWallet) {
    throw new Error('Not implemented');
  }

  async queryTrade(outTradeNo) {
    throw new Error('Not implemented');
  }

  async handleNotify(notificationData) {
    throw new Error('Not implemented');
  }

  getEnvironment() {
    return this.environment;
  }
}

module.exports = { PaymentBackend };
