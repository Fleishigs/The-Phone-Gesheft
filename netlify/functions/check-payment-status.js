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

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent);
    
    // Check if it has been refunded
    const isRefunded = paymentIntent.charges.data.some(charge => charge.refunded);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: isRefunded ? 'refunded' : paymentIntent.status,
        amount: paymentIntent.amount / 100,
        refunded: isRefunded
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
