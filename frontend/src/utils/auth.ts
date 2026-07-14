/**
 * 平台统一登录适配器
 * 根据运行环境自动选择微信 / 支付宝 / H5 登录流程
 */

import { wxLogin, wxGetUserProfile } from './wechat';
import { aliGetAuthCode, aliGetUserInfo, isAlipay } from './alipay';

/** 判断当前是否为 H5 */
function isH5(): boolean {
  return typeof window !== 'undefined' && typeof wx === 'undefined' && typeof my === 'undefined';
}

/** 获取登录凭证（code / authCode） */
export function getLoginCode(): Promise<string> {
  if (isAlipay()) {
    return aliGetAuthCode();
  }
  return wxLogin();
}

/** 获取用户基本信息 */
export function getUserProfile(): Promise<{ nickName: string; avatarUrl: string }> {
  if (isAlipay()) {
    return aliGetUserInfo();
  }
  return wxGetUserProfile();
}
