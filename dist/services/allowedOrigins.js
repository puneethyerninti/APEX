"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowedOrigins = allowedOrigins;
function allowedOrigins() {
    const configured = (process.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(value => /^https?:\/\//.test(value) && !value.includes('*'));
    const development = process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000'];
    return ['https://apextc.shop', 'https://www.apextc.shop', 'https://rivan-123.web.app',
        'http://localhost', 'https://localhost', 'capacitor://localhost', ...development, ...configured];
}
