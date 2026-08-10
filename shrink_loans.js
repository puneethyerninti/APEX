const fs = require('fs');

let content = fs.readFileSync('src/app/page.tsx', 'utf8');
let lines = content.split('\n');

const loanStart = lines.findIndex(l => l.includes('<div className="bg-[#0b0429] rounded-xl p-2 sm:p-3'));
const loanEnd = lines.findIndex(l => l.includes('<CreditCardCarousel />'));

if (loanStart > -1 && loanEnd > -1) {
    let loanBlock = lines.slice(loanStart, loanEnd).join('\n');
    
    // Reduce container padding
    loanBlock = loanBlock.replace('p-2 sm:p-3', 'p-1.5');
    
    // Reduce header size and margins
    loanBlock = loanBlock.replace('mb-3', 'mb-1.5'); // first occurrence
    loanBlock = loanBlock.replace('text-2xl sm:text-[28px]', 'text-xl sm:text-2xl');
    loanBlock = loanBlock.replace('text-[8px] sm:text-[10px] font-black uppercase flex items-center gap-1 mb-0.5', 'text-[7px] sm:text-[9px] font-black uppercase flex items-center gap-1 mb-0.5');
    loanBlock = loanBlock.replace('text-[8px] sm:text-[10px] font-black uppercase italic tracking-widest mb-3', 'text-[7px] sm:text-[9px] font-black uppercase italic tracking-widest mb-1.5');
    
    // Reduce Features margins
    loanBlock = loanBlock.replace('mb-3 border-b border-white/10 pb-2', 'mb-1.5 border-b border-white/10 pb-1');
    
    // Reduce Loan Cards size
    loanBlock = loanBlock.replace(/min-h-\[85px\]/g, 'min-h-[65px] p-0.5');
    loanBlock = loanBlock.replace(/h-6 w-auto object-contain drop-shadow-md mb-0\.5/g, 'h-4 w-auto object-contain drop-shadow-md mb-0.5');
    loanBlock = loanBlock.replace(/text-\[6px\] sm:text-\[8px\] font-black leading-tight/g, 'text-[5px] sm:text-[7px] font-black leading-tight');
    loanBlock = loanBlock.replace(/text-\[6px\] sm:text-\[8px\] font-black leading-\[1\.1\]/g, 'text-[5px] sm:text-[7px] font-black leading-[1.1]');
    loanBlock = loanBlock.replace(/text-\[4px\] sm:text-\[5px\] font-medium leading-tight px-0\.5 mb-1/g, 'text-[4px] font-medium leading-tight px-0.5 mb-0.5');
    loanBlock = loanBlock.replace(/py-1/g, 'py-0.5');
    
    // Reduce grid gap and margin
    loanBlock = loanBlock.replace('grid grid-cols-4 gap-1 mb-3', 'grid grid-cols-4 gap-0.5 mb-1.5');
    
    // Reduce Footer Features margin
    loanBlock = loanBlock.replace('mb-2 pt-1 border-t', 'mb-1 pt-0.5 border-t');
    
    // Bottom CTA
    loanBlock = loanBlock.replace('p-2 bg-gradient-to-r', 'p-1 bg-gradient-to-r');
    
    lines.splice(loanStart, loanEnd - loanStart, loanBlock);
    fs.writeFileSync('src/app/page.tsx', lines.join('\n'));
    console.log('Successfully shrunk loans section');
} else {
    console.log('Could not find loans section bounds');
}
