/**
 * X402 分享海报生成器（平台通用）
 * 微信/支付宝/H5 均可使用
 */

/**
 * 生成分享海报
 * 返回 base64 dataURL（通用）
 */
export async function generatePoster(options: {
  carModel: string;
  text: string;
  shareUrl: string;
  trackId: string;
  nickName: string;
  platform?: string;
}): Promise<string> {
  const width = 600;
  const height = 900;

  // 使用平台 canvas（uni-app 跨端）
  return new Promise((resolve, reject) => {
    // 在 uni-app 小程序环境使用 API 创建 canvas
    // H5 环境中 fallback 为文字版海报
    if (typeof uni !== 'undefined' && uni.createOffscreenCanvas) {
      // 小程序环境
      try {
        const canvas = uni.createOffscreenCanvas({ type: '2d', width, height });
        const ctx = canvas.getContext('2d');

        // 背景渐变
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#1e40af');
        grad.addColorStop(1, '#3b82f6');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // 白色内容卡片
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, 30, 80, 540, 600, 20);
        ctx.fill();

        ctx.fillStyle = '#1e40af';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('🚗 X402 推荐', 60, 140);

        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 44px sans-serif';
        ctx.fillText(options.carModel, 60, 200);

        ctx.fillStyle = '#555';
        ctx.font = '28px sans-serif';
        const truncated = options.text.length > 80
          ? options.text.slice(0, 80) + '...'
          : options.text;
        wrapText(ctx, truncated, 60, 260, 500, 44, 4);

        ctx.fillStyle = '#999';
        ctx.font = '24px sans-serif';
        ctx.fillText(`@${options.nickName}`, 60, 440);

        ctx.fillStyle = '#bbb';
        ctx.font = '20px sans-serif';
        ctx.fillText(`追踪码: ${options.trackId}`, 60, 480);

        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    } else {
      // H5 降级：返回文字描述，由后端生成海报
      reject(new Error('not_supported'));
    }
  });
}

function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const chars = text.split('');
  let line = '';
  let lineNum = 0;
  for (const char of chars) {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y + lineNum * lineHeight);
      line = char;
      lineNum++;
      if (lineNum >= maxLines) {
        ctx.fillText('...', x, y + lineNum * lineHeight);
        return;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y + lineNum * lineHeight);
}
