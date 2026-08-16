const fs = require('fs');
const path = require('path');

const dir = 'E:/skilltrack/skilltrack-frontend/src/app/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Convert dark backgrounds to light
    content = content.replace(/background:\s*['"]#0f0f0f['"]/g, "background: '#ffffff'");
    content = content.replace(/background:\s*['"]#0d0d0d['"]/g, "background: '#f9fafb'");
    content = content.replace(/background:\s*['"]#1a1a1a['"]/g, "background: '#ffffff'");
    content = content.replace(/background:\s*['"]linear-gradient\(135deg, #1a1a2e 0%, #16213e 100%\)['"]/g, "background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'");
    content = content.replace(/background:\s*['"]linear-gradient\(135deg, #0f1a2e, #1e2a3a\)['"]/g, "background: '#f3f4f6'"); // AIFeedback header
    
    // 2. Convert white borders to dark borders
    content = content.replace(/rgba\(255,255,255,0\.07\)/g, "rgba(0,0,0,0.06)");
    content = content.replace(/rgba\(255,255,255,0\.1\)/g, "rgba(0,0,0,0.1)");
    
    // 3. Fix text colors
    // We only replace #ffffff to #111827 if it's not a known primary button or specific active tab.
    // Actually, let's just do a blanket replace and then fix the obvious ones:
    content = content.replace(/color:\s*['"]#ffffff['"]/g, "color: '#111827'");
    content = content.replace(/color:\s*['"]#9ca3af['"]/g, "color: '#6b7280'");

    // 4. Restore white text on specific known dark backgrounds (e.g. #0056D2 for active tabs)
    // If there's an active tab style: background: '#0056D2', color: '#111827' -> make color '#ffffff'
    content = content.replace(/background:\s*['"]#0056D2['"],\s*color:\s*['"]#111827['"]/g, "background: '#0056D2', color: '#ffffff'");
    
    // In Leaderboard, the rank bar has a color. 
    // In AIFeedback, AI header has gradient.
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Processed ${file}`);
});
