/**
 * 分享海报生成工具
 * 使用 Canvas 绘制分享海报
 */

export interface PosterConfig {
  title: string;
  desc: string;
  brand?: string;
  model?: string;
  reward?: string;
  qrCode?: string;
  inviteCode?: string;
  bgImage?: string;
}

export async function generateSharePoster(config: PosterConfig): Promise<string> {
  return new Promise((resolve, reject) => {
    const ctx = uni.createCanvasContext('sharePoster');
    const width = 750;
    const height = 1334;

    ctx.setFillStyle('#ffffff');
    ctx.fillRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, width, 400);
    gradient.addColorStop(0, '#0A1628');
    gradient.addColorStop(1, '#1A2D4A');
    ctx.setFillStyle(gradient);
    ctx.fillRect(0, 0, width, 400);

    ctx.setFillStyle('#C9A84C');
    ctx.setFontSize(48);
    ctx.setTextAlign('center');
    ctx.fillText(config.brand || '龟钮自驭', width / 2, 100);

    ctx.setFontSize(64);
    ctx.fillText(config.model || '汽车资讯 AI', width / 2, 200);

    ctx.setFontSize(28);
    ctx.setFillStyle('rgba(255,255,255,0.9)');
    ctx.fillText(config.desc || '道法自驭 · 价值自主流转', width / 2, 280);

    ctx.setFillStyle('#1f2937');
    ctx.setFontSize(36);
    ctx.setTextAlign('left');
    ctx.fillText(config.title, 60, 500);

    if (config.reward) {
      ctx.setFillStyle('#f59e0b');
      ctx.setFontSize(32);
      ctx.fillText(`💰 ${config.reward}`, 60, 560);
    }

    if (config.inviteCode) {
      ctx.setFillStyle('#f3f4f6');
      ctx.fillRect(60, 620, width - 120, 100);
      ctx.setFillStyle('#6b7280');
      ctx.setFontSize(24);
      ctx.fillText('邀请码', 80, 660);
      ctx.setFillStyle('#C9A84C');
      ctx.setFontSize(40);
      ctx.fillText(config.inviteCode, 80, 700);
    }

    ctx.setFillStyle('#f9fafb');
    ctx.fillRect(60, 780, width - 120, 300);

    ctx.setFillStyle('#6b7280');
    ctx.setFontSize(24);
    ctx.setTextAlign('center');
    ctx.fillText('扫码参与活动', width / 2, 820);

    ctx.setFillStyle('#d1d5db');
    ctx.fillRect(width / 2 - 100, 850, 200, 200);
    ctx.setFillStyle('#9ca3af');
    ctx.setFontSize(20);
    ctx.fillText('二维码', width / 2, 960);

    ctx.setFillStyle('#9ca3af');
    ctx.setFontSize(24);
    ctx.fillText('龟钮自驭 · 汽车资讯自主价值引擎', width / 2, height - 100);

    ctx.draw(false, () => {
      uni.canvasToTempFilePath({
        canvasId: 'sharePoster',
        success: (res) => {
          resolve(res.tempFilePath);
        },
        fail: (err) => {
          reject(err);
        },
      });
    });
  });
}

export async function savePosterToAlbum(tempFilePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.saveImageToPhotosAlbum({
      filePath: tempFilePath,
      success: () => {
        uni.showToast({ title: '已保存到相册', icon: 'success' });
        resolve();
      },
      fail: (err) => {
        if (err.errMsg.includes('auth deny')) {
          uni.showModal({
            title: '提示',
            content: '需要授权保存图片到相册',
            confirmText: '去授权',
            success: (res) => {
              if (res.confirm) {
                uni.openSetting({});
              }
            },
          });
        } else {
          uni.showToast({ title: '保存失败', icon: 'none' });
        }
        reject(err);
      },
    });
  });
}

export function sharePoster(tempFilePath: string) {
  uni.showActionSheet({
    itemList: ['保存到相册', '分享到微信'],
    success: (res) => {
      if (res.tapIndex === 0) {
        savePosterToAlbum(tempFilePath);
      } else if (res.tapIndex === 1) {
        uni.showToast({ title: '请在微信中分享', icon: 'none' });
      }
    },
  });
}
