// lib/razorpay.js
import Razorpay from 'razorpay';

let razorpayInstance = null;

function getRazorpay() {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error(
        'Razorpay is not configured — missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET'
      );
    }
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

export default getRazorpay;
