/**
 * 分享功能组合函数
 * 配合小程序 onShareAppMessage / onShareTimeline 使用
 */
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app';

interface ShareOptions {
  title: string;
  path: string;
  imageUrl?: string;
}

/**
 * 设置分享到好友
 */
export function useShareMessage(options: () => ShareOptions) {
  onShareAppMessage(() => options());
}

/**
 * 设置分享到朋友圈
 */
export function useShareTimeline(options: () => ShareOptions) {
  onShareTimeline(() => options());
}
