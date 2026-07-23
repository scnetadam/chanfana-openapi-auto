const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'x402_deveco_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_ISSUER = 'guiniu-deveco';
const SSO_PROJECTS = ['seal', 'deveco', 'verify', 'guiniu'];
const SSO_SHARED_SECRET = process.env.SSO_SHARED_SECRET || 'guiniu_sso_shared_2026';

function generateToken(payload) {
  return jwt.sign({ ...payload, iss: JWT_ISSUER, iat: Math.floor(Date.now() / 1000) }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function generateSsoTokens(payload) {
  const ssoTokens = {};
  SSO_PROJECTS.forEach(project => {
    ssoTokens[project] = jwt.sign(
      { ...payload, iss: JWT_ISSUER, aud: project, scope: 'sso', iat: Math.floor(Date.now() / 1000) },
      SSO_SHARED_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  });
  return ssoTokens;
}

function verifySsoToken(token, expectedProject) {
  try {
    const decoded = jwt.verify(token, SSO_SHARED_SECRET);
    if (expectedProject && decoded.aud !== expectedProject) return { valid: false, error: 'project_mismatch' };
    return { valid: true, payload: decoded };
  } catch (e) {
    return { valid: false, error: e.name === 'TokenExpiredError' ? 'token_expired' : 'invalid_token' };
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '未提供认证令牌' });
  }
  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId || decoded.sub;
    req.platform = decoded.platform || '';
    req.user = decoded;
    next();
  } catch (e) {
    const ssoProject = req.headers['x-sso-project'];
    if (ssoProject) {
      const ssoResult = verifySsoToken(token, ssoProject);
      if (ssoResult.valid) {
        req.userId = ssoResult.payload.userId || ssoResult.payload.sub;
        req.platform = ssoResult.payload.platform || '';
        req.user = ssoResult.payload;
        req.ssoProject = ssoProject;
        return next();
      }
      return res.status(401).json({ success: false, error: 'SSO令牌无效: ' + ssoResult.error });
    }
    if (e.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: '令牌已过期' });
    }
    return res.status(401).json({ success: false, error: '令牌无效' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId || decoded.sub;
      req.platform = decoded.platform || '';
      req.user = decoded;
    } catch (e) {
      try {
        const ssoProject = req.headers['x-sso-project'];
        if (ssoProject) {
          const ssoResult = verifySsoToken(token, ssoProject);
          if (ssoResult.valid) {
            req.userId = ssoResult.payload.userId || ssoResult.payload.sub;
            req.platform = ssoResult.payload.platform || '';
            req.user = ssoResult.payload;
          }
        }
      } catch (_ignored) {}
    }
  }
  next();
}

module.exports = { generateToken, generateSsoTokens, verifySsoToken, authMiddleware, optionalAuth, JWT_SECRET, JWT_ISSUER, SSO_PROJECTS };
