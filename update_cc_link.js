const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');
content = content.replace(/https:\/\/wee\.bnking\.in\/c\/ZWQ0MDIIM/g, 'https://wee.bnking.in/c/ZWI1YjlkZ');
fs.writeFileSync('src/app/page.tsx', content);
console.log('Successfully updated credit card links');
