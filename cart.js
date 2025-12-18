// Shopping cart with VARIANTS support
let cart = [];

function loadCart() {
    cart = JSON.parse(localStorage.getItem('cart') || '[]');
    displayCart();
    updateCartCount();
}

function displayCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');

    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <p style="color: #6B7280; font-size: 1.125rem; margin-bottom: 1rem;">Your cart is empty</p>
                <a href="products.html" class="btn btn-primary">Continue Shopping</a>
            </div>
        `;
        totalEl.textContent = '$0.00';
        document.getElementById('checkout-btn').disabled = true;
        return;
    }

    container.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-details">
                <h3>${item.name}</h3>
                ${item.variant ? `<p style="color: #6B7280; font-size: 0.875rem; margin-top: 0.25rem;">Variant: ${item.variant}</p>` : ''}
                <div class="cart-item-price">$${item.price.toFixed(2)}</div>
            </div>
            <div class="cart-item-quantity">
                <button onclick="updateQuantity(${index}, -1)" class="quantity-btn">-</button>
                <span>${item.quantity}</span>
                <button onclick="updateQuantity(${index}, 1)" class="quantity-btn">+</button>
            </div>
            <div class="cart-item-subtotal">
                $${(item.price * item.quantity).toFixed(2)}
            </div>
            <button onclick="removeFromCart(${index})" class="remove-btn">×</button>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalEl.textContent = `$${total.toFixed(2)}`;
    document.getElementById('checkout-btn').disabled = false;
}

function updateQuantity(index, change) {
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    saveCart();
    displayCart();
    updateCartCount();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    displayCart();
    updateCartCount();
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.querySelector('.cart-count');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

async function proceedToCheckout() {
    if (cart.length === 0) return;

    try {
        // Prepare line items for Stripe
        const lineItems = cart.map(item => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.name + (item.variant ? ` (${item.variant})` : ''),
                    images: [item.image]
                },
                unit_amount: Math.round(item.price * 100)
            },
            quantity: item.quantity
        }));

        const response = await fetch('/.netlify/functions/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lineItems })
        });

        const { sessionId, error } = await response.json();

        if (error) {
            alert('Error: ' + error);
            return;
        }

        // Redirect to Stripe Checkout
        const result = await stripe.redirectToCheckout({ sessionId });

        if (result.error) {
            alert(result.error.message);
        }
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Error processing checkout. Please try again.');
    }
}

document.getElementById('checkout-btn')?.addEventListener('click', proceedToCheckout);

// Initialize
loadCart();
