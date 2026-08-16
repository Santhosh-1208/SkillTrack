const fs = require('fs');
let code = fs.readFileSync('E:/SKILLTRACK/skilltrack-frontend/src/app/pages/AIFeedbackPage.jsx', 'utf-8');

// Replace the early return with a variable assignment
code = code.replace(
  /if \(allAttempts\.length === 0\) \{\s*return \(\s*<div className="flex h-full"[^>]*>\s*<div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">([\s\S]*?)<\/div>\s*<\/div>\s*\);\s*\}/,
  'const emptyStateContent = (\n    <div className="flex flex-col items-center justify-center h-full min-h-[400px]">\n    </div>\n  );'
);

// Replace the selectedAttempt check to use the new variable
code = code.replace(
  /\{!selectedAttempt \? \(/,
  '{allAttempts.length === 0 ? (\n          emptyStateContent\n        ) : !selectedAttempt ? ('
);

fs.writeFileSync('E:/SKILLTRACK/skilltrack-frontend/src/app/pages/AIFeedbackPage.jsx', code);
