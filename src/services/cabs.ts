import { api } from './api';
import { loadRazorpay } from './razorpay';
export interface CabLocation { address: string; lat: number; lng: number; }
export interface CabRide {
  _id: string; pickup: CabLocation; dropoff: CabLocation; fare: number; distance: number; duration: number;
  status: 'searching' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  vehicleType: 'mini' | 'xl'; paymentMethod: 'cash' | 'online'; paymentStatus: 'unpaid' | 'paid';
  expiresAt?: string; path?: any;
  driverId?: { _id: string; name: string; phone?: string; vehicleDetails?: { plate: string; make: string; model: string }; currentLocation?: { lat: number; lng: number } };
}
export interface CabQuote { _id: string; fares: { mini: number; xl: number }; distance: number; duration: number; path: any; expiresAt: string; }
export const cabError = (error: any) => error.response?.data?.error || error.message || 'Unable to contact cab service.';
export async function payForCab(ride: CabRide): Promise<void> {
  const Checkout = await loadRazorpay();
  const { data } = await api.post('/travels/rides/' + ride._id + '/payment/order');
  await new Promise<void>((resolve, reject) => {
    const checkout = new Checkout({
      key: data.keyId, order_id: data.orderId, amount: data.amount, currency: data.currency, name: 'APEX Cabs',
      description: ride.pickup.address + ' to ' + ride.dropoff.address,
      handler: async (payment: any) => {
        try { await api.post('/finance/razorpay/verify', payment); resolve(); }
        catch (error) { reject(new Error(cabError(error) + ' Check trip history before paying again.')); }
      },
      modal: { ondismiss: () => reject(new Error('Checkout closed. Your trip remains unpaid until payment is confirmed.')) }
    });
    checkout.on('payment.failed', () => reject(new Error('Payment failed. Check trip history before retrying.')));
    checkout.open();
  });
}
