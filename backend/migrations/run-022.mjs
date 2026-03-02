import mysql from 'mysql2/promise';

const DB_URL = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL || 'mysql://root:wkBmlsiSSgbEXkvcNYLfgguxjrKjQNwP@ballast.proxy.rlwy.net:49251/railway';

async function run() {
  const url = new URL(DB_URL);
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port),
    user: url.username,
    password: decodeURIComponent(url.password),
    database: url.pathname.replace('/', ''),
    multipleStatements: true
  });

  console.log('Connected to database');

  // Check current state
  const [cols] = await conn.query("SHOW COLUMNS FROM madrasahs LIKE 'pricing_plan'");
  console.log('Current ENUM:', cols[0]?.Type);

  if (cols[0]?.Type?.includes('solo')) {
    console.log('solo already in ENUM, skipping ALTER');
  } else {
    await conn.query("ALTER TABLE madrasahs MODIFY COLUMN pricing_plan ENUM('trial', 'solo', 'standard', 'plus', 'enterprise') DEFAULT 'trial'");
    console.log('ALTER TABLE done - added solo to ENUM');
  }

  // Check if migration already recorded
  const [existing] = await conn.query("SELECT name FROM migrations WHERE name = '022_add_solo_plan'");
  if (existing.length > 0) {
    console.log('Migration already recorded');
  } else {
    await conn.query("INSERT INTO migrations (name, applied_at) VALUES ('022_add_solo_plan', NOW())");
    console.log('Migration recorded in migrations table');
  }

  // Verify
  const [verify] = await conn.query("SHOW COLUMNS FROM madrasahs LIKE 'pricing_plan'");
  console.log('Verified ENUM:', verify[0]?.Type);

  await conn.end();
  console.log('Done!');
}

run().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
