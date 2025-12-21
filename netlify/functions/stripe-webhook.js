const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const Resend = require('resend').Resend;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
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

  console.log('Received webhook event type:', stripeEvent.type);

  // Handle checkout.session.completed
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    try {
      // Retrieve the full session with expanded data to get shipping details
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items', 'line_items.data.price.product']
      });

      const lineItem = fullSession.line_items.data[0];
      const product = lineItem.price.product;

      // Extract shipping address from the session
      const shippingDetails = fullSession.shipping_details || {};
      const shippingAddress = shippingDetails.address || {};
      
      console.log('Creating order with status: pending_shipment');
      
      // Save order to database - STATUS IS PENDING_SHIPMENT
      const orderData = {
        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent,
        customer_email: session.customer_details.email,
        customer_name: session.customer_details.name,
        customer_phone: session.customer_details.phone,
        shipping_name: shippingDetails.name,
        shipping_address: shippingAddress,
        product_name: product.name,
        product_price: lineItem.price.unit_amount / 100,
        quantity: lineItem.quantity,
        total_price: session.amount_total / 100,
        status: 'pending_shipment', // CRITICAL: This MUST be pending_shipment
        created_at: new Date().toISOString()
      };

      console.log('Order data to insert:', JSON.stringify(orderData, null, 2));

      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select();

      if (error) {
        console.error('Database error:', error);
        return { statusCode: 500, body: 'Database error' };
      }

      console.log('Order created successfully with ID:', data[0].id, 'Status:', data[0].status);

      // Send order confirmation email to customer
      await sendOrderConfirmationEmail({
        email: session.customer_details.email,
        name: session.customer_details.name,
        orderNumber: data[0].id,
        productName: product.name,
        quantity: lineItem.quantity,
        total: session.amount_total / 100,
        shippingAddress: {
          name: shippingDetails.name,
          line1: shippingAddress.line1,
          line2: shippingAddress.line2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postal_code: shippingAddress.postal_code,
          country: shippingAddress.country
        }
      });

      // Send admin notification email
      await sendAdminNotificationEmail({
        orderNumber: data[0].id,
        customerName: session.customer_details.name,
        customerEmail: session.customer_details.email,
        customerPhone: session.customer_details.phone,
        productName: product.name,
        quantity: lineItem.quantity,
        total: session.amount_total / 100,
        shippingAddress: {
          name: shippingDetails.name,
          line1: shippingAddress.line1,
          line2: shippingAddress.line2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postal_code: shippingAddress.postal_code,
          country: shippingAddress.country
        }
      });

      console.log('Order processing complete');
      return { statusCode: 200, body: JSON.stringify({ success: true, order_id: data[0].id, status: data[0].status }) };
    } catch (err) {
      console.error('Error processing checkout:', err);
      return { statusCode: 500, body: 'Error processing checkout' };
    }
  }

  // Handle charge.refunded - auto-update order status when refunded
  if (stripeEvent.type === 'charge.refunded') {
    const charge = stripeEvent.data.object;
    const paymentIntent = charge.payment_intent;

    console.log('Processing refund for payment intent:', paymentIntent);

    try {
      const { data: updatedOrders, error } = await supabase
        .from('orders')
        .update({
          status: 'refunded',
          refunded_at: new Date().toISOString()
        })
        .eq('stripe_payment_intent', paymentIntent)
        .select();

      if (error) {
        console.error('Database error updating refund:', error);
        return { statusCode: 500, body: 'Database error' };
      }

      console.log('Orders updated to refunded:', updatedOrders);
      return { statusCode: 200, body: JSON.stringify({ success: true, refunded_orders: updatedOrders }) };
    } catch (err) {
      console.error('Error processing refund:', err);
      return { statusCode: 500, body: 'Error processing refund' };
    }
  }

  return { statusCode: 200, body: 'Event received' };
};

async function sendOrderConfirmationEmail(orderData) {
  try {
    await resend.emails.send({
      from: 'orders@thephonegesheft.com',
      to: orderData.email,
      subject: `Order Confirmation #${orderData.orderNumber} - The Phone Gesheft`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📱 Order Confirmed!</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Thank you for your purchase</p>
          </div>
          
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${orderData.name},</p>
            
            <p style="font-size: 16px; margin-bottom: 25px;">We've received your order and will send you another email once your item has been shipped with tracking information.</p>
            
            <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
              <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Order Details</h2>
              
              <table style="width: 100%; margin-bottom: 15px;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Order Number:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #3b82f6;">#${orderData.orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Product:</td>
                  <td style="padding: 8px 0; text-align: right;">${orderData.productName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Quantity:</td>
                  <td style="padding: 8px 0; text-align: right;">${orderData.quantity}</td>
                </tr>
                <tr style="border-top: 2px solid #e5e7eb;">
                  <td style="padding: 12px 0; color: #1f2937; font-weight: 700; font-size: 16px;">Total:</td>
                  <td style="padding: 12px 0; text-align: right; color: #3b82f6; font-weight: 700; font-size: 18px;">$${orderData.total.toFixed(2)}</td>
                </tr>
              </table>
            </div>
            
            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
              <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px;">📦 Shipping Address</h3>
              <p style="margin: 0; line-height: 1.8;">
                <strong>${orderData.shippingAddress.name}</strong><br>
                ${orderData.shippingAddress.line1}<br>
                ${orderData.shippingAddress.line2 ? orderData.shippingAddress.line2 + '<br>' : ''}
                ${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} ${orderData.shippingAddress.postal_code}<br>
                ${orderData.shippingAddress.country}
              </p>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              Questions about your order? Reply to this email and we'll be happy to help!
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 5px 0;">The Phone Gesheft</p>
            <p style="margin: 5px 0;">Browser-Free Phones for a Focused Life</p>
          </div>
        </body>
        </html>
      `
    });
    console.log('Customer confirmation email sent');
  } catch (error) {
    console.error('Failed to send customer email:', error);
  }
}

async function sendAdminNotificationEmail(orderData) {
  try {
    await resend.emails.send({
      from: 'orders@thephonegesheft.com',
      to: process.env.ADMIN_EMAIL,
      subject: `🚨 New Order #${orderData.orderNumber} - Action Required`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Order</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #10b981; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 New Order!</h1>
            <p style="color: #f0fdf9; margin: 10px 0 0 0; font-size: 16px;">Order #${orderData.orderNumber}</p>
          </div>
          
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
              <p style="margin: 0; color: #92400e; font-weight: 600;">⚠️ Order Awaiting Shipment - Please process and ship soon!</p>
            </div>
            
            <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">Order Summary</h2>
            <table style="width: 100%; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Customer:</td>
                <td style="padding: 8px 0; text-align: right;">${orderData.customerName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Email:</td>
                <td style="padding: 8px 0; text-align: right;">${orderData.customerEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Phone:</td>
                <td style="padding: 8px 0; text-align: right;">${orderData.customerPhone || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Product:</td>
                <td style="padding: 8px 0; text-align: right;">${orderData.productName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Quantity:</td>
                <td style="padding: 8px 0; text-align: right;">${orderData.quantity}</td>
              </tr>
              <tr style="border-top: 2px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #1f2937; font-weight: 700; font-size: 16px;">Total:</td>
                <td style="padding: 12px 0; text-align: right; color: #10b981; font-weight: 700; font-size: 18px;">$${orderData.total.toFixed(2)}</td>
              </tr>
            </table>
            
            <div style="background: #dbeafe; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin-top: 25px;">
              <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px;">📦 SHIPPING ADDRESS</h3>
              <div style="background: white; padding: 15px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.8;">
                <strong style="font-size: 15px;">${orderData.shippingAddress.name}</strong><br>
                ${orderData.shippingAddress.line1}<br>
                ${orderData.shippingAddress.line2 ? orderData.shippingAddress.line2 + '<br>' : ''}
                ${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} ${orderData.shippingAddress.postal_code}<br>
                ${orderData.shippingAddress.country}
              </div>
            </div>
            
            <div style="margin-top: 30px; text-align: center;">
              <a href="https://thephonegesheft.com/admin" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
                Go to Admin Dashboard →
              </a>
            </div>
          </div>
        </body>
        </html>
      `
    });
    console.log('Admin notification email sent');
  } catch (error) {
    console.error('Failed to send admin email:', error);
  }
}
