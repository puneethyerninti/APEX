const fs = require('fs');

let content = fs.readFileSync('src/components/PanCardServices.tsx', 'utf8');

const dummyPanCSS = `
                {/* Dummy PAN Card Visual */}
                <div className="mt-3 bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200 rounded-lg p-2 border border-blue-300/50 shadow-inner relative overflow-hidden">
                    {/* Top Header */}
                    <div className="flex justify-between items-start border-b border-blue-900/10 pb-1 mb-1 relative z-10">
                        <div>
                            <p className="text-blue-900 text-[5px] font-bold leading-tight">आयकर विभाग</p>
                            <p className="text-blue-900 text-[4px] font-bold leading-tight uppercase">Income Tax Department</p>
                        </div>
                        <div className="w-4 h-5 flex flex-col items-center justify-center opacity-80">
                            <i className="fa-solid fa-building-columns text-blue-900 text-[8px]"></i>
                        </div>
                        <div className="text-right">
                            <p className="text-blue-900 text-[5px] font-bold leading-tight">भारत सरकार</p>
                            <p className="text-blue-900 text-[4px] font-bold leading-tight uppercase">Govt. of India</p>
                        </div>
                    </div>
                    
                    {/* Body */}
                    <div className="flex gap-2 relative z-10">
                        {/* Details */}
                        <div className="flex-1 space-y-1">
                            <div>
                                <p className="text-blue-900/60 text-[3.5px] leading-tight">नाम / Name</p>
                                <p className="text-gray-900 text-[6px] font-black leading-tight tracking-wide">RAHUL KUMAR</p>
                            </div>
                            <div>
                                <p className="text-blue-900/60 text-[3.5px] leading-tight">पिता का नाम / Father's Name</p>
                                <p className="text-gray-900 text-[6px] font-black leading-tight tracking-wide">SURESH KUMAR</p>
                            </div>
                            <div className="flex gap-3">
                                <div>
                                    <p className="text-blue-900/60 text-[3.5px] leading-tight">जन्म तिथि / Date of Birth</p>
                                    <p className="text-gray-900 text-[5px] font-black leading-tight tracking-wide">15/08/1990</p>
                                </div>
                                <div>
                                    <p className="text-blue-900/60 text-[3.5px] leading-tight">लिंग / Gender</p>
                                    <p className="text-gray-900 text-[5px] font-black leading-tight tracking-wide">MALE</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Right Side: Photo and PAN */}
                        <div className="w-14 shrink-0 flex flex-col items-end justify-between">
                            <div className="text-right w-full mb-1">
                                <p className="text-blue-900/80 text-[3.5px] font-bold leading-tight">Permanent Account Number</p>
                                <p className="text-gray-900 text-[8px] font-black tracking-widest bg-white/50 px-0.5 rounded inline-block border border-blue-900/10">ABCD1234F</p>
                            </div>
                            
                            <div className="flex items-end gap-1 w-full justify-end">
                                <div className="w-5 h-5 bg-white border border-gray-300 rounded-sm p-0.5">
                                    <div className="w-full h-full bg-gray-200 border border-gray-300/50 rounded-sm flex items-center justify-center">
                                        <div className="w-full flex flex-col items-center gap-[1px]">
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                                            <div className="w-3 h-1.5 bg-gray-400 rounded-t-lg"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Watermark/Background texture */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                        <i className="fa-solid fa-id-card text-6xl transform -rotate-12"></i>
                    </div>
                </div>
`;

// Insert after the grid of 2 buttons
const targetStr = '</div>\n            </div>\n\n            {/* Modal Form */}';
if (content.includes(targetStr)) {
    content = content.replace(targetStr, `</div>\n${dummyPanCSS}            </div>\n\n            {/* Modal Form */}`);
    fs.writeFileSync('src/components/PanCardServices.tsx', content);
    console.log('Successfully added dummy pan card visual');
} else {
    console.log('Could not find target to insert dummy PAN');
}
