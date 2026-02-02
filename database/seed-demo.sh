#!/bin/bash

# Seed Demo Madrasah Data Script
# This script populates the database with demo madrasah data

echo "🌱 Seeding demo madrasah data..."

# Copy SQL file to container and execute it
docker cp /Users/aalaka/Documents/bigIdeas/madrasah-admin/database/seed-demo-madrasah.sql madrasah-mysql:/tmp/seed-demo.sql

echo "📂 Executing SQL script inside container..."
docker exec madrasah-mysql bash -c "mysql -uroot -proot_password madrasah_admin < /tmp/seed-demo.sql 2>&1" | grep -E "(ERROR|status)"

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "✅ Demo madrasah data seeded successfully!"
  docker exec madrasah-mysql mysql -uroot -proot_password madrasah_admin -e "
    SELECT COUNT(*) as users FROM users WHERE madrasah_id=(SELECT id FROM madrasahs WHERE slug='demo');
    SELECT COUNT(*) as students FROM students WHERE madrasah_id=(SELECT id FROM madrasahs WHERE slug='demo');
    SELECT COUNT(*) as classes FROM classes WHERE madrasah_id=(SELECT id FROM madrasahs WHERE slug='demo');
  " 2>/dev/null | grep -v "Warning"
else
  echo "❌ Error seeding demo madrasah data"
  exit 1
fi
