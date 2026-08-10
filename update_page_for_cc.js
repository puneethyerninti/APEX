const fs = require('fs');

let content = fs.readFileSync('src/app/page.tsx', 'utf8');
let lines = content.split('\n');

// 1. Add import statement
const importLine = "import CreditCardCarousel from '@/components/CreditCardCarousel';";
let importIndex = lines.findIndex(l => l.includes('import Header from'));
if (importIndex > -1) {
    lines.splice(importIndex + 1, 0, importLine);
}

// 2. Replace the credit card banner block
let zetStart = lines.findIndex(l => l.includes('{/* ZET Credit Card Banner */}'));
let zetEnd = lines.findIndex(l => l.includes('{/* Mutual Funds Categories */}'));

if (zetStart > -1 && zetEnd > -1) {
    lines.splice(zetStart, zetEnd - zetStart, '                                            <CreditCardCarousel />\n');
}

fs.writeFileSync('src/app/page.tsx', lines.join('\n'));
console.log('Successfully updated page.tsx to use CreditCardCarousel');
