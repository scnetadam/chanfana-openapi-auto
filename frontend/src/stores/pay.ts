import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiResult } from '@/api';

export const usePayStore = defineStore('pay', () => {
  const orders = ref<any[]>([]);

  async function fetchOrders() {
    // defined in user app
  }

  return { orders, fetchOrders };
});
