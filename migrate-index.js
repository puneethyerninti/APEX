const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const rawHTML = fs.readFileSync('../index.html', 'utf8');
const $ = cheerio.load(rawHTML);

// Remove unwanted global elements
$('script').remove();
$('style').remove();
$('#navbar').remove(); // The sticky header is in Header.tsx
$('#profile-drawer-overlay').remove();
$('#wallet-drawer-overlay').remove();
$('div.fixed.bottom-0.w-full.max-w-md').remove(); // BottomNav
$('#loader').remove(); // Loader is in layout or not needed

let innerContent = '';
const wrapper = $('body > div.max-w-md');
if (wrapper.length > 0) {
    innerContent = wrapper.html();
} else {
    innerContent = $('body').html();
}

if (!innerContent) innerContent = '';

// Fix React attributes
innerContent = innerContent
    .replace(/class=/g, 'className=')
    .replace(/onclick=/gi, 'onClick=')
    .replace(/oninput=/gi, 'onChange=')
    .replace(/onchange=/gi, 'onChange=')
    .replace(/for=/gi, 'htmlFor=')
    // Close void elements
    .replace(/<img([^>]*[^/])>/g, '<img$1 />')
    .replace(/<input([^>]*[^/])>/g, '<input$1 />')
    .replace(/<br>/g, '<br />')
    .replace(/<hr([^>]*[^/])>/g, '<hr$1 />')
    // Fix inline styles
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

// Clear event handlers
innerContent = innerContent.replace(/onClick="([^"]*)"/g, 'onClick={() => {}}');
innerContent = innerContent.replace(/onChange="([^"]*)"/g, 'onChange={() => {}}');
innerContent = innerContent.replace(/<!--(.*?)-->/gs, '{/*$1*/}');

// Fix common attributes
innerContent = innerContent.replace(/selected /g, 'selected={true} ');
innerContent = innerContent.replace(/disabled /g, 'disabled={true} ');
innerContent = innerContent.replace(/checked /g, 'defaultChecked={true} ');
innerContent = innerContent.replace(/autocomplete=/gi, 'autoComplete=');
innerContent = innerContent.replace(/readonly /gi, 'readOnly={true} ');
innerContent = innerContent.replace(/stroke-linecap=/gi, 'strokeLinecap=');
innerContent = innerContent.replace(/stroke-linejoin=/gi, 'strokeLinejoin=');
innerContent = innerContent.replace(/stroke-width=/gi, 'strokeWidth=');

// Fix href links
innerContent = innerContent.replace(/href=["']([^"']*\.html)(#[^"']*)?["']/gi, (match, p1, p2) => {
    let route = p1.replace('.html', '');
    if (route === 'index' || route === './index' || route === '/index') {
        route = '/';
    } else if (!route.startsWith('http') && !route.startsWith('/')) {
        route = '/' + route.replace('./', '');
    }
    return `href="${route}${p2 || ''}"`;
});

const jsx = `
"use client";
import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      ${innerContent}
    </>
  );
}
`;

fs.writeFileSync('src/app/page.tsx', jsx);
console.log('Migrated index.html to page.tsx completely');
