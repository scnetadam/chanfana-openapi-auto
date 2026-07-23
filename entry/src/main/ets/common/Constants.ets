export class AppConfig {
  API_BASE: string = 'http://10.0.2.2:3003';
  SHARE_BASE_URL: string = 'https://x402.app/s';
}

export const APP_CONFIG: AppConfig = new AppConfig();

export class AttributionValues {
  VIEW: number = 0.01;
  BOOKING: number = 5.00;
  DEPOSIT: number = 50.00;
  PURCHASE: number = 6000;
}

export const ATTRIBUTION_VALUES: AttributionValues = new AttributionValues();

export class AiConfig {
  AI_MOCK_MODE: boolean = true;
  AI_REQUEST_THROTTLE_MS: number = 5000;
  AI_CACHE_TTL_MS: number = 300000;
  AI_RAG_TOP_K: number = 5;
  AI_KNOWLEDGE_QA_TARGET: number = 500000;
  AI_FINGERPRINT_ALGORITHM: string = 'sha256';
}

export const AI_CONFIG: AiConfig = new AiConfig();
