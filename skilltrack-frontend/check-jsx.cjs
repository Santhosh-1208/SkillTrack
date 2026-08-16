const fs = require('fs');
const babel = require('@babel/parser');
const code = fs.readFileSync('E:/SKILLTRACK/skilltrack-frontend/src/app/pages/AIFeedbackPage.jsx', 'utf-8');
try {
  babel.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  console.log('Parsed successfully!');
} catch (e) {
  console.error(e.message);
}
