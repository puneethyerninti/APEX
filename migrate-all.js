const fs = require('fs');
const path = require('path');

const pages = [
    { html: 'store.html', route: 'store' },
    { html: 'realty.html', route: 'realty' },
    { html: 'academy.html', route: 'academy' },
    { html: 'finance.html', route: 'finance' },
    { html: 'travels.html', route: 'travels' },
    { html: 'matrimony.html', route: 'matrimony' },
    { html: 'charity.html', route: 'charity' },
];

pages.forEach(({ html, route }) => {
    let content = fs.readFileSync(`../${html}`, 'utf8');

    // Extract everything between <body> and </body>
    const bodyMatch = content.match(/<body[^>]*>(.*?)<\/body>/is);
    if (!bodyMatch) {
        console.log("No body found for", html);
        return;
    }
    
    let innerContent = bodyMatch[1];
    
    // The content is wrapped in <div class="w-full max-w-md...">
    // We want to remove that wrapper because Next.js layout already has it.
    let firstDivEnd = innerContent.indexOf('>');
    let lastDivStart = innerContent.lastIndexOf('</div>');
    if (firstDivEnd !== -1 && lastDivStart !== -1) {
        innerContent = innerContent.substring(firstDivEnd + 1, lastDivStart);
    }
    
    // Remove BottomNav from innerContent if present, because it's in layout.tsx
    let bottomNavStart = innerContent.indexOf('<!-- Sticky Bottom Navigation');
    if (bottomNavStart !== -1) {
        let bottomNavEnd = innerContent.indexOf('</div>', innerContent.indexOf('</div>', bottomNavStart) + 5) + 6;
        innerContent = innerContent.substring(0, bottomNavStart) + innerContent.substring(bottomNavEnd);
    }
    
    // Remove APEX Header from innerContent if present, because it's in layout.tsx
    // (We look for the specific global header ID or classes)
    let headerStart = innerContent.indexOf('id="navbar"');
    if (headerStart !== -1 && innerContent.includes('<!-- ═══════════════════════════════ STICKY HEADER')) {
        let actualHeaderStart = innerContent.lastIndexOf('<!-- ═══════════════════════════════ STICKY HEADER');
        let headerEnd = innerContent.indexOf('<!--', headerStart);
        if(headerEnd !== -1) {
             innerContent = innerContent.substring(0, actualHeaderStart) + innerContent.substring(headerEnd);
        }
    }

    // Remove Profile Drawer
    let profileDrawer = innerContent.indexOf('<!-- Profile Drawer Overlay -->');
    if (profileDrawer !== -1) {
        let endProfile = innerContent.indexOf('</div>', innerContent.indexOf('id="profile-drawer"', profileDrawer));
        // just hacky remove from profileDrawer to end
        innerContent = innerContent.substring(0, profileDrawer);
    }

    // Convert to JSX
    innerContent = innerContent
        .replace(/class=/g, 'className=')
        .replace(/onclick=/g, 'onClick=')
        .replace(/oninput=/g, 'onChange=')
        .replace(/for=/g, 'htmlFor=')
        .replace(/<img([^>]*[^/])>/g, '<img$1 />')
        .replace(/<input([^>]*[^/])>/g, '<input$1 />')
        .replace(/<br>/g, '<br />')
        .replace(/<hr([^>]*[^/])>/g, '<hr$1 />')
        .replace(/style="([^"]*)"/g, (match, p1) => {
            const styles = p1.split(';').filter(s => s.trim() !== '').map(s => {
                const idx = s.indexOf(':');
                if (idx === -1) return '';
                const key = s.substring(0, idx).trim();
                const value = s.substring(idx + 1).trim();
                const camelKey = key.replace(/-([a-z])/g, g => g[1].toUpperCase());
                return `${camelKey}: "${value.replace(/"/g, '\\"')}"`;
            }).filter(Boolean).join(', ');
            return `style={{ ${styles} }}`;
        });

    innerContent = innerContent.replace(/onClick="([^"]*)"/g, 'onClick={() => {}}');
    innerContent = innerContent.replace(/onChange="([^"]*)"/g, 'onChange={() => {}}');
    innerContent = innerContent.replace(/onchange="([^"]*)"/g, 'onChange={() => {}}');
    innerContent = innerContent.replace(/<!--(.*?)-->/gs, '{/*$1*/}');
    innerContent = innerContent.replace(/<script>.*?<\/script>/gs, '');
    innerContent = innerContent.replace(/<style>.*?<\/style>/gs, '');
    
    // Fix common unclosed tags or weird attributes
    innerContent = innerContent.replace(/selected /g, 'selected={true} ');
    innerContent = innerContent.replace(/disabled /g, 'disabled={true} ');
    innerContent = innerContent.replace(/checked /g, 'defaultChecked={true} ');
    innerContent = innerContent.replace(/autocomplete=/g, 'autoComplete=');
    innerContent = innerContent.replace(/readonly /g, 'readOnly={true} ');
    
    const jsx = `
"use client";
import React from 'react';
import Link from 'next/link';

export default function Page() {
  return (
    <>
      ${innerContent}
    </>
  );
}
`;

    const dir = path.join('./src/app', route);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'page.tsx'), jsx);
    console.log(`Migrated ${html} to ${route}/page.tsx`);
});
