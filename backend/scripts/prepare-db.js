const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

if (!fs.existsSync(schemaPath)) {
  console.error(`[prepare-db] Schema file not found at ${schemaPath}`);
  process.exit(1);
}

let schema = fs.readFileSync(schemaPath, 'utf8');
const dbUrl = process.env.DATABASE_URL || '';

if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
  console.log('[prepare-db] 🐘 Detected PostgreSQL DATABASE_URL. Switching provider to "postgresql"...');
  schema = schema.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, schema);
  console.log('[prepare-db] ✅ schema.prisma successfully configured for PostgreSQL.');
} else {
  console.log('[prepare-db] 📁 Detected SQLite/Local DATABASE_URL. Ensuring provider is "sqlite"...');
  schema = schema.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
  fs.writeFileSync(schemaPath, schema);
  console.log('[prepare-db] ✅ schema.prisma successfully configured for SQLite.');
}
