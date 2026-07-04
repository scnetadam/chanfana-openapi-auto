import { http } from '@kit.NetworkKit';

const BASE_URL: string = 'http://10.0.2.2:3000';

export class ApiResponse<T> {
  success: boolean = false;
  data: T | null = null;
  error: string = '';

  constructor(success: boolean, data: T | null, error: string) {
    this.success = success;
    this.data = data;
    this.error = error;
  }
}

function safeGetFromRecord(record: Record<string, Object>, key: string): Object | undefined {
  return record[key];
}

function parseJsonToRecord(jsonStr: string): Record<string, Object> {
  const parsed: Record<string, Object> = JSON.parse(jsonStr);
  return parsed;
}

function getErrorMessage(err: Object): string {
  if (typeof err === 'object' && err !== null && !Array.isArray(err)) {
    const record: Record<string, Object> = err as Record<string, Object>;
    const msg: Object | undefined = record['message'];
    if (msg !== null && msg !== undefined && typeof msg === 'string') {
      return msg;
    }
  }
  return String(err);
}

export class HttpClient {
  static async get<T>(path: string, fromJson: (data: Record<string, Object>) => T): Promise<ApiResponse<T>> {
    try {
      const req: http.HttpRequest = http.createHttp();
      const resp: http.HttpResponse = await req.request(BASE_URL + path, {
        method: http.RequestMethod.GET,
        header: { 'Content-Type': 'application/json' } as Record<string, string>,
        connectTimeout: 10000,
        readTimeout: 10000,
      });
      req.destroy();
      if (resp.responseCode === 200) {
        const jsonStr: string = resp.result.toString();
        const record: Record<string, Object> = parseJsonToRecord(jsonStr);
        const successVal: Object | undefined = safeGetFromRecord(record, 'success');
        const success: boolean = successVal !== null && successVal !== undefined && successVal === true;
        const errorVal: Object | undefined = safeGetFromRecord(record, 'error');
        const errorStr: string = errorVal !== null && errorVal !== undefined ? String(errorVal) : '';
        const dataObj: Object | undefined = safeGetFromRecord(record, 'data');
        const data: T | null = dataObj !== null && dataObj !== undefined && dataObj !== '' ?
          fromJson(dataObj as Record<string, Object>) : null;
        return new ApiResponse<T>(success, data, errorStr);
      }
      return new ApiResponse<T>(false, null, 'HTTP ' + resp.responseCode.toString());
    } catch (err) {
      const errMsg: string = getErrorMessage(err);
      return new ApiResponse<T>(false, null, 'Network error: ' + errMsg);
    }
  }

  static async post<T>(path: string, body: Record<string, Object>, fromJson: (data: Record<string, Object>) => T): Promise<ApiResponse<T>> {
    try {
      const req: http.HttpRequest = http.createHttp();
      const resp: http.HttpResponse = await req.request(BASE_URL + path, {
        method: http.RequestMethod.POST,
        header: { 'Content-Type': 'application/json' } as Record<string, string>,
        extraData: JSON.stringify(body),
        connectTimeout: 10000,
        readTimeout: 10000,
      });
      req.destroy();
      if (resp.responseCode === 200 || resp.responseCode === 201) {
        const jsonStr: string = resp.result.toString();
        const record: Record<string, Object> = parseJsonToRecord(jsonStr);
        const successVal: Object | undefined = safeGetFromRecord(record, 'success');
        const success: boolean = successVal !== null && successVal !== undefined && successVal === true;
        const errorVal: Object | undefined = safeGetFromRecord(record, 'error');
        const errorStr: string = errorVal !== null && errorVal !== undefined ? String(errorVal) : '';
        const dataObj: Object | undefined = safeGetFromRecord(record, 'data');
        const data: T | null = dataObj !== null && dataObj !== undefined && dataObj !== '' ?
          fromJson(dataObj as Record<string, Object>) : null;
        return new ApiResponse<T>(success, data, errorStr);
      }
      return new ApiResponse<T>(false, null, 'HTTP ' + resp.responseCode.toString());
    } catch (err) {
      const errMsg: string = getErrorMessage(err);
      return new ApiResponse<T>(false, null, 'Network error: ' + errMsg);
    }
  }
}

export function toPostBody(obj: Record<string, Object>): Record<string, Object> {
  const body: Record<string, Object> = {};
  const keys: string[] = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key: string = keys[i];
    body[key] = obj[key];
  }
  return body;
}
