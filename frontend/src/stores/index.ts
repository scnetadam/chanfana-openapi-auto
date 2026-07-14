import { defineStore } from 'pinia';
import { ref } from 'vue';
import { authApi, ActivityItem, ContentDetail } from '@/api';

export const useUserStore = defineStore('user', () => {
  const token = ref('');
  const userId = ref('');
  const userInfo = ref<{ nickName: string; avatarUrl: string } | null>(null);
  const isLoggedIn = ref(false);

  async function login(code: string, nickName?: string, avatarUrl?: string, platform?: string) {
    const res = await authApi.login(code, nickName, avatarUrl, platform);
    if (res.success) {
      token.value = res.data.token;
      userId.value = res.data.user.id;
      userInfo.value = res.data.user;
      isLoggedIn.value = true;
      uni.setStorageSync('token', res.data.token);
      uni.setStorageSync('userId', res.data.user.id);
      uni.setStorageSync('userInfo', JSON.stringify(res.data.user));
    }
    return res;
  }

  function logout() {
    token.value = '';
    userId.value = '';
    userInfo.value = null;
    isLoggedIn.value = false;
    uni.removeStorageSync('token');
    uni.removeStorageSync('userId');
    uni.removeStorageSync('userInfo');
  }

  function restore() {
    const t = uni.getStorageSync('token');
    const uid = uni.getStorageSync('userId');
    const ui = uni.getStorageSync('userInfo');
    if (t && uid) {
      token.value = t;
      userId.value = uid;
      if (ui) userInfo.value = JSON.parse(ui);
      isLoggedIn.value = true;
    }
  }

  return { token, userId, userInfo, isLoggedIn, login, logout, restore };
});

export const useActivityStore = defineStore('activity', () => {
  const list = ref<ActivityItem[]>([]);
  const currentActivity = ref<ActivityItem | null>(null);

  function setActivities(activities: ActivityItem[]) {
    list.value = activities;
  }

  function setCurrent(act: ActivityItem) {
    currentActivity.value = act;
  }

  return { list, currentActivity, setActivities, setCurrent };
});

export const useContentStore = defineStore('content', () => {
  const myContents = ref<ContentDetail[]>([]);
  const currentDetail = ref<ContentDetail | null>(null);

  function setContents(items: ContentDetail[]) {
    myContents.value = items;
  }

  function addContent(item: ContentDetail) {
    myContents.value.unshift(item);
  }

  function setDetail(item: ContentDetail) {
    currentDetail.value = item;
  }

  return { myContents, currentDetail, setContents, addContent, setDetail };
});
