/**
 * 错误监控和上报工具
 */

interface ErrorReport {
  type: 'js' | 'api' | 'render';
  message: string;
  stack?: string;
  url?: string;
  userId?: string;
  timestamp: string;
  device: string;
  version: string;
}

const ERROR_QUEUE: ErrorReport[] = [];
const MAX_QUEUE_SIZE = 20;
const REPORT_URL = 'http://175.178.28.162/api/error/report';

function getDeviceInfo(): string {
  try {
    const info = uni.getSystemInfoSync();
    return `${info.platform}|${info.model}|${info.version}|${info.SDKVersion}`;
  } catch {
    return 'unknown';
  }
}

function getUserId(): string {
  try {
    return uni.getStorageSync('userId') || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

function addToQueue(error: ErrorReport) {
  ERROR_QUEUE.push(error);
  if (ERROR_QUEUE.length >= MAX_QUEUE_SIZE) {
    flushErrors();
  }
}

async function flushErrors() {
  if (ERROR_QUEUE.length === 0) return;
  
  const errors = ERROR_QUEUE.splice(0, ERROR_QUEUE.length);
  
  try {
    await uni.request({
      url: REPORT_URL,
      method: 'POST',
      data: { errors },
      timeout: 5000,
    });
  } catch (e) {
    console.error('[ErrorMonitor] flush failed:', e);
  }
}

export function reportJsError(error: Error, url?: string) {
  const report: ErrorReport = {
    type: 'js',
    message: error.message,
    stack: error.stack,
    url: url || getCurrentPageUrl(),
    userId: getUserId(),
    timestamp: new Date().toISOString(),
    device: getDeviceInfo(),
    version: '1.0.0',
  };
  
  console.error('[ErrorMonitor] JS Error:', report);
  addToQueue(report);
}

export function reportApiError(url: string, status: number, message: string) {
  const report: ErrorReport = {
    type: 'api',
    message: `API Error: ${status} - ${message}`,
    url,
    userId: getUserId(),
    timestamp: new Date().toISOString(),
    device: getDeviceInfo(),
    version: '1.0.0',
  };
  
  console.error('[ErrorMonitor] API Error:', report);
  addToQueue(report);
}

export function reportRenderError(component: string, error: string) {
  const report: ErrorReport = {
    type: 'render',
    message: `Render Error in ${component}: ${error}`,
    url: getCurrentPageUrl(),
    userId: getUserId(),
    timestamp: new Date().toISOString(),
    device: getDeviceInfo(),
    version: '1.0.0',
  };
  
  console.error('[ErrorMonitor] Render Error:', report);
  addToQueue(report);
}

function getCurrentPageUrl(): string {
  try {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    return currentPage ? `/${currentPage.route}` : 'unknown';
  } catch {
    return 'unknown';
  }
}

export function initErrorMonitor() {
  if (typeof window !== 'undefined') {
    window.onerror = (message, source, lineno, colno, error) => {
      reportJsError(error || new Error(String(message)), source);
      return false;
    };
    
    window.addEventListener('unhandledrejection', (event) => {
      reportJsError(event.reason || new Error('Unhandled Promise Rejection'));
    });
  }
  
  console.log('[ErrorMonitor] initialized');
}

export default {
  reportJsError,
  reportApiError,
  reportRenderError,
  initErrorMonitor,
  flushErrors,
};
