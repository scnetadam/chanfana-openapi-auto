function paginate(items, page, pageSize) {
  const p = Math.max(1, Number(page));
  const ps = Math.max(1, Math.min(100, Number(pageSize)));
  const total = items.length;
  const paged = items.slice((p - 1) * ps, p * ps);
  return {
    items: paged,
    total,
    page: p,
    pageSize: ps,
    totalPages: Math.ceil(total / ps),
  };
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(err => {
      console.error(`[Error] ${req.method} ${req.path}:`, err.message);
      res.status(500).json({ success: false, error: '服务器内部错误' });
    });
  };
}

function requestLogger(req, res, next) {
  const start = Date.now();
  const originalEnd = res.end;

  res.end = function (...args) {
    const duration = Date.now() - start;
    const userId = req.user?.sub || 'anonymous';
    console.log(`[API] ${req.method} ${req.path} ${res.statusCode} ${duration}ms user=${userId}`);
    originalEnd.apply(res, args);
  };

  next();
}

function validateRequired(fields) {
  return (req, res, next) => {
    const missing = fields.filter(f => !req.body[f]);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `缺少必填字段: ${missing.join(', ')}`,
        missingFields: missing,
      });
    }
    next();
  };
}

module.exports = { paginate, asyncHandler, requestLogger, validateRequired };
