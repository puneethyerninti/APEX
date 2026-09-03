const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

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
    const rawHTML = fs.readFileSync(`../${html}`, 'utf8');
    const $ = cheerio.load(rawHTML);

    // Remove unwanted global elements
    $('script').remove();
    $('style').remove();
    $('#navbar').remove();
    $('#profile-drawer-overlay').remove();
    $('#wallet-drawer-overlay').remove();
    
    // Remove BottomNav (which is usually immediately following a comment "Sticky Bottom Navigation")
    // Let's just find it by its classes "fixed bottom-0 w-full max-w-md"
    $('div.fixed.bottom-0.w-full.max-w-md').remove();

    // Get the inner HTML of the main wrapper
    // The wrapper is usually <div class="max-w-md w-full mx-auto ...">
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
    console.log(`Migrated ${html} to ${route}/page.tsx using Cheerio`);
});
