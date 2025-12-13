// Test script to check available Gemini models
// Run: node test-gemini-model.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBeKUTBEtMfoUKam4n7TWNDJOOSUoaoTvs';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Models to test
const modelsToTest = [
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-pro',
  'models/gemini-1.5-pro',
  'models/gemini-1.5-flash'
];

async function testModels() {
  console.log('🔍 Testing Gemini models...\n');
  
  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say hello');
      const response = await result.response;
      const text = response.text();
      console.log(`✅ ${modelName} WORKS! Response: ${text.substring(0, 50)}...\n`);
      return modelName; // Return first working model
    } catch (error) {
      console.log(`❌ ${modelName} failed: ${error.message}\n`);
    }
  }
  
  console.log('❌ No working models found');
  return null;
}

testModels().then(workingModel => {
  if (workingModel) {
    console.log(`\n✅ Recommended model: ${workingModel}`);
  }
});

