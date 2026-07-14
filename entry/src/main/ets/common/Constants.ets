export class AppConfig {
  API_BASE: string = 'http://10.0.2.2:3000';
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
