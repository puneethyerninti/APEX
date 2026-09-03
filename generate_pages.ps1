$template = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{PAGE_NAME} | APEX</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: { colors: { apex: { purple: '#6C3FC5', purplelight: '#EDE9FF', green: '#16a34a' } }, fontFamily: { sans: ['Inter', 'sans-serif'] } }
            }
        }
    </script>
</head>
<body class="font-sans antialiased bg-slate-900 flex justify-center">
<div class="w-full max-w-md bg-[#F4F6FB] min-h-screen relative shadow-2xl overflow-x-hidden border-x border-slate-800">
    <div class="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <a href="index.html" class="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
            <i class="fa-solid fa-arrow-left"></i>
        </a>
        <h1 class="font-black text-lg text-gray-900">{PAGE_NAME}</h1>
    </div>
    <div class="p-4 flex flex-col items-center justify-center mt-20 text-center">
        <div class="w-20 h-20 rounded-full bg-apex-purplelight text-apex-purple flex items-center justify-center text-3xl mb-4">
            <i class="{ICON}"></i>
        </div>
        <h2 class="text-xl font-bold text-gray-800 mb-2">{PAGE_NAME} Services</h2>
        <p class="text-gray-500 text-sm">Welcome to the APEX {PAGE_NAME} portal. Exciting features are coming soon!</p>
    </div>
</div>
</body>
</html>
"@

$pages = @(
    @('Finance', 'finance.html', 'fa-solid fa-chart-line'),
    @('Realty', 'realty.html', 'fa-solid fa-house-chimney'),
    @('Academy', 'academy.html', 'fa-solid fa-user-graduate'),
    @('Store', 'store.html', 'fa-solid fa-store'),
    @('Jobs', 'jobs.html', 'fa-solid fa-briefcase'),
    @('Matrimony', 'matrimony.html', 'fa-solid fa-ring'),
    @('Utility', 'utility.html', 'fa-solid fa-bolt'),
    @('Charity', 'charity.html', 'fa-solid fa-seedling')
)

foreach ($p in $pages) {
    $content = $template -replace '\{PAGE_NAME\}', $p[0] -replace '\{ICON\}', $p[2]
    Set-Content -Path $p[1] -Value $content
}
