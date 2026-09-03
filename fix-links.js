const fs = require('fs');
const path = require('path');

function walk(dir) {
    let r = [];
    fs.readdirSync(dir).forEach(f => {
        f = path.join(dir, f);
        if (fs.statSync(f).isDirectory()) r = r.concat(walk(f));
        else r.push(f);
    });
    return r;
}

const files = walk('src/app').filter(f => f.endsWith('.tsx'));
files.forEach(f => {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/href=["']([^"']*\.html)(#[^"']*)?["']/gi, (match, p1, p2) => {
        let route = p1.replace('.html', '');
        if (route === 'index' || route === './index' || route === '/index') route = '/';
        else if (!route.startsWith('http') && !route.startsWith('/')) route = '/' + route.replace('./', '');
        return `href="${route}${p2 || ''}"`;
    });
    // Replace <a with <Link where it makes sense, but honestly it's safer to just let <a work for now,
    // Next.js handles <a> tags fine, they just trigger a full page reload. 
    // If we want SPA feel, we should replace them.
    // Let's replace <a href="/something"> with <Link href="/something">
    c = c.replace(/<a ([^>]*)href="(\/[^"]*)"([^>]*)>/gi, '<Link $1href="$2"$3>');
    c = c.replace(/<\/a>/gi, '</Link>');
    
    fs.writeFileSync(f, c);
});
console.log('Fixed links in ' + files.length + ' files');
