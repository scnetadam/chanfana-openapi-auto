import { defineStore } from 'pinia';
import { ref } from 'vue';
import { x402PayApi } from '@/api';
import { isAlipay } from '@/utils/alipay';

export const usePayStore = defineStore('pay', () => {
  const orders = ref<any[]>([]);
  const paying = ref(false);

  async function requestPaidContent(tradeNo?: string) {
    paying.value = true;
    try {
      const result = await x402PayApi.requestAccess(tradeNo);
      if (result.paid) {
        return result.data;
      }
      if (result.paymentRequired) {
        const pr = result.paymentRequired;
        if (isAlipay()) {
          const payUrl = pr.payUrl || x402PayApi.getPaymentPageUrl(pr.tradeNo);
          uni.navigateTo({ url: `/pages/webview/index?url=${encodeURIComponent(payUrl)}` });
        } else {
          uni.setClipboardData({ data: pr.payUrl });
          uni.showToast({ title: '请复制链接到浏览器支付', icon: 'none' });
        }
        orders.value.unshift({ tradeNo: pr.tradeNo, amount: pr.amount, status: 'pending', createdAt: new Date().toISOString() });
      }
      return null;
    } finally {
      paying.value = false;
    }
  }

  async function checkOrderStatus(tradeNo: string) {
    const res = await x402PayApi.checkPayment(tradeNo);
    const order = orders.value.find((o: any) => o.tradeNo === tradeNo);
    if (order) order.status = res.status;
    return res.status;
  }

  async function fetchOrders() {
    orders.value = orders.value;
  }

  return { orders, paying, requestPaidContent, checkOrderStatus, fetchOrders };
});
