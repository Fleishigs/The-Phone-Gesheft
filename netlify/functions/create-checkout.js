const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    console.log('Received body:', JSON.stringify(body, null, 2));
    
    // The cart comes in as { cart: [ lineItems ] }
    const { cart } = body;
    
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      console.error('Invalid cart data:', cart);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No items provided or invalid cart data' })
      };
    }

    console.log('Cart items:', JSON.stringify(cart, null, 2));

    // Create Stripe checkout session
    // The cart already has the correct format from cart.js
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: cart,
      mode: 'payment',
      success_url: `${process.env.URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL}/cart`,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'], // Add more countries as needed
      },
      billing_address_collection: 'required',
    });

    console.log('Session created:', session.id);

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId: session.id })
    };

  } catch (error) {
    console.error('Checkout error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
