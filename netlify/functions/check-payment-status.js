const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { payment_intent } = JSON.parse(event.body);
    
    if (!payment_intent) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Payment intent ID required' })
      };
    }

    // Retrieve payment intent from Stripe with charges expanded
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent, {
      expand: ['charges.data']
    });
    
    // Check if any charge has been refunded
    let isRefunded = false;
    let refundAmount = 0;
    
    if (paymentIntent.charges && paymentIntent.charges.data.length > 0) {
      for (const charge of paymentIntent.charges.data) {
        if (charge.refunded || (charge.amount_refunded && charge.amount_refunded > 0)) {
          isRefunded = true;
          refundAmount = charge.amount_refunded / 100; // Convert from cents
          break;
        }
      }
    }
    
    // Also check payment intent level
    if (paymentIntent.status === 'canceled' || 
        (paymentIntent.amount_refunded && paymentIntent.amount_refunded > 0)) {
      isRefunded = true;
      refundAmount = (paymentIntent.amount_refunded || 0) / 100;
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: isRefunded ? 'refunded' : paymentIntent.status,
        amount: paymentIntent.amount / 100,
        refunded: isRefunded,
        refund_amount: refundAmount,
        payment_intent_status: paymentIntent.status
      })
    };
  } catch (error) {
    console.error('Payment status check error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
