import React from 'react';
import Link from 'next/link';

export function generateStaticParams() {
    return [
        { category: 'womens' },
        { category: 'cosmetics' },
        { category: 'electronics' },
        { category: 'watches' },
        { category: 'computers' },
        { category: 'gifts' },
        { category: 'courses' },
    ];
}

export default function CategoryPage({ params }: { params: { category: string } }) {
    const category = params.category;
    
    // Capitalize and format category name
    const formattedCategory = category 
        ? category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ') 
        : 'Category';

    return (
        <div className="min-h-screen bg-apex-graybg flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
                <Link href="/" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                    <i className="fa-solid fa-arrow-left"></i>
                </Link>
                <h1 className="font-black text-lg text-gray-900">{formattedCategory}</h1>
            </header>

            <main className="flex-1 p-4 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-4xl mb-4 shadow-sm">
                    <i className="fa-solid fa-store"></i>
                </div>
                <h2 className="text-xl font-black text-gray-900 mb-2">Welcome to {formattedCategory}</h2>
                <p className="text-xs text-gray-500 mb-6 max-w-[250px] leading-relaxed">
                    Explore the best {formattedCategory.toLowerCase()} products on the APEX Trading Company Store. Everything you need, delivered to you.
                </p>
                
                <a 
                    href="https://www.apextradingcompanystore.co.in/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="bg-apex-purple hover:bg-opacity-90 text-white font-bold py-3 px-8 rounded-full inline-flex items-center gap-2 transition-all shadow-md active:scale-95 text-sm"
                >
                    Browse {formattedCategory} Now <i className="fa-solid fa-arrow-right"></i>
                </a>
            </main>
        </div>
    );
}
