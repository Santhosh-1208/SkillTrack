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

    // fix components -> platform/widgets
    const compRegex = /(['"])((?:\.\.\/)+)components\//g;
    if (compRegex.test(content)) {
        content = content.replace(compRegex, '$1$2platform/widgets/');
        changed = true;
    }
    
    // fix context -> platform/engine/context
    const ctxRegex = /(['"])((?:\.\.\/)+)context\//g;
    if (ctxRegex.test(content)) {
        content = content.replace(ctxRegex, '$1$2platform/engine/context/');
        changed = true;
    }

    // fix engine -> platform/engine
    const engRegex = /(['"])((?:\.\.\/)+)engine\//g;
    if (engRegex.test(content)) {
        content = content.replace(engRegex, '$1$2platform/engine/');
        changed = true;
    }
    
    // Also ./components -> ./platform/widgets etc if any
    const compRegex2 = /(['"])\.\/components\//g;
    if (compRegex2.test(content)) {
        content = content.replace(compRegex2, '$1./platform/widgets/');
        changed = true;
    }

    const ctxRegex2 = /(['"])\.\/context\//g;
    if (ctxRegex2.test(content)) {
        content = content.replace(ctxRegex2, '$1./platform/engine/context/');
        changed = true;
    }
    
    const engRegex2 = /(['"])\.\/engine\//g;
    if (engRegex2.test(content)) {
        content = content.replace(engRegex2, '$1./platform/engine/');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
    }
});
console.log('Done');
