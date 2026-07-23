import { HttpClient, ApiResponse, toPostBody } from './HttpClient';
import { AiComplianceResult, AiSecurityLabel } from '../model/DataModels';
import { AI_CONFIG } from './Constants';

export class ContentFingerprint {
  static computeFingerprint(text: string, authorId: string): string {
    let hash: number = 0;
    const combined: string = text + '|' + authorId;
    for (let i = 0; i < combined.length; i++) {
      const ch: number = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash = hash & hash;
    }
    const hex: string = '00000000' + (hash >>> 0).toString(16);
    return 'fp_' + hex.slice(-8) + '_' + combined.length.toString(36);
  }

  static async registerFingerprint(contentId: string, fingerprint: string, userId: string): Promise<boolean> {
    if (AI_CONFIG.AI_MOCK_MODE) {
      return true;
    }
    const body: Record<string, Object> = {
      'contentId': contentId,
      'fingerprint': fingerprint,
      'userId': userId,
    };
    const resp: ApiResponse<Record<string, Object>> = await HttpClient.post<Record<string, Object>>(
      '/api/content/fingerprint', toPostBody(body),
      (data: Record<string, Object>): Record<string, Object> => { return data; });
    if (resp.success) {
      const chainBody: Record<string, Object> = {
        'hash': fingerprint,
        'dataType': 'content_ip',
        'txId': contentId,
      };
      const chainResp: ApiResponse<Record<string, Object>> = await HttpClient.post<Record<string, Object>>(
        '/api/hash/chain', toPostBody(chainBody),
        (data: Record<string, Object>): Record<string, Object> => { return data; });
      return chainResp.success;
    }
    return false;
  }

  static async checkCompliance(contentId: string): Promise<AiComplianceResult> {
    if (AI_CONFIG.AI_MOCK_MODE) {
      return ContentFingerprint.mockCompliance(contentId);
    }
    const resp: ApiResponse<AiComplianceResult> = await HttpClient.get<AiComplianceResult>(
      '/api/content-audit/compliance/' + contentId,
      (data: Record<string, Object>): AiComplianceResult => {
        return AiComplianceResult.fromJson(data);
      });
    if (resp.success && resp.data !== null) {
      return resp.data;
    }
    const fallback: AiComplianceResult = new AiComplianceResult();
    fallback.contentId = contentId;
    fallback.compliant = true;
    fallback.downloadable = true;
    fallback.shareableExternally = true;
    return fallback;
  }

  private static mockCompliance(contentId: string): AiComplianceResult {
    const result: AiComplianceResult = new AiComplianceResult();
    result.contentId = contentId;
    result.compliant = true;
    result.riskScore = 5;
    result.downloadable = true;
    result.shareableExternally = true;
    result.fingerprint = ContentFingerprint.computeFingerprint(contentId, 'system');
    const label: AiSecurityLabel = new AiSecurityLabel();
    label.type = 'copyright';
    label.level = 'safe';
    label.description = '原创内容，版权受保护';
    label.autoApplied = true;
    result.labels.push(label);
    return result;
  }

  static async applySecurityLabels(contentId: string, labels: AiSecurityLabel[]): Promise<boolean> {
    if (AI_CONFIG.AI_MOCK_MODE) {
      return true;
    }
    const labelObjs: Object[] = [];
    for (let i = 0; i < labels.length; i++) {
      const lbl: Record<string, Object> = {
        'type': labels[i].type,
        'level': labels[i].level,
        'description': labels[i].description,
        'autoApplied': labels[i].autoApplied,
      };
      labelObjs.push(lbl);
    }
    const body: Record<string, Object> = {
      'contentId': contentId,
      'labels': labelObjs,
    };
    const resp: ApiResponse<Record<string, Object>> = await HttpClient.post<Record<string, Object>>(
      '/api/content/security-labels', toPostBody(body),
      (data: Record<string, Object>): Record<string, Object> => { return data; });
    return resp.success;
  }

  static canDownload(compliance: AiComplianceResult): boolean {
    if (!compliance.compliant) {
      return false;
    }
    if (compliance.riskScore > 70) {
      return false;
    }
    for (let i = 0; i < compliance.labels.length; i++) {
      if (compliance.labels[i].level === 'blocked' || compliance.labels[i].level === 'danger') {
        return false;
      }
    }
    return compliance.downloadable;
  }

  static canShareExternally(compliance: AiComplianceResult): boolean {
    if (!compliance.compliant) {
      return false;
    }
    if (compliance.riskScore > 50) {
      return false;
    }
    for (let i = 0; i < compliance.labels.length; i++) {
      if (compliance.labels[i].level === 'blocked' || compliance.labels[i].level === 'danger') {
        return false;
      }
      if (compliance.labels[i].type === 'ip_protected' && compliance.labels[i].level !== 'safe') {
        return false;
      }
    }
    return compliance.shareableExternally;
  }

  static getRiskColor(riskScore: number): string {
    if (riskScore <= 20) return '#10B981';
    if (riskScore <= 50) return '#F59E0B';
    if (riskScore <= 70) return '#E84026';
    return '#DC2626';
  }

  static getRiskLabel(riskScore: number): string {
    if (riskScore <= 20) return '安全';
    if (riskScore <= 50) return '低风险';
    if (riskScore <= 70) return '中风险';
    return '高风险';
  }

  static getLabelColor(level: string): string {
    if (level === 'safe') return '#10B981';
    if (level === 'warning') return '#F59E0B';
    if (level === 'danger') return '#E84026';
    if (level === 'blocked') return '#DC2626';
    return '#99182431';
  }
}
