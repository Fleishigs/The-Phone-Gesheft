const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabaseUrl = 'https://xfswosnhewblxdtvtbcz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const resend = new Resend(process.env.RESEND_API_KEY);

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
      // Retrieve full session with shipping details (webhook event sometimes has incomplete data)
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items', 'customer']
      });
      
      console.log('Full session retrieved:', fullSession.id);
      
      // Get line items from the session
      const lineItems = await stripe.checkout.sessions.listLineItems(fullSession.id);
      
      // Get shipping and customer details from FULL session
      const shippingDetails = fullSession.shipping_details || fullSession.shipping || {};
      const customerDetails = fullSession.customer_details || {};
      const shippingAddress = shippingDetails.address || {};
      
      // Log for debugging
      console.log('Shipping Details:', JSON.stringify(shippingDetails));
      console.log('Customer Details:', JSON.stringify(customerDetails));
      
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
          const customerName = shippingDetails.name || customerDetails.name || 'Guest';
          const customerEmail = customerDetails.email || session.customer_email || 'unknown@email.com';
          const customerPhone = customerDetails.phone || shippingDetails.phone || null;
          
          // Build shipping address object
          const fullShippingAddress = {
            name: shippingDetails.name || customerName,
            line1: shippingAddress.line1 || '',
            line2: shippingAddress.line2 || '',
            city: shippingAddress.city || '',
            state: shippingAddress.state || '',
            postal_code: shippingAddress.postal_code || '',
            country: shippingAddress.country || '',
          };
          
          console.log('Saving shipping address:', JSON.stringify(fullShippingAddress));
          
          const orderData = {
            product_id: product.id,
            product_name: product.name,
            product_price: product.price,
            product_image: product.images && product.images.length > 0 ? product.images[0] : product.image_url,
            quantity: item.quantity,
            total_price: session.amount_total / 100,
            customer_email: customerEmail,
            customer_name: customerName,
            customer_phone: customerPhone,
            shipping_address: fullShippingAddress,
            shipping_name: shippingDetails.name || customerName,
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

          const { data: savedOrder, error: saveError } = await supabase
            .from('orders')
            .insert([orderData])
            .select()
            .single();
          
          if (saveError) {
            console.error('Error saving order:', saveError);
          } else {
            console.log(`Order saved for product ${product.id}`);
            
            // 🔥 SEND EMAIL TO CUSTOMER
            try {
              await sendOrderConfirmationEmail(savedOrder);
              console.log('Customer email sent successfully');
            } catch (emailError) {
              console.error('Failed to send customer email:', emailError);
            }
            
            // 🔥 SEND EMAIL TO ADMIN
            try {
              await sendAdminNotificationEmail(savedOrder);
              console.log('Admin email sent successfully');
            } catch (emailError) {
              console.error('Failed to send admin email:', emailError);
            }
          }
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

// 📧 SEND ORDER CONFIRMATION TO CUSTOMER
async function sendOrderConfirmationEmail(order) {
  const address = order.shipping_address || {};
  
  await resend.emails.send({
    from: 'The Phone Gesheft <orders@resend.dev>', // Will update when you verify domain
    to: order.customer_email,
    subject: `Order Confirmation #${order.id} - The Phone Gesheft`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; background: #fff; }
    .order-box { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .total { font-size: 1.5rem; font-weight: bold; color: #3B82F6; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Order Confirmed!</h1>
      <p>Order #${order.id}</p>
    </div>
    
    <div class="content">
      <p>Hi ${order.customer_name},</p>
      <p>Thank you for your order! We'll ship it out within 24-48 hours.</p>
      
      <div class="order-box">
        <h3>Order Details</h3>
        <p><strong>Product:</strong> ${order.product_name}</p>
        <p><strong>Quantity:</strong> ${order.quantity}</p>
        <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
      </div>
      
      <div class="order-box">
        <h3>Shipping To</h3>
        <p>
          ${address.name || order.shipping_name}<br>
          ${address.line1}<br>
          ${address.line2 ? address.line2 + '<br>' : ''}
          ${address.city}, ${address.state} ${address.postal_code}<br>
          ${address.country}
        </p>
      </div>
      
      <div class="total">
        Total: $${order.total_price.toFixed(2)}
      </div>
      
      <p style="margin-top: 30px;">You'll receive another email with tracking once your order ships!</p>
      
      <p>Questions? Reply to this email or call us at (555) 123-4567.</p>
    </div>
    
    <div class="footer">
      <p>The Phone Gesheft - Simple phones for a focused life</p>
      <p>© 2024 All rights reserved</p>
    </div>
  </div>
</body>
</html>
    `
  });
}

// 📧 SEND NOTIFICATION TO ADMIN
async function sendAdminNotificationEmail(order) {
  const address = order.shipping_address || {};
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  
  await resend.emails.send({
    from: 'The Phone Gesheft <orders@resend.dev>',
    to: adminEmail,
    subject: `🔔 New Order #${order.id}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1F2937; color: white; padding: 20px; }
    .section { background: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 8px; }
    .highlight { background: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>💰 New Order Received!</h2>
      <p>Order #${order.id}</p>
    </div>
    
    <div class="section">
      <h3>📦 SHIP TO:</h3>
      <p style="font-size: 1.1rem; font-weight: bold;">
        ${address.name || order.shipping_name}<br>
        ${address.line1}<br>
        ${address.line2 ? address.line2 + '<br>' : ''}
        ${address.city}, ${address.state} ${address.postal_code}<br>
        ${address.country}
      </p>
    </div>
    
    <div class="section">
      <h3>👤 Customer Info:</h3>
      <p>
        <strong>Name:</strong> ${order.customer_name}<br>
        <strong>Email:</strong> ${order.customer_email}<br>
        <strong>Phone:</strong> ${order.customer_phone || 'Not provided'}
      </p>
    </div>
    
    <div class="section">
      <h3>📱 Product:</h3>
      <p>
        <strong>${order.product_name}</strong><br>
        Quantity: ${order.quantity}<br>
        Price: $${order.product_price.toFixed(2)}<br>
        <strong style="color: #3B82F6; font-size: 1.2rem;">Total: $${order.total_price.toFixed(2)}</strong>
      </p>
    </div>
    
    <div class="highlight">
      <strong>⚡ Next Steps:</strong><br>
      1. Package the item<br>
      2. Print shipping label<br>
      3. Go to /orders-management to mark as shipped
    </div>
  </div>
</body>
</html>
    `
  });
}
