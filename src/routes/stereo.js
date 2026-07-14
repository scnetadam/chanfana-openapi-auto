const express = require('express');
const router = express.Router();

const stereoStore = {
  models: [],
  showcases: [
    {
      id: 'model-1',
      name: '宝马X5 3D模型',
      brand: '宝马',
      category: 'SUV',
      format: 'glTF',
      features: ['360度旋转', '内饰展示', '颜色切换', '尺寸标注'],
      fileSize: '15MB',
      status: 'ready'
    },
    {
      id: 'model-2',
      name: '奔驰S级 3D模型',
      brand: '奔驰',
      category: '轿车',
      format: 'glTF',
      features: ['360度旋转', '内饰展示', '颜色切换', 'AR展示'],
      fileSize: '18MB',
      status: 'ready'
    },
    {
      id: 'model-3',
      name: '特斯拉Model Y 3D模型',
      brand: '特斯拉',
      category: 'SUV',
      format: 'glTF',
      features: ['360度旋转', '内饰展示', '电池展示', 'AR展示'],
      fileSize: '20MB',
      status: 'ready'
    }
  ]
};

router.get('/models', (req, res) => {
  const { brand, category } = req.query;
  
  let models = stereoStore.showcases;
  
  if (brand) {
    models = models.filter(m => m.brand === brand);
  }
  
  if (category) {
    models = models.filter(m => m.category === category);
  }
  
  res.json({
    success: true,
    data: {
      models,
      total: models.length
    }
  });
});

router.get('/models/:modelId', (req, res) => {
  const { modelId } = req.params;
  const model = stereoStore.showcases.find(m => m.id === modelId);
  
  if (!model) {
    return res.status(404).json({
      success: false,
      error: '模型不存在'
    });
  }
  
  res.json({
    success: true,
    data: {
      ...model,
      modelUrl: `https://3d.x402.com/models/${modelId}.gltf`,
      textureUrl: `https://3d.x402.com/textures/${modelId}/`
    }
  });
});

router.post('/view', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { modelId, viewMode = '3d' } = req.body;
  
  const model = stereoStore.showcases.find(m => m.id === modelId);
  
  if (!model) {
    return res.status(404).json({
      success: false,
      error: '模型不存在'
    });
  }
  
  const viewSession = {
    id: `view-${Date.now()}`,
    userId,
    modelId,
    modelName: model.name,
    viewMode,
    modelUrl: `https://3d.x402.com/models/${modelId}.gltf`,
    controls: {
      rotate: true,
      zoom: true,
      pan: true,
      resetView: true
    },
    createdAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: viewSession
  });
});

router.post('/ar', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { modelId, platform = 'harmonyos' } = req.body;
  
  const model = stereoStore.showcases.find(m => m.id === modelId);
  
  if (!model) {
    return res.status(404).json({
      success: false,
      error: '模型不存在'
    });
  }
  
  const arSession = {
    id: `ar-${Date.now()}`,
    userId,
    modelId,
    modelName: model.name,
    platform,
    arUrl: `x402://ar/${modelId}`,
    features: {
      planeDetection: true,
      lightEstimation: true,
      scaleAdjustment: true,
      snapshot: true
    },
    instructions: [
      '打开手机摄像头',
      '扫描地面或平面',
      '点击放置3D模型',
      '可旋转、缩放查看'
    ],
    createdAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: arSession,
    message: 'AR会话创建成功'
  });
});

router.post('/compare', (req, res) => {
  const { modelIds } = req.body;
  
  if (!modelIds || modelIds.length < 2) {
    return res.status(400).json({
      success: false,
      error: '至少需要2个模型进行对比'
    });
  }
  
  const models = modelIds.map(id => {
    const model = stereoStore.showcases.find(m => m.id === id);
    return model ? {
      ...model,
      modelUrl: `https://3d.x402.com/models/${id}.gltf`
    } : null;
  }).filter(m => m);
  
  if (models.length < 2) {
    return res.status(404).json({
      success: false,
      error: '模型不存在'
    });
  }
  
  const compareSession = {
    id: `compare-${Date.now()}`,
    models,
    layout: 'side-by-side',
    features: {
      syncRotation: true,
      syncZoom: true,
      highlightDiff: true
    },
    createdAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: compareSession
  });
});

router.post('/customize', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { modelId, customizations } = req.body;
  
  const model = stereoStore.showcases.find(m => m.id === modelId);
  
  if (!model) {
    return res.status(404).json({
      success: false,
      error: '模型不存在'
    });
  }
  
  const customizedModel = {
    id: `custom-${Date.now()}`,
    userId,
    baseModelId: modelId,
    baseModelName: model.name,
    customizations: customizations || {},
    modelUrl: `https://3d.x402.com/custom/${Date.now()}.gltf`,
    previewUrl: `https://3d.x402.com/custom/${Date.now()}.jpg`,
    createdAt: new Date().toISOString()
  };
  
  stereoStore.models.push(customizedModel);
  
  res.json({
    success: true,
    data: customizedModel,
    message: '模型定制成功'
  });
});

router.get('/brands', (req, res) => {
  const brands = [...new Set(stereoStore.showcases.map(m => m.brand))];
  
  res.json({
    success: true,
    data: {
      brands,
      total: brands.length
    }
  });
});

router.get('/categories', (req, res) => {
  const categories = [...new Set(stereoStore.showcases.map(m => m.category))];
  
  res.json({
    success: true,
    data: {
      categories,
      total: categories.length
    }
  });
});

module.exports = router;
