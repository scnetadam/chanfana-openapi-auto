const glmClient = require('./glmClient');
const { userStore, walletStore, contentStore } = require('./models/dataStore');
const yinzhengClient = require('./yinzhengClient');

const KOL_AUDIT_CHANNELS = {
  STANDARD: { key: 'standard', label: '标准审核', minFollowers: 2000, desc: '粉丝>2000,自主提交审核' },
  BIZ_AUTH: { key: 'biz_auth', label: 'B端授权', minFollowers: 0, desc: 'B端商家授权,免粉丝要求' },
  BIZ_INVITE: { key: 'biz_invite', label: 'B端邀请', minFollowers: 0, desc: 'B端商家邀请,免审核直接通过' },
  CROSS_PLATFORM: { key: 'cross_platform', label: '同类平台基础', minFollowers: 1000, desc: '同类平台有基础+粉丝>1000' },
  OPC: { key: 'opc', label: 'OPC创业支持', minFollowers: 1000, desc: '同类平台有基础+粉丝>1000+OPC申请' },
};

const KOL_STATUS = {
  NONE: 'none',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  OPC_PENDING: 'opc_pending',
  OPC_APPROVED: 'opc_approved',
};

function _localAuditCheck(data) {
  const { channel, followers, crossPlatformProof, bizAuthCode } = data;
  const rule = KOL_AUDIT_CHANNELS[channel?.toUpperCase()];
  if (!rule) return { pass: false, reason: '无效审核通道' };

  if (channel === 'standard') {
    if (followers < rule.minFollowers) return { pass: false, reason: `粉丝数不足${rule.minFollowers}，当前${followers}` };
    return { pass: true, reason: '粉丝数达标' };
  }

  if (channel === 'biz_auth' || channel === 'biz_invite') {
    if (!bizAuthCode) return { pass: false, reason: '需提供B端授权码' };
    return { pass: true, reason: 'B端授权/邀请通过' };
  }

  if (channel === 'cross_platform') {
    if (followers < rule.minFollowers) return { pass: false, reason: `粉丝数不足${rule.minFollowers}，当前${followers}` };
    if (!crossPlatformProof) return { pass: false, reason: '需提供同类平台运营证明' };
    return { pass: true, reason: '同类平台基础审核通过' };
  }

  if (channel === 'opc') {
    if (followers < rule.minFollowers) return { pass: false, reason: `粉丝数不足${rule.minFollowers}，当前${followers}` };
    if (!crossPlatformProof) return { pass: false, reason: '需提供同类平台运营证明' };
    return { pass: true, reason: 'OPC创业支持初审通过', opcEligible: true };
  }

  return { pass: false, reason: '未知审核通道' };
}

async function _aiAuditCheck(data) {
  if (!process.env.GLM_API_KEY) return null;

  const { channel, followers, crossPlatformProof, bizAuthCode, nickName, userId } = data;
  const userContents = contentStore.getByUser(userId);
  const wallet = walletStore.get(userId);

  const systemPrompt = `你是龟钮印信KOL审核引擎。根据提交的审核信息判断是否通过KOL审核。

审核规则:
- 标准审核: 粉丝>2000
- B端授权/邀请: 有B端授权码即可，无粉丝要求
- 同类平台基础: 粉丝>1000 + 同类平台运营证明
- OPC创业: 粉丝>1000 + 同类平台基础 + OPC申请

返回纯JSON（不要Markdown标记）:
{
  "approved": true/false,
  "score": 0-100,
  "channel": "审核通道",
  "reason": "审核理由(30字内)",
  "riskLevel": "low/medium/high",
  "suggestions": ["改进建议"]
}`;

  const userPrompt = `KOL审核申请:
昵称: ${nickName || '未知'}
粉丝数: ${followers || 0}
审核通道: ${channel}
B端授权码: ${bizAuthCode || '无'}
同类平台证明: ${crossPlatformProof || '无'}
历史内容: ${userContents.length}篇
口碑值: ${wallet?.reputationScore || 0}

请审核此KOL申请。`;

  try {
    const result = await glmClient.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    const text = result.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        approved: !!parsed.approved,
        score: _clampNum(parsed.score, 0, 100),
        channel: parsed.channel || channel,
        reason: parsed.reason || '',
        riskLevel: parsed.riskLevel || 'low',
        suggestions: parsed.suggestions || [],
        source: 'ai',
      };
    }
  } catch (e) {
    console.error('[KOL Audit] AI审核失败:', e.message);
  }
  return null;
}

function _clampNum(val, min, max) {
  const n = Number(val);
  if (isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

async function audit(data) {
  const localResult = _localAuditCheck(data);

  let aiResult = null;
  if (process.env.GLM_API_KEY && localResult.pass) {
    aiResult = await _aiAuditCheck(data);
  }

  const approved = aiResult ? aiResult.approved : localResult.pass;
  const reason = aiResult ? aiResult.reason : localResult.reason;

  return {
    approved,
    channel: data.channel,
    localCheck: localResult,
    aiCheck: aiResult,
    reason,
    opcEligible: localResult.opcEligible || false,
  };
}

async function reviewBizAuth(userId, bizAuthCode) {
  const bizStatus = await yinzhengClient.getBizStatus(userId);
  if (!bizStatus.success || bizStatus.data?.status !== 'approved') {
    return { valid: false, reason: 'B端商家未认证' };
  }
  if (!bizAuthCode || !bizAuthCode.startsWith('BIZ_')) {
    return { valid: false, reason: '无效B端授权码' };
  }
  return { valid: true, reason: 'B端授权验证通过', bizInfo: bizStatus.data };
}

module.exports = {
  audit,
  reviewBizAuth,
  KOL_AUDIT_CHANNELS,
  KOL_STATUS,
};
