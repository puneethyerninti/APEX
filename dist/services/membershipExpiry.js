"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extendMembership = extendMembership;
function extendMembership(start, months) {
    const expiry = new Date(start);
    const day = expiry.getUTCDate();
    expiry.setUTCDate(1);
    expiry.setUTCMonth(expiry.getUTCMonth() + months);
    const lastDay = new Date(Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth() + 1, 0)).getUTCDate();
    expiry.setUTCDate(Math.min(day, lastDay));
    return expiry;
}
