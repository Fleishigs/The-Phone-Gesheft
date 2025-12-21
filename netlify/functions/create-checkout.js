const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const { cart } = body;
    
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      throw new Error('Invalid cart data');
    }
    
    const lineItems = cart.map(item => {
      const productData = { name: item.name };
      
      if (item.image && item.image.trim() !== '') {
        productData.images = [item.image];
      }
      
      return {
        price_data: {
          currency: 'usd',
          product_data: productData,
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${event.headers.origin || 'https://kosherlynk.netlify.app'}/success`,
      cancel_url: `${event.headers.origin || 'https://kosherlynk.netlify.app'}/cart`,
      
      // 🔥 FORCE CUSTOMER TO PROVIDE INFO
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU'], // Add more countries as needed
      },
      phone_number_collection: {
        enabled: true, // 🔥 COLLECT PHONE NUMBER
      },
      
      // Optional: Collect customer email (usually auto-filled if logged in)
      customer_email: cart[0]?.customerEmail || undefined,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId: session.id }),
    };
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
