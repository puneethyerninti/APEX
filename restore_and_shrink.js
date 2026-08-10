const fs = require('fs');

// 1. Get the old loan cards
let oldContent = fs.readFileSync('previous_page.tsx', 'utf8');
let oldLines = oldContent.split('\n');
let startLoanCards = oldLines.findIndex(l => l.includes('{/* Loan Cards */}'));
// The old loan banner ended with "Check <i className="fa-solid fa-arrow-right text-[5px]"></i>" and a few divs.
let checkIndexOld = oldLines.findIndex(l => l.includes('Check <i className="fa-solid fa-arrow-right text-[5px]"></i>'));
let oldLoanCardsBlock = oldLines.slice(startLoanCards, checkIndexOld + 3).join('\n'); // up to the closing div of Bottom CTA


// 2. Prepare the shrunken credit cards block
const smallCreditCardBanner = `                                            {/* ZET Credit Card Banner */}
                                            <div className="mb-4 bg-white rounded-lg shadow-sm border border-purple-100 overflow-hidden relative w-full flex-shrink-0">
                                                <div className="p-1.5 sm:p-2 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-white">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-purple-600 flex items-center justify-center text-white shadow-sm">
                                                            <i className="fa-regular fa-credit-card text-[8px] sm:text-[10px]"></i>
                                                        </div>
                                                        <h3 className="text-gray-900 font-extrabold text-[8px] sm:text-[10px] uppercase tracking-wider">Credit Cards</h3>
                                                    </div>
                                                    <span className="text-purple-600 font-bold text-[6px] sm:text-[8px]">View All <i className="fa-solid fa-chevron-right text-[5px]"></i></span>
                                                </div>
                                                <div className="p-1.5 flex flex-col md:flex-row gap-1.5 bg-[#FCFAFF]">
                                                    {/* Left Card */}
                                                    <div className="bg-[#0b0429] rounded-lg p-1.5 relative overflow-hidden flex shadow-sm flex-1">
                                                        <div className="absolute top-0 left-0 bg-purple-600 text-white font-black text-[5px] px-1.5 py-0.5 transform -rotate-45 -translate-x-3 translate-y-0.5 shadow-sm tracking-wide">NEW</div>
                                                        
                                                        {/* Card Image Placeholder */}
                                                        <div className="w-14 sm:w-16 bg-gradient-to-br from-purple-500 to-purple-800 rounded p-1 flex flex-col justify-between shrink-0 shadow-sm border border-purple-400/30 relative min-h-[50px]">
                                                            <div className="flex justify-between items-start">
                                                                <span className="text-white font-black text-[6px] tracking-tight">ZET</span>
                                                                <i className="fa-solid fa-wifi text-white/50 text-[6px] transform rotate-90"></i>
                                                            </div>
                                                            <div className="w-4 h-2.5 bg-yellow-200/80 rounded-[2px] mt-1 mb-1"></div>
                                                            <div className="flex justify-between items-end">
                                                                <span className="text-white font-bold text-[4px]">RuPay</span>
                                                                <span className="text-white font-bold text-[3px]">SELECT</span>
                                                            </div>
                                                            <div className="absolute -right-1 -bottom-1 w-6 h-6 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center border border-[#0b0429] text-center shadow-sm leading-[0.9]">
                                                                <span className="text-[#0b0429] font-black text-[3.5px]">FD STARTS<br/>₹2,000</span>
                                                            </div>
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1 ml-1.5 flex flex-col justify-center min-w-0">
                                                            <h4 className="text-white font-black text-[8px] sm:text-[9px] mb-0.5 leading-tight truncate">ZET FD Credit Card</h4>
                                                            <p className="text-yellow-400 font-bold text-[6px] sm:text-[7px] mb-1 leading-tight">FD Se Card</p>
                                                            <ul className="text-white/80 text-[5px] sm:text-[6px] space-y-0.5 mb-1 font-medium">
                                                                <li className="flex items-center gap-0.5"><i className="fa-solid fa-circle-check text-purple-400 text-[5px]"></i> Starts ₹2,000</li>
                                                                <li className="flex items-center gap-0.5"><i className="fa-solid fa-circle-check text-purple-400 text-[5px]"></i> Lifetime Free</li>
                                                            </ul>
                                                            <a href="https://wee.bnking.in/c/ZWQ0MDIIM" target="_blank" rel="noopener noreferrer" className="bg-purple-600 text-white font-bold text-[6px] sm:text-[7px] py-0.5 px-1.5 rounded text-center shadow hover:bg-purple-700 uppercase w-max flex items-center gap-0.5">Apply Now <i className="fa-solid fa-chevron-right text-[4px]"></i></a>
                                                        </div>
                                                    </div>

                                                    {/* Right Card */}
                                                    <div className="bg-white rounded-lg p-1.5 border border-gray-100 shadow-sm flex flex-col justify-between flex-1">
                                                        <div className="text-center mb-1">
                                                            <h4 className="text-purple-700 font-black text-[10px] sm:text-xs mb-0.5 tracking-tight">ZET</h4>
                                                            <p className="text-gray-900 font-extrabold text-[7px] sm:text-[8px] leading-tight">Explore More Credit Cards</p>
                                                        </div>
                                                        
                                                        <div className="flex justify-around items-start my-1 px-0.5">
                                                            <div className="flex flex-col items-center text-center">
                                                                <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 mb-0.5 shadow-sm bg-gray-50">
                                                                    <i className="fa-regular fa-credit-card text-[6px]"></i>
                                                                </div>
                                                                <span className="text-gray-600 text-[5px] font-bold leading-[1.1]">Multiple Cards</span>
                                                            </div>
                                                            <div className="flex flex-col items-center text-center">
                                                                <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 mb-0.5 shadow-sm bg-gray-50">
                                                                    <i className="fa-solid fa-percent text-[6px]"></i>
                                                                </div>
                                                                <span className="text-gray-600 text-[5px] font-bold leading-[1.1]">Best Offers</span>
                                                            </div>
                                                            <div className="flex flex-col items-center text-center">
                                                                <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 mb-0.5 shadow-sm bg-gray-50">
                                                                    <i className="fa-solid fa-bolt text-[6px]"></i>
                                                                </div>
                                                                <span className="text-gray-600 text-[5px] font-bold leading-[1.1]">Fast Approval</span>
                                                            </div>
                                                        </div>

                                                        <a href="https://wee.bnking.in/c/ZWQ0MDIIM" target="_blank" rel="noopener noreferrer" className="bg-purple-700 text-white font-bold text-[6px] sm:text-[7px] py-1 w-full rounded text-center shadow-sm hover:bg-purple-800 uppercase flex items-center justify-center gap-1 mt-0.5">Explore Now <i className="fa-solid fa-chevron-right text-[5px]"></i></a>
                                                    </div>
                                                </div>
                                                
                                                {/* Bottom Ribbon */}
                                                <a href="https://wee.bnking.in/c/ZWQ0MDIIM" target="_blank" rel="noopener noreferrer" className="bg-purple-50 hover:bg-purple-100 transition-colors border-t border-purple-100 p-1.5 flex items-center justify-between cursor-pointer group">
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-4 h-4 rounded bg-purple-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                                                            <i className="fa-solid fa-gift text-[6px]"></i>
                                                        </div>
                                                        <span className="text-gray-800 font-bold text-[6px] sm:text-[7px]">Apply through our link & get exclusive benefits</span>
                                                    </div>
                                                    <i className="fa-solid fa-chevron-right text-purple-400 text-[6px] sm:text-[8px] group-hover:text-purple-600 transition-colors"></i>
                                                </a>
                                            </div>`;

// 3. Process current file
let currentContent = fs.readFileSync('src/app/page.tsx', 'utf8');
let lines = currentContent.split('\n');

// Replace new bottom CTA with the old loan cards block
let newCtaStart = lines.findIndex(l => l.includes('{/* Bottom CTA to replace the bulky loan cards */}'));
let newCtaEnd = lines.findIndex(l => l.includes('Apply Now <i className="fa-solid fa-arrow-right text-[6px]"></i>'));
if (newCtaStart > -1 && newCtaEnd > -1) {
    lines.splice(newCtaStart, newCtaEnd - newCtaStart + 3, oldLoanCardsBlock); // +3 to get the </a> and </div>
}

// Replace the ZET Credit card banner with the smaller one
let zetStart = lines.findIndex(l => l.includes('{/* ZET Credit Card Banner */}'));
// Look for next section to find the end of ZET banner
let zetEnd = lines.findIndex(l => l.includes('{/* Mutual Funds Categories */}'));
if (zetStart > -1 && zetEnd > -1) {
    lines.splice(zetStart, zetEnd - zetStart, smallCreditCardBanner + '\n\n                                            ');
}

fs.writeFileSync('src/app/page.tsx', lines.join('\n'));
console.log("Successfully restored loan cards and shrunk credit card banner.");
