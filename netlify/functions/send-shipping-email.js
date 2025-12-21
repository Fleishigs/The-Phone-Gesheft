const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { order } = JSON.parse(event.body);
    
    const address = order.shipping_address || {};
    
    await resend.emails.send({
      from: 'The Phone Gesheft <orders@thephonegesheft.com>',
      to: order.customer_email,
      subject: `Your order has shipped! 📦 - Order #${order.id}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; background: #fff; }
    .tracking { background: #EFF6FF; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .tracking-number { font-size: 1.5rem; font-weight: bold; color: #3B82F6; margin: 10px 0; font-family: monospace; letter-spacing: 2px; }
    .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📦 Your Order Has Shipped!</h1>
      <p>Order #${order.id}</p>
    </div>
    
    <div class="content">
      <p>Great news ${order.customer_name}!</p>
      <p>Your order has been shipped and is on its way to you.</p>
      
      <div class="tracking">
        <p style="font-size: 0.875rem; color: #6B7280; margin: 0 0 0.5rem 0;">TRACKING NUMBER</p>
        <div class="tracking-number">${order.tracking_number}</div>
        <p style="margin-top: 1rem;">
          <a href="${order.tracking_url}" class="button" style="color: white;">Track Your Package</a>
        </p>
        <p style="font-size: 0.875rem; color: #6B7280; margin-top: 1rem;">
          <strong>Carrier:</strong> ${order.shipping_carrier}
          ${order.estimated_delivery ? `<br><strong>Estimated Delivery:</strong> ${new Date(order.estimated_delivery).toLocaleDateString()}` : ''}
        </p>
      </div>
      
      <div style="background: #F9FAFB; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-weight: 600;">Shipping To:</p>
        <p style="margin: 0.5rem 0 0 0;">
          ${address.name || order.shipping_name}<br>
          ${address.line1}<br>
          ${address.line2 ? address.line2 + '<br>' : ''}
          ${address.city}, ${address.state} ${address.postal_code}<br>
          ${address.country}
        </p>
      </div>
      
      <p style="margin-top: 30px;">If you have any questions about your order, please don't hesitate to contact us.</p>
      
      <p style="font-size: 0.875rem; color: #6B7280;">Questions? Reply to this email or call us at (555) 123-4567.</p>
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

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Shipping email error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
