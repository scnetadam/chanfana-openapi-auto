const express = require('express');
const router = express.Router();
const hashEngine = require('../hashEngine');
const { hashStore, walletStore } = require('../models/dataStore');

router.post('/create', (req, res) => {
  const { txId, data, dataType, metadata, nonce } = req.body;
  if (!txId || (!data && !req.body.hash)) {
    return res.status(400).json({ success: false, error: 'txId and data(或hash) 为必填' });
  }
  let hash, dataDigest;
  if (req.body.hash) {
    hash = req.body.hash;
    dataDigest = req.body.dataDigest || hash.slice(0, 16);
  } else {
    const result = hashEngine.digest(data, nonce || '');
    hash = result.hash;
    dataDigest = result.digest;
  }
  const record = hashStore.create({ txId, hash, dataDigest, dataType: dataType || 'kol_ip', metadata: metadata || {}, source: 'local' });
  res.json({ success: true, data: record });
});

router.post('/chain', async (req, res) => {
  const { hash, txId, dataType, metadata } = req.body;
  if (!hash) {
    return res.status(400).json({ success: false, error: 'hash 为必填' });
  }

  const chainResult = await hashEngine.submitToAntChain(hash, { txId, dataType, ...metadata });

  if (chainResult.success || chainResult.simulated) {
    const updated = hashStore.updateChain(hash, {
      chainTxId: chainResult.chainTxId,
      chainTimestamp: chainResult.chainTimestamp,
      chainBlock: chainResult.chainBlock || '',
      chainExplorer: chainResult.chainExplorer || '',
      chainSource: chainResult.simulated ? 'antchain-sim' : 'antchain',
    });

    res.json({
      success: true,
      data: {
        hash,
        chainTxId: chainResult.chainTxId,
        chainTimestamp: chainResult.chainTimestamp,
        chainBlock: chainResult.chainBlock || '',
        chainExplorer: chainResult.chainExplorer || '',
        record: updated,
        simulated: chainResult.simulated || false,
        warning: chainResult.simulated ? '蚂蚁链API未配置，已模拟上链' : undefined,
      },
      message: chainResult.simulated ? '模拟上链成功(需配置蚂蚁链API)' : '蚂蚁链存证成功'
    });
  } else {
    res.status(500).json({
      success: false,
      error: chainResult.error || '蚂蚁链存证失败'
    });
  }
});

router.post('/notary', async (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { hash, txId, dataType, metadata } = req.body;
  if (!hash) {
    return res.status(400).json({ success: false, error: 'hash 为必填' });
  }

  const price = hashEngine.getNotaryPrice();
  const wallet = walletStore.get(userId);
  if (wallet && wallet.balance < price) {
    return res.status(400).json({
      success: false,
      error: '余额不足，公证云存证需 ' + price + ' 元',
      required: price,
      current: wallet.balance
    });
  }

  const notaryResult = await hashEngine.submitToNotaryCloud(hash, { txId, dataType, userId, ...metadata });

  if (notaryResult.success || notaryResult.simulated) {
    if (wallet && !notaryResult.simulated) {
      walletStore.withdraw(userId, price, '公证云存证费用');
    }

    const updated = hashStore.updateNotary(hash, {
      notaryId: notaryResult.notaryId,
      notaryUrl: notaryResult.notaryUrl,
      notaryTimestamp: notaryResult.notaryTimestamp,
      notarySource: notaryResult.simulated ? 'gongzhengyun-sim' : 'gongzhengyun',
      notaryPrice: price,
    });

    res.json({
      success: true,
      data: {
        hash,
        notaryId: notaryResult.notaryId,
        notaryUrl: notaryResult.notaryUrl,
        notaryTimestamp: notaryResult.notaryTimestamp,
        price: price,
        record: updated,
        simulated: notaryResult.simulated || false,
        warning: notaryResult.simulated ? '公证云API未配置，已模拟存证(未扣费)' : undefined,
      },
      message: notaryResult.simulated ? '模拟公证存证成功(需配置公证云API)' : '公证云存证成功，已扣费 ' + price + ' 元'
    });
  } else {
    res.status(500).json({
      success: false,
      error: notaryResult.error || '公证云存证失败'
    });
  }
});

router.get('/notary-price', (req, res) => {
  res.json({
    success: true,
    data: {
      price: hashEngine.getNotaryPrice(),
      currency: 'CNY',
      description: '公证云司法存证费用'
    }
  });
});

router.get('/chain-status/:hash', (req, res) => {
  const { hash } = req.params;
  const record = hashStore.getByHash(hash);
  if (!record) {
    return res.status(404).json({ success: false, error: '存证不存在' });
  }
  res.json({
    success: true,
    data: {
      hash: record.hash,
      chainTxId: record.chainTxId || '',
      chainTimestamp: record.chainTimestamp || '',
      chainSource: record.chainSource || '',
      chainExplorer: record.chainExplorer || '',
      notaryId: record.notaryId || '',
      notaryUrl: record.notaryUrl || '',
      notaryTimestamp: record.notaryTimestamp || '',
      notarySource: record.notarySource || '',
      isChained: !!(record.chainTxId),
      isNotarized: !!(record.notaryId),
    }
  });
});

router.get('/query', (req, res) => {
  const { txId, hash } = req.query;
  let records = [];
  if (txId) records = hashStore.getByTxId(txId);
  else if (hash) records = [hashStore.getByHash(hash)].filter(Boolean);
  if (records.length === 0) {
    return res.status(404).json({ success: false, error: '存证不存在' });
  }
  res.json({ success: true, data: records.length === 1 ? records[0] : records });
});

router.post('/verify', (req, res) => {
  const { data, hash, nonce } = req.body;
  if (!data || !hash) {
    return res.status(400).json({ success: false, error: 'data and hash 为必填' });
  }
  const valid = hashEngine.verify(data, hash, nonce || '');
  res.json({ success: true, data: { valid, hash } });
});

router.get('/list', (req, res) => {
  const { dataType, userId, page, pageSize } = req.query;
  const result = hashStore.list({ dataType, userId, page, pageSize });
  res.json({ success: true, data: result });
});

router.get('/stats', (req, res) => {
  const stats = hashStore.getStats();
  res.json({ success: true, data: stats });
});

module.exports = router;
