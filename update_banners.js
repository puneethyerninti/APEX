const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');
let lines = content.split('\n');

const applyCta = `                                                    {/* Bottom CTA to replace the bulky loan cards */}
                                                    <div className="flex items-center justify-between w-full mt-2 relative z-10 bg-gradient-to-r from-red-900/40 via-red-800/40 to-transparent border border-red-500/20 rounded-lg p-2">
                                                        <p className="text-white text-[7px] sm:text-[9px] font-medium leading-tight">
                                                            Check your eligibility instantly!
                                                        </p>
                                                        <a href="https://wa.me/919494273763" target="_blank" rel="noopener noreferrer" className="bg-yellow-400 text-gray-900 text-[8px] sm:text-[10px] font-black px-3 py-1 rounded-full uppercase flex items-center gap-1 hover:scale-105 transition-transform shadow-md">
                                                            Apply Now <i className="fa-solid fa-arrow-right text-[6px]"></i>
                                                        </a>
                                                    </div>`;

const creditCardBanner = `                                            {/* ZET Credit Card Banner */}
                                            <div className="mb-5 bg-white rounded-xl shadow-lg border-2 border-purple-100 overflow-hidden relative w-full flex-shrink-0">
                                                <div className="p-2 sm:p-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-white">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow-sm">
                                                            <i className="fa-regular fa-credit-card text-[10px] sm:text-sm"></i>
                                                        </div>
                                                        <h3 className="text-gray-900 font-extrabold text-[10px] sm:text-sm uppercase tracking-wider">Credit Cards</h3>
                                                    </div>
                                                    <span className="text-purple-600 font-bold text-[8px] sm:text-[10px]">View All <i className="fa-solid fa-chevron-right text-[6px] sm:text-[8px]"></i></span>
                                                </div>
                                                <div className="p-2 flex flex-col md:grid md:grid-cols-2 gap-2 bg-[#FCFAFF]">
                                                    {/* Left Card */}
                                                    <div className="bg-[#0b0429] rounded-xl p-2.5 relative overflow-hidden flex shadow-md">
                                                        <div className="absolute top-0 left-0 bg-purple-600 text-white font-black text-[6px] sm:text-[7px] px-2 py-0.5 transform -rotate-45 -translate-x-3 translate-y-1 shadow-sm tracking-wide">NEW</div>
                                                        
                                                        {/* Card Image Placeholder */}
                                                        <div className="w-16 sm:w-24 bg-gradient-to-br from-purple-500 to-purple-800 rounded-lg p-1.5 flex flex-col justify-between shrink-0 shadow-lg border border-purple-400/30 relative min-h-[75px]">
                                                            <div className="flex justify-between items-start">
                                                                <span className="text-white font-black text-[8px] sm:text-[10px] tracking-tight">ZET</span>
                                                                <i className="fa-solid fa-wifi text-white/50 text-[8px] sm:text-[10px] transform rotate-90"></i>
                                                            </div>
                                                            <div className="w-5 h-3.5 sm:w-6 sm:h-4 bg-yellow-200/80 rounded-[2px] mt-2 mb-2 sm:mt-3 sm:mb-4"></div>
                                                            <div className="flex justify-between items-end">
                                                                <span className="text-white font-bold text-[5px] sm:text-[6px]">RuPay</span>
                                                                <span className="text-white font-bold text-[4px]">SELECT</span>
                                                            </div>
                                                            <div className="absolute -right-1.5 -bottom-1.5 sm:-right-2 sm:-bottom-2 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center border-[1.5px] border-[#0b0429] text-center shadow-lg leading-[0.9] sm:leading-[0.9]">
                                                                <span className="text-[#0b0429] font-black text-[4.5px] sm:text-[6px]">FD STARTS<br/>at just<br/>₹2,000</span>
                                                            </div>
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1 ml-2.5 flex flex-col justify-center min-w-0">
                                                            <h4 className="text-white font-black text-[10px] sm:text-sm mb-0.5 leading-tight truncate">ZET FD Credit Card</h4>
                                                            <p className="text-yellow-400 font-bold text-[7px] sm:text-[9px] mb-1.5 leading-tight">FD Se Card<br/>Card Se Credit Score</p>
                                                            <ul className="text-white/80 text-[6.5px] sm:text-[8px] space-y-0.5 mb-1.5 font-medium">
                                                                <li className="flex items-center gap-1"><i className="fa-solid fa-circle-check text-purple-400 text-[6px]"></i> FD starts from ₹2,000</li>
                                                                <li className="flex items-center gap-1"><i className="fa-solid fa-circle-check text-purple-400 text-[6px]"></i> Build 750+ Credit Score</li>
                                                                <li className="flex items-center gap-1"><i className="fa-solid fa-circle-check text-purple-400 text-[6px]"></i> Lifetime Free Card</li>
                                                                <li className="flex items-center gap-1"><i className="fa-solid fa-circle-check text-purple-400 text-[6px]"></i> <span className="font-bold border border-white/30 px-0.5 rounded-[2px] text-[5px] italic">UPI</span> Credit Card</li>
                                                            </ul>
                                                            <a href="https://wee.bnking.in/c/ZWQ0MDIIM" target="_blank" rel="noopener noreferrer" className="bg-purple-600 text-white font-bold text-[7px] sm:text-[9px] py-1 px-2.5 rounded text-center shadow-md hover:bg-purple-700 uppercase w-max flex items-center gap-1">Apply Now <i className="fa-solid fa-chevron-right text-[5px]"></i></a>
                                                        </div>
                                                    </div>

                                                    {/* Right Card */}
                                                    <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm flex flex-col justify-between">
                                                        <div className="text-center mb-1.5">
                                                            <h4 className="text-purple-700 font-black text-lg sm:text-xl mb-0.5 tracking-tight">ZET</h4>
                                                            <p className="text-gray-900 font-extrabold text-[9px] sm:text-xs leading-tight">Explore More Credit Cards<br/><span className="text-gray-500 font-medium text-[7.5px] sm:text-[9px]">on ZET Platform</span></p>
                                                        </div>
                                                        
                                                        <div className="flex justify-between items-start my-2 px-1">
                                                            <div className="flex flex-col items-center text-center max-w-[50px] sm:max-w-[60px]">
                                                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 mb-0.5 shadow-sm bg-gray-50">
                                                                    <i className="fa-regular fa-credit-card text-[8px] sm:text-xs"></i>
                                                                </div>
                                                                <span className="text-gray-600 text-[6px] sm:text-[7px] font-bold leading-[1.1]">Multiple Banks<br/>& Cards</span>
                                                            </div>
                                                            <div className="flex flex-col items-center text-center max-w-[50px] sm:max-w-[60px]">
                                                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 mb-0.5 shadow-sm bg-gray-50">
                                                                    <i className="fa-solid fa-percent text-[8px] sm:text-xs"></i>
                                                                </div>
                                                                <span className="text-gray-600 text-[6px] sm:text-[7px] font-bold leading-[1.1]">Best Offers<br/>& Rewards</span>
                                                            </div>
                                                            <div className="flex flex-col items-center text-center max-w-[50px] sm:max-w-[60px]">
                                                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 mb-0.5 shadow-sm bg-gray-50">
                                                                    <i className="fa-solid fa-bolt text-[8px] sm:text-xs"></i>
                                                                </div>
                                                                <span className="text-gray-600 text-[6px] sm:text-[7px] font-bold leading-[1.1]">Quick & Easy<br/>Approval</span>
                                                            </div>
                                                        </div>

                                                        <a href="https://wee.bnking.in/c/ZWQ0MDIIM" target="_blank" rel="noopener noreferrer" className="bg-purple-700 text-white font-bold text-[8px] sm:text-[10px] py-1.5 w-full rounded text-center shadow-md hover:bg-purple-800 uppercase flex items-center justify-center gap-1 mt-1">Explore Now <i className="fa-solid fa-chevron-right text-[6px]"></i></a>
                                                    </div>
                                                </div>
                                                
                                                {/* Bottom Ribbon */}
                                                <a href="https://wee.bnking.in/c/ZWQ0MDIIM" target="_blank" rel="noopener noreferrer" className="bg-purple-50 hover:bg-purple-100 transition-colors border-t border-purple-100 p-2 flex items-center justify-between cursor-pointer group">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-5 h-5 rounded bg-purple-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                                                            <i className="fa-solid fa-gift text-[8px]"></i>
                                                        </div>
                                                        <span className="text-gray-800 font-bold text-[8px] sm:text-[10px]">Apply through our link & get exclusive benefits</span>
                                                    </div>
                                                    <i className="fa-solid fa-chevron-right text-purple-400 text-[8px] sm:text-xs group-hover:text-purple-600 transition-colors"></i>
                                                </a>
                                            </div>

                                            {/* Mutual Funds Categories */}`;

// 1. Replace ZET banner
let mfIndex = lines.findIndex(l => l.includes('{/* Mutual Funds Categories */}'));
if(mfIndex > -1) {
    lines.splice(mfIndex - 1, 2, creditCardBanner);
}

// 2. Replace loan cards
let startLoanCards = lines.findIndex(l => l.includes('{/* Loan Cards */}'));
let checkIndex = lines.findIndex(l => l.includes('Check <i'));
let endLoanBanner = checkIndex + 2;

if(startLoanCards > -1 && endLoanBanner > startLoanCards) {
    lines.splice(startLoanCards, endLoanBanner - startLoanCards + 1, applyCta);
}

fs.writeFileSync('src/app/page.tsx', lines.join('\n'));
