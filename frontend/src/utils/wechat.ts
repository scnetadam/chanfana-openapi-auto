/**
 * 微信平台工具函数
 * H5 环境下使用模拟登录
 */

const isH5 = typeof window !== 'undefined' && !('wx' in window);

/** 微信登录获取 code（H5 模拟） */
export function wxLogin(): Promise<string> {
  if (isH5) {
    return Promise.resolve('h5_mock_code_' + Date.now().toString(36));
  }
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (res) => resolve(res.code),
      fail: (err) => reject(err),
    });
  });
}

/** 获取用户信息（H5 模拟） */
export function wxGetUserProfile(): Promise<any> {
  if (isH5) {
    return Promise.resolve({ nickName: 'H5测试用户', avatarUrl: '' });
  }
  return new Promise((resolve, reject) => {
    const api = (uni as any).getUserProfile;
    if (api) {
      api({
        desc: '用于完善用户资料',
        success: (res: any) => resolve(res.userInfo),
        fail: (err: any) => reject(err),
      });
    } else {
      uni.getUserInfo({
        success: (res) => resolve(res.userInfo),
        fail: (err) => reject(err),
      });
    }
  });
}

/** H5 分享（Web Share API / 复制链接） */
export function h5Share(options: { title: string; url: string }) {
  if (navigator.share) {
    navigator.share({ title: options.title, url: options.url }).catch(() => {});
  } else {
    uni.setClipboardData({ data: options.url, showToast: true });
  }
}

/** 复制到剪贴板 */
export function copyToClipboard(text: string) {
  uni.setClipboardData({ data: text, showToast: true });
}
