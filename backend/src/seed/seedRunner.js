const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

function run() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  const files = [
    { name: 'dataProducts.json', data: require('./seedData').dataProducts },
    { name: 'kolWeights.json', data: require('./seedData').kolWeights },
    { name: 'notaryRecords.json', data: require('./seedData').notaryRecords },
    { name: 'governanceRecords.json', data: require('./seedData').governanceRecords },
    { name: 'dataConsentRecords.json', data: require('./seedData').dataConsentRecords },
    { name: 'earningsRecords.json', data: require('./seedData').earningsRecords },
  ];
  
  files.forEach(f => {
    const p = path.join(DATA_DIR, f.name);
    fs.writeFileSync(p, JSON.stringify(f.data, null, 2), 'utf8');
    console.log('Written: ' + p + ' (' + f.data.length + ' records)');
  });
  
  console.log('\nSeed data written to: ' + DATA_DIR);
}

if (require.main === module) {
  run();
}

module.exports = { run };
