const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xfswosnhewblxdtvtbcz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    
    try {
      // Get line items from the session
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      
      // Get shipping and customer details
      const shippingDetails = session.shipping_details || session.shipping || {};
      const customerDetails = session.customer_details || {};
      const shippingAddress = shippingDetails.address || {};
      
      // Process each line item
      for (const item of lineItems.data) {
        const productName = item.description;
        
        // Try to find matching product by name
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq('name', productName)
          .limit(1);
        
        if (products && products.length > 0) {
          const product = products[0];
          
          // Decrease stock if tracking inventory
          if (product.track_inventory !== false && product.stock > 0) {
            const newStock = Math.max(0, product.stock - item.quantity);
            await supabase
              .from('products')
              .update({ stock: newStock })
              .eq('id', product.id);
            
            console.log(`Product ${product.id}: Stock decreased to ${newStock}`);
          }
          
          // Save order to database
          const orderData = {
            product_id: product.id,
            product_name: product.name,
            product_price: product.price,
            product_image: product.images && product.images.length > 0 ? product.images[0] : product.image_url,
            quantity: item.quantity,
            total_price: session.amount_total / 100,
            customer_email: customerDetails.email || session.customer_email || 'unknown@email.com',
            customer_name: customerDetails.name || shippingDetails.name || 'Guest',
            customer_phone: customerDetails.phone || session.customer_details?.phone || null,
            shipping_address: {
              name: shippingDetails.name || customerDetails.name || 'N/A',
              line1: shippingAddress.line1 || '',
              line2: shippingAddress.line2 || '',
              city: shippingAddress.city || '',
              state: shippingAddress.state || '',
              postal_code: shippingAddress.postal_code || '',
              country: shippingAddress.country || '',
            },
            shipping_name: shippingDetails.name || customerDetails.name || 'N/A',
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent,
            stripe_customer_id: session.customer,
            status: 'completed',
            metadata: {
              checkout_session_url: session.url,
              payment_status: session.payment_status,
              amount_subtotal: session.amount_subtotal / 100,
              amount_total: session.amount_total / 100,
              currency: session.currency,
            }
          };

          await supabase.from('orders').insert([orderData]);
          console.log(`Order saved for product ${product.id}`);
        }
      }
      
    } catch (error) {
      console.error('Error processing order:', error);
      return { statusCode: 500, body: 'Error processing order' };
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};
