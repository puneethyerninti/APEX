const fs = require('fs');

const html = fs.readFileSync('../index.html', 'utf8');

// Extract everything between <div class="w-full max-w-md bg-[#F4F6FB]..."> and <!-- Profile Drawer Overlay -->
// Wait, the Next.js layout already has the max-w-md wrapper! 
// So we just need the inner content of index.html.

const startIndex = html.indexOf('<!-- Loader -->');
const endIndex = html.indexOf('<!-- Sticky Bottom Navigation');

if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find start or end markers');
    process.exit(1);
}

let content = html.substring(startIndex, endIndex);

// Remove the Sticky Header because we already put it in Header.tsx
const headerStart = content.indexOf('<!-- ═══════════════════════════════ STICKY HEADER & SEARCH ═══════════════════════════════ -->');
const headerEnd = content.indexOf('<!-- Flipkart-style Categories Compact Grid -->');
if(headerStart !== -1 && headerEnd !== -1) {
    content = content.substring(0, headerStart) + content.substring(headerEnd);
}

// Convert HTML to JSX
content = content
    .replace(/class=/g, 'className=')
    .replace(/onclick=/g, 'onClick=')
    .replace(/for=/g, 'htmlFor=')
    .replace(/<img([^>]*[^/])>/g, '<img$1 />')
    .replace(/<input([^>]*[^/])>/g, '<input$1 />')
    .replace(/<br>/g, '<br />')
    .replace(/<hr([^>]*[^/])>/g, '<hr$1 />')
    // Fix inline styles
    .replace(/style="([^"]*)"/g, (match, p1) => {
        const styles = p1.split(';').filter(s => s.trim() !== '').map(s => {
            const [key, value] = s.split(':');
            if(!key || !value) return '';
            const camelKey = key.trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
            return `${camelKey}: '${value.trim()}'`;
        }).filter(Boolean).join(', ');
        return `style={{ ${styles} }}`;
    });

// Replace onclick string handlers with simple arrow functions to prevent compilation errors
content = content.replace(/onClick="([^"]*)"/g, 'onClick={() => {}}');

// Next Image replacement is complex, so we leave it as img for now (valid JSX).

const jsx = `
export default function Home() {
  return (
    <>
      ${content}
    </>
  );
}
`;

fs.writeFileSync('./src/app/page.tsx', jsx);
console.log('Successfully migrated index.html to page.tsx');
