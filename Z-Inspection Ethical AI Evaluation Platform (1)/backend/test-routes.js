// Test script to check if routes are loading correctly
// Run: node test-routes.js

console.log('🔍 Testing route loading...\n');

try {
  console.log('1. Testing reportRoutes require...');
  const reportRoutes = require('./routes/reportRoutes');
  console.log('   ✅ reportRoutes loaded successfully');
  
  console.log('\n2. Testing reportController require...');
  const reportController = require('./controllers/reportController');
  console.log('   ✅ reportController loaded successfully');
  
  console.log('\n3. Testing geminiService require...');
  const geminiService = require('./services/geminiService');
  console.log('   ✅ geminiService loaded successfully');
  
  console.log('\n4. Testing models require...');
  const Score = require('./models/score');
  console.log('   ✅ Score model loaded successfully');
  
  console.log('\n✅ All routes and dependencies are loading correctly!');
  console.log('\n💡 If backend still gives 404:');
  console.log('   1. Make sure backend is running: npm start');
  console.log('   2. Check backend console for errors');
  console.log('   3. Verify server.js has: app.use("/api/reports", reportRoutes)');
  
} catch (error) {
  console.error('\n❌ Error loading routes:', error.message);
  console.error('Stack:', error.stack);
  console.log('\n💡 Fix the error above, then restart backend');
}


