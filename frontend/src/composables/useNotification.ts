import { ref } from 'vue';
import { notificationApi } from '@/api';
import { getUserId } from '@/api';

interface EarningsReminder {
  hasEarnings: boolean;
  totalPending: number;
  reminders: any[];
  count: number;
}

export function useNotification() {
  const unreadCount = ref(0);
  const hasEarningsReminder = ref(false);
  const earningsData = ref<EarningsReminder | null>(null);
  const sending = ref(false);

  async function checkUnread() {
    const userId = getUserId();
    if (!userId) return;
    try {
      const res = await notificationApi.unreadCount(userId);
      if (res.success) {
        unreadCount.value = res.data.total;
        hasEarningsReminder.value = res.data.hasEarningsReminder;
      }
    } catch (_) {}
  }

  async function checkEarningsReminder() {
    const userId = getUserId();
    if (!userId) return;
    try {
      const res = await notificationApi.earningsReminder({ userId });
      if (res.success) {
        earningsData.value = {
          hasEarnings: res.data.hasEarnings,
          totalPending: res.data.totalPending,
          reminders: [],
          count: res.data.hasEarnings ? 1 : 0,
        };
      }
    } catch (_) {}
  }

  async function checkLoginReminders() {
    const userId = getUserId();
    if (!userId) return;
    try {
      const res = await notificationApi.loginReminders(userId);
      if (res.success) {
        hasEarningsReminder.value = res.data.hasEarningsReminder;
      }
    } catch (_) {}
  }

  async function sendDailyReminder(phone?: string, email?: string) {
    const userId = getUserId();
    if (!userId) return false;
    sending.value = true;
    try {
      const res = await notificationApi.dailyReminder({ userId, phone, email });
      sending.value = false;
      return res.success;
    } catch (_) {
      sending.value = false;
      return false;
    }
  }

  async function sendEarningsReminder(channels: string[] = ['in_app'], phone?: string, email?: string) {
    const userId = getUserId();
    if (!userId) return false;
    sending.value = true;
    try {
      const res = await notificationApi.earningsReminder({ userId, channels, phone, email });
      sending.value = false;
      return res.success;
    } catch (_) {
      sending.value = false;
      return false;
    }
  }

  return {
    unreadCount,
    hasEarningsReminder,
    earningsData,
    sending,
    checkUnread,
    checkEarningsReminder,
    checkLoginReminders,
    sendDailyReminder,
    sendEarningsReminder,
  };
}
