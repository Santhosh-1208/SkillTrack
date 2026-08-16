const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if(file.endsWith('.jsx') || file.endsWith('.js')) results.push(file);
        }
    });
    return results;
}

const files = walk('E:/skilltrack/skilltrack-frontend/src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // We only want to replace instances that point outside of src/app/components
    // Specifically looking for the context and old components directory which are now in platform
    
    // AuthContext and ToastContext are unique
    if (content.includes('context/AuthContext')) {
        content = content.replace(/([.'"/]+)context\/AuthContext/g, (match, prefix) => {
            if (prefix.includes('platform')) return match; // already fixed
            return prefix + 'platform/engine/context/AuthContext';
        });
        changed = true;
    }
    
    if (content.includes('context/ToastContext')) {
        content = content.replace(/([.'"/]+)context\/ToastContext/g, (match, prefix) => {
            if (prefix.includes('platform')) return match;
            return prefix + 'platform/engine/context/ToastContext';
        });
        changed = true;
    }
    
    // Check for components/ProgressRing, components/Terminal, components/ThreeViewer, components/CategorySidebar, components/GlassCard
    const oldComponents = ['ProgressRing', 'Terminal', 'ThreeViewer', 'CategorySidebar', 'GlassCard'];
    oldComponents.forEach(comp => {
        if (content.includes(`components/${comp}`)) {
            const regex = new RegExp(`(['"/.]+)(components/${comp})`, 'g');
            content = content.replace(regex, (match, prefix, suffix) => {
                // If it's importing from src/app/components we leave it (but those aren't named this except maybe ProgressRing)
                // Let's just blindly redirect to platform/widgets for these specific old ones
                return prefix + 'platform/widgets/' + comp;
            });
            changed = true;
        }
    });

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
    }
});
console.log('Paths fixed.');
