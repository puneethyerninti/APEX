"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const travelBookingSchema = new mongoose_1.default.Schema({
    user: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    driverName: {
        type: String,
        default: 'Unassigned'
    },
    type: {
        type: String,
        enum: ['Cab', 'Bus', 'Train', 'Flight'],
        required: true
    },
    vehicleType: {
        type: String
    },
    origin: {
        type: String,
        required: true
    },
    destination: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['searching', 'en_route', 'completed', 'cancelled'],
        default: 'searching'
    }
}, {
    timestamps: true
});
exports.default = mongoose_1.default.model('TravelBooking', travelBookingSchema);
