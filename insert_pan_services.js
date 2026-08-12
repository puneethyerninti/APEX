const fs = require('fs');

let content = fs.readFileSync('src/app/page.tsx', 'utf8');
let lines = content.split('\n');

// Add import if not exists
if (!content.includes('import PanCardServices')) {
    const importIndex = lines.findIndex(l => l.includes('import CreditCardCarousel'));
    if (importIndex > -1) {
        lines.splice(importIndex + 1, 0, "import PanCardServices from '@/components/PanCardServices';");
    } else {
        lines.splice(5, 0, "import PanCardServices from '@/components/PanCardServices';");
    }
}

// Insert before BBPS
const bbpsIndex = lines.findIndex(l => l.includes('{/* Payments (BBPS) Section */}'));
if (bbpsIndex > -1) {
    lines.splice(bbpsIndex, 0, '                                            <PanCardServices />\n');
}

fs.writeFileSync('src/app/page.tsx', lines.join('\n'));
console.log('Successfully inserted PAN Card Services');
