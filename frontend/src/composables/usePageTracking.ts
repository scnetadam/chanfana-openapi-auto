import { ref, onMounted, onUnmounted } from 'vue';
import { pageWeightedSettleApi } from '@/api';
import { getUserId } from '@/api';

interface TrackingState {
  pagePath: string;
  project: string;
  sessionId: string;
  startTime: number;
  interactionCount: number;
  shareCount: number;
  isTracking: boolean;
}

export function usePageTracking(project: string = 'deveco') {
  const state = ref<TrackingState>({
    pagePath: '',
    project,
    sessionId: '',
    startTime: 0,
    interactionCount: 0,
    shareCount: 0,
    isTracking: false,
  });

  const lastReportTime = ref(0);
  const REPORT_INTERVAL = 30000;

  function generateSessionId(): string {
    return 'ses_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function startTracking(pagePath: string) {
    state.value = {
      pagePath,
      project,
      sessionId: generateSessionId(),
      startTime: Date.now(),
      interactionCount: 0,
      shareCount: 0,
      isTracking: true,
    };
    reportEvent();
  }

  function recordInteraction() {
    if (state.value.isTracking) {
      state.value.interactionCount++;
    }
  }

  function recordShare() {
    if (state.value.isTracking) {
      state.value.shareCount++;
    }
  }

  async function reportEvent() {
    const userId = getUserId();
    if (!userId || !state.value.isTracking) return;

    const duration = (Date.now() - state.value.startTime) / 1000;
    const now = Date.now();
    if (now - lastReportTime.value < 5000) return;
    lastReportTime.value = now;

    try {
      await pageWeightedSettleApi.reportEvent({
        userId,
        page: state.value.pagePath,
        project: state.value.project,
        visitCount: 1,
        frequency: 1,
        duration: Math.min(duration, 3600),
        interaction: Math.min(state.value.interactionCount / 10, 1),
        contentDimension: 0.5,
        depthScore: Math.min(duration / 120, 1),
        shareTrack: state.value.shareCount,
        sessionId: state.value.sessionId,
      });
    } catch (_) {}
  }

  function stopTracking() {
    if (state.value.isTracking) {
      reportEvent();
      state.value.isTracking = false;
    }
  }

  let intervalTimer: ReturnType<typeof setInterval> | null = null;

  function startAutoReport(intervalMs: number = REPORT_INTERVAL) {
    intervalTimer = setInterval(() => {
      if (state.value.isTracking) {
        reportEvent();
      }
    }, intervalMs);
  }

  function stopAutoReport() {
    if (intervalTimer) {
      clearInterval(intervalTimer);
      intervalTimer = null;
    }
  }

  onUnmounted(() => {
    stopTracking();
    stopAutoReport();
  });

  return {
    state,
    startTracking,
    stopTracking,
    recordInteraction,
    recordShare,
    reportEvent,
    startAutoReport,
    stopAutoReport,
  };
}
