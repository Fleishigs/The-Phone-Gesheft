// Cart Management System
// Uses window.supabase and window.stripe from config.js

// Get cart from localStorage
function getCart() {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
}

// Save cart to localStorage
function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

// Update cart count in navigation
function updateCartCount() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) {
        cartCountEl.textContent = totalItems;
        cartCountEl.style.display = totalItems > 0 ? 'block' : 'none';
    }
}

// Format price for display
function formatPrice(price) {
    return `$${price.toFixed(2)}`;
}

// Calculate cart totals
function calculateTotals(cart) {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 0; // Calculated at checkout
    const total = subtotal + shipping;
    
    return { subtotal, shipping, total };
}

// Remove item from cart
function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    displayCart();
}

// Update item quantity
function updateQuantity(productId, newQuantity) {
    let cart = getCart();
    const item = cart.find(item => item.id === productId);
    
    if (item) {
        if (newQuantity <= 0) {
            removeFromCart(productId);
        } else {
            item.quantity = newQuantity;
            saveCart(cart);
            displayCart();
        }
    }
}

// Display cart items
function displayCart() {
    const cart = getCart();
    const container = document.getElementById('cart-container');
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <h2>Your cart is empty</h2>
                <p>Add some products to get started!</p>
                <button class="checkout-btn" onclick="window.location.href='/products'">
                    Continue Shopping
                </button>
            </div>
        `;
        return;
    }
    
    const { subtotal, shipping, total } = calculateTotals(cart);
    
    container.innerHTML = `
        <div class="cart-container">
            <div class="cart-items">
                ${cart.map(item => `
                    <div class="cart-item">
                        <img src="${item.image || '/placeholder.png'}" alt="${item.name}">
                        <div class="item-details">
                            <div class="item-name">${item.name}</div>
                            <div class="item-price">${formatPrice(item.price)}</div>
                            <div class="quantity-controls">
                                <button class="qty-btn" onclick="updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
                                <input type="number" value="${item.quantity}" min="1" 
                                    onchange="updateQuantity(${item.id}, parseInt(this.value))"
                                    style="width: 60px; text-align: center; border: 1px solid #D1D5DB; border-radius: 6px; padding: 4px;">
                                <button class="qty-btn" onclick="updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between;">
                            <div class="item-price">${formatPrice(item.price * item.quantity)}</div>
                            <button class="remove-btn" onclick="removeFromCart(${item.id})">✕ Remove</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="cart-summary">
                <h2 style="font-size: 1.5rem; margin-bottom: 1.5rem;">Order Summary</h2>
                
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>${formatPrice(subtotal)}</span>
                </div>
                
                <div class="summary-row">
                    <span>Shipping</span>
                    <span>${shipping === 0 ? 'Calculated at checkout' : formatPrice(shipping)}</span>
                </div>
                
                <div class="summary-row summary-total">
                    <span>Total</span>
                    <span>${formatPrice(total)}</span>
                </div>
                
                <button class="checkout-btn" onclick="checkoutCart()">
                    Proceed to Checkout
                </button>
                
                <button class="continue-shopping-btn" onclick="window.location.href='/products'">
                    Continue Shopping
                </button>
            </div>
        </div>
    `;
}

// Checkout function
async function checkoutCart() {
    const cart = getCart();
    
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    
    try {
        // Call your Netlify function to create a Stripe checkout session
        const response = await fetch('/.netlify/functions/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                items: cart.map(item => ({
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: item.name,
                            description: item.description || '',
                            images: item.image ? [item.image] : [],
                        },
                        unit_amount: Math.round(item.price * 100), // Convert to cents
                    },
                    quantity: item.quantity,
                })),
            }),
        });
        
        if (!response.ok) {
            throw new Error('Failed to create checkout session');
        }
        
        const { sessionId } = await response.json();
        
        // Redirect to Stripe Checkout
        const { error } = await window.stripe.redirectToCheckout({ sessionId });
        
        if (error) {
            console.error('Checkout error:', error);
            alert('Error processing checkout. Please try again.');
        }
        
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Error processing checkout. Please try again.');
    }
}

// Initialize cart on page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait for config.js to initialize
    const initInterval = setInterval(() => {
        if (window.supabase && window.stripe) {
            clearInterval(initInterval);
            displayCart();
            updateCartCount();
        }
    }, 50);
    
    // Timeout after 5 seconds
    setTimeout(() => {
        clearInterval(initInterval);
        if (!window.supabase || !window.stripe) {
            console.error('Configuration failed to load');
            alert('Failed to load page configuration. Please refresh.');
        }
    }, 5000);
});
