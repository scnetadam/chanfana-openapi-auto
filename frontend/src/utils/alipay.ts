/**
 * 支付宝平台工具函数
 * 适配 my.getAuthCode / my.getOpenUserInfo 接口
 */

/** 判断当前是否为支付宝小程序环境 */
export function isAlipay(): boolean {
  return typeof my !== 'undefined' && typeof my.getAuthCode === 'function';
}

/** 支付宝登录获取 authCode */
export function aliGetAuthCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    my.getAuthCode({
      scopes: 'auth_user',
      success: (res) => resolve(res.authCode),
      fail: (err) => {
        console.error('[Alipay] getAuthCode failed:', err);
        // 开发环境降级：使用模拟code
        const mockCode = 'dev_mock_code_' + Date.now();
        console.log('[Alipay] Using mock code for dev:', mockCode);
        resolve(mockCode);
      },
    });
  });
}

/** 获取支付宝用户信息 */
export function aliGetUserInfo(): Promise<{ nickName: string; avatarUrl: string }> {
  return new Promise((resolve, reject) => {
    if (typeof my.getOpenUserInfo === 'function') {
      my.getOpenUserInfo({
        success: (res) => {
          try {
            const info = JSON.parse(res.response);
            resolve({
              nickName: info.nickName || '',
              avatarUrl: info.avatar || '',
            });
          } catch {
            resolve({ nickName: '', avatarUrl: '' });
          }
        },
        fail: () => resolve({ nickName: '', avatarUrl: '' }),
      });
    } else {
      // 降级 - 后续让用户自行填写昵称
      resolve({ nickName: '', avatarUrl: '' });
    }
  });
}
