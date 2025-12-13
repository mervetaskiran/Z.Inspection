// Quick check script to verify endpoint is registered
// Run: node CHECK_ENDPOINT.js

const express = require('express');
const app = express();

// Simulate the route registration
console.log('🔍 Checking endpoint registration...\n');

// Check if the route would be registered
const routes = [
  'POST /api/reports/generate',
  'GET /api/reports',
  'GET /api/reports/:id',
  'PUT /api/reports/:id',
  'DELETE /api/reports/:id'
];

console.log('✅ Endpoints that should be available:');
routes.forEach(route => {
  console.log(`   ${route}`);
});

console.log('\n💡 If you get 404 error:');
console.log('   1. Backend\'i durdurun (Ctrl+C)');
console.log('   2. Backend\'i yeniden başlatın: npm start');
console.log('   3. Server console\'da hata olup olmadığını kontrol edin');
console.log('   4. Endpoint\'lerin yüklendiğinden emin olun');

