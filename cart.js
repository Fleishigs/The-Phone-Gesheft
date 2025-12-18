// Shopping cart functionality

function getCart() {
    return JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = count;
    });
}

function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    displayCart();
}

function updateQuantity(productId, change) {
    const cart = getCart();
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart(cart);
            displayCart();
        }
    }
}

function displayCart() {
    const cart = getCart();
    const container = document.getElementById('cart-container');
    
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 80px; height: 80px; color: #9CA3AF; margin: 0 auto 1rem;">
                    <circle cx="9" cy="21" r="1"/>
                    <circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                <h2>Your cart is empty</h2>
                <p>Add some products to get started!</p>
                <a href="/products" class="btn btn-primary btn-large">Shop Products</a>
            </div>
        `;
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    container.innerHTML = `
        <div class="cart-grid">
            <div class="cart-items">
                ${cart.map(item => `
                    <div class="cart-item">
                        <div class="cart-item-image">
                            ${item.image ? 
                                `<img src="${item.image}" alt="${item.name}">` :
                                `<div class="product-image-placeholder">No Image</div>`
                            }
                        </div>
                        <div class="cart-item-details">
                            <h3>${item.name}</h3>
                            <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                        </div>
                        <div class="cart-item-quantity">
                            <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">−</button>
                            <span>${item.quantity}</span>
                            <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                        </div>
                        <div class="cart-item-total">
                            $${(item.price * item.quantity).toFixed(2)}
                        </div>
                        <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                `).join('')}
            </div>
            
            <div class="cart-summary">
                <h2>Order Summary</h2>
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>$${total.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                </div>
                <div class="summary-total">
                    <span>Total</span>
                    <span>$${total.toFixed(2)}</span>
                </div>
                <button class="btn btn-primary btn-large btn-full" onclick="checkoutCart()">
                    Proceed to Checkout
                </button>
                <a href="/products" class="btn btn-secondary btn-full" style="margin-top: 1rem;">
                    Continue Shopping
                </a>
            </div>
        </div>
    `;
}

async function checkoutCart() {
    const cart = getCart();
    
    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }
    
    try {
        const response = await fetch('/.netlify/functions/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart })
        });
        
        const data = await response.json();
        
        if (data.error) throw new Error(data.error);
        
        await stripe.redirectToCheckout({ sessionId: data.sessionId });
        
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Error processing checkout. Please try again.');
    }
}

// Initialize
if (document.getElementById('cart-container')) {
    displayCart();
}

updateCartCount();
