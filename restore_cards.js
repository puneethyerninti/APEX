const fs = require('fs');

const loanCards = `                                                    {/* Loan Cards */}
                                                    <div className="grid grid-cols-4 gap-1 mb-3 relative z-10 w-full">
                                                        {/* Home Loan */}
                                                        <div className="bg-gradient-to-b from-blue-600 to-blue-900 rounded-lg p-1 flex flex-col items-center justify-between text-center min-h-[85px] border border-blue-400/30 shadow-inner overflow-hidden relative w-full min-w-0">
                                                            <img src="https://cdn-icons-png.flaticon.com/512/619/619032.png" alt="Home" className="h-6 w-auto object-contain drop-shadow-md mb-0.5 relative z-10 shrink-0" />
                                                            <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10 min-w-0">
                                                                <h5 className="text-white text-[6px] sm:text-[8px] font-black leading-tight mb-0.5 w-full truncate">Home Loan</h5>
                                                                <p className="text-blue-100 text-[4px] sm:text-[5px] font-medium leading-tight px-0.5 mb-1 w-full line-clamp-2">Buy your Dream Home</p>
                                                            </div>
                                                            <a href="https://wa.me/919494273763" target="_blank" className="w-full bg-white text-blue-900 text-[5px] font-black py-1 rounded flex items-center justify-center gap-0.5 hover:bg-gray-100 uppercase relative z-10 shrink-0">Apply <i className="fa-solid fa-arrow-right text-[4px]"></i></a>
                                                        </div>

                                                        {/* LAP */}
                                                        <div className="bg-gradient-to-b from-emerald-600 to-emerald-900 rounded-lg p-1 flex flex-col items-center justify-between text-center min-h-[85px] border border-emerald-400/30 shadow-inner overflow-hidden relative w-full min-w-0">
                                                            <img src="https://cdn-icons-png.flaticon.com/512/2558/2558055.png" alt="LAP" className="h-6 w-auto object-contain drop-shadow-md mb-0.5 relative z-10 shrink-0" />
                                                            <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10 min-w-0">
                                                                <h5 className="text-white text-[6px] sm:text-[8px] font-black leading-[1.1] mb-0.5 w-full truncate">LAP (Property)</h5>
                                                                <p className="text-emerald-100 text-[4px] sm:text-[5px] font-medium leading-tight px-0.5 mb-1 w-full line-clamp-2">Unlock property value</p>
                                                            </div>
                                                            <a href="https://wa.me/919494273763" target="_blank" className="w-full bg-white text-emerald-900 text-[5px] font-black py-1 rounded flex items-center justify-center gap-0.5 hover:bg-gray-100 uppercase relative z-10 shrink-0">Apply <i className="fa-solid fa-arrow-right text-[4px]"></i></a>
                                                        </div>

                                                        {/* Business Loan */}
                                                        <div className="bg-gradient-to-b from-orange-500 to-amber-800 rounded-lg p-1 flex flex-col items-center justify-between text-center min-h-[85px] border border-orange-400/30 shadow-inner overflow-hidden relative w-full min-w-0">
                                                            <img src="https://cdn-icons-png.flaticon.com/512/2942/2942258.png" alt="Business" className="h-6 w-auto object-contain drop-shadow-md mb-0.5 relative z-10 shrink-0" />
                                                            <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10 min-w-0">
                                                                <h5 className="text-white text-[6px] sm:text-[8px] font-black leading-tight mb-0.5 w-full truncate">Business Loan</h5>
                                                                <p className="text-orange-100 text-[4px] sm:text-[5px] font-medium leading-tight px-0.5 mb-1 w-full line-clamp-2">Grow your Business</p>
                                                            </div>
                                                            <a href="https://wa.me/919494273763" target="_blank" className="w-full bg-white text-orange-900 text-[5px] font-black py-1 rounded flex items-center justify-center gap-0.5 hover:bg-gray-100 uppercase relative z-10 shrink-0">Apply <i className="fa-solid fa-arrow-right text-[4px]"></i></a>
                                                        </div>

                                                        {/* Personal Loan */}
                                                        <div className="bg-gradient-to-b from-pink-500 to-rose-800 rounded-lg p-1 flex flex-col items-center justify-between text-center min-h-[85px] border border-pink-400/30 shadow-inner overflow-hidden relative w-full min-w-0">
                                                            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="Personal" className="h-6 w-auto object-contain drop-shadow-md mb-0.5 relative z-10 shrink-0" />
                                                            <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10 min-w-0">
                                                                <h5 className="text-white text-[6px] sm:text-[8px] font-black leading-tight mb-0.5 w-full truncate">Personal Loan</h5>
                                                                <p className="text-pink-100 text-[4px] sm:text-[5px] font-medium leading-tight px-0.5 mb-1 w-full line-clamp-2">Fulfill personal needs</p>
                                                            </div>
                                                            <a href="https://wa.me/919494273763" target="_blank" className="w-full bg-white text-pink-900 text-[5px] font-black py-1 rounded flex items-center justify-center gap-0.5 hover:bg-gray-100 uppercase relative z-10 shrink-0">Apply <i className="fa-solid fa-arrow-right text-[4px]"></i></a>
                                                        </div>
                                                    </div>

                                                    {/* Footer Features */}
                                                    <div className="flex justify-between items-center px-1 mb-2 pt-1 border-t border-white/10 relative z-10 w-full min-w-0">
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <i className="fa-solid fa-building-columns text-yellow-400 text-[6px] shrink-0"></i>
                                                            <span className="text-white text-[4px] sm:text-[6px] font-bold uppercase leading-[1.2] truncate">100+ Banks<br />Partners</span>
                                                        </div>
                                                        <div className="w-px h-4 bg-white/20 shrink-0"></div>
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <i className="fa-solid fa-headset text-yellow-400 text-[6px] shrink-0"></i>
                                                            <span className="text-white text-[4px] sm:text-[6px] font-bold uppercase leading-[1.2] truncate">Expert<br />Help</span>
                                                        </div>
                                                        <div className="w-px h-4 bg-white/20 shrink-0"></div>
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <i className="fa-solid fa-motorcycle text-yellow-400 text-[6px] shrink-0"></i>
                                                            <span className="text-white text-[4px] sm:text-[6px] font-bold uppercase leading-[1.2] truncate">Doorstep<br />Service</span>
                                                        </div>
                                                    </div>

                                                    {/* Bottom CTA */}
                                                    <div className="flex items-center justify-between w-full p-2 bg-gradient-to-r from-red-900/40 via-red-800/40 to-transparent border border-red-500/20 rounded-lg relative z-10 min-w-0">
                                                        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                                                            <span className="text-xs shrink-0">🎉</span>
                                                            <p className="text-white text-[5px] sm:text-[7px] font-medium leading-tight truncate">
                                                                <span className="text-yellow-400 font-bold uppercase">Offer:</span> Check eligibility!
                                                            </p>
                                                        </div>
                                                        <a href="https://wa.me/919494273763" target="_blank" className="bg-yellow-400 text-gray-900 text-[6px] sm:text-[8px] font-black px-2 py-1 rounded-full uppercase flex items-center gap-1 hover:scale-105 transition-transform shrink-0 shadow-sm ml-1">
                                                            Check <i className="fa-solid fa-arrow-right text-[5px]"></i>
                                                        </a>
                                                    </div>`;

let currentContent = fs.readFileSync('src/app/page.tsx', 'utf8');
let lines = currentContent.split('\n');

// The file currently has NO loan cards OR Bottom CTA. Wait, it just has empty lines because I deleted them earlier!
// Let me first view the exact lines at the deletion point!
