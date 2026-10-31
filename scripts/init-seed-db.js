const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function init() {
  const dbPath = path.resolve(__dirname, '..', 'prisma', 'seed.db');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  process.env.DATABASE_URL = `file:${dbPath}`;
  console.log('[Init] Pushing schema to seed.db...');
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit', env: process.env });

  console.log('[Init] Seeding demo data into seed.db...');
  execSync('node scripts/seed-demo.js', { stdio: 'inherit', env: process.env });

  console.log('[Init] Seed DB created successfully! File size:', fs.statSync(dbPath).size, 'bytes');
}

init().catch(console.error);
