let checkoutPromise: Promise<any> | null = null;

export function loadRazorpay(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Checkout requires a browser.'));
  if ((window as any).Razorpay) return Promise.resolve((window as any).Razorpay);
  if (checkoutPromise) return checkoutPromise;
  checkoutPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    const fail = () => {
      window.clearTimeout(timer);
      script.remove();
      checkoutPromise = null;
      reject(new Error('Payment checkout could not load. Check your connection and try again.'));
    };
    const timer = window.setTimeout(fail, 20000);
    script.onload = () => {
      window.clearTimeout(timer);
      if (!(window as any).Razorpay) return fail();
      resolve((window as any).Razorpay);
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return checkoutPromise;
}
