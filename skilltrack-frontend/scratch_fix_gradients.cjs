const fs = require('fs');
const path = require('path');

const dir = 'E:/skilltrack/skilltrack-frontend/src/app/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Any place where color is #1f2937 but background is a colorful gradient, make it #ffffff
    // We can just replace color: '#1f2937' with color: '#ffffff' if it is inside a style that has linear-gradient
    // Actually, simpler to just globally replace color: '#1f2937' (or "#1f2937") to '#ffffff' ONLY in lines containing linear-gradient
    
    let lines = content.split('\n');
    let changed = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('linear-gradient') && lines[i].includes('1f2937')) {
            lines[i] = lines[i].replace(/color:\s*['"]#1f2937['"]/g, "color: '#ffffff'");
            changed = true;
        }
    }
    
    if (changed) {
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
        console.log(`Fixed gradients in ${file}`);
    }
});
