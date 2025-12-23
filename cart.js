// Cart Management System - COMPLETE STANDALONE
// Uses window.supabase and window.stripe from config.js

// ============================================
// CART UTILITIES - Used across all pages
// ============================================

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

// Update cart count in navigation - WORKS ON ALL PAGES
function updateCartCount() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Update all cart count elements on the page
    const cartCountElements = document.querySelectorAll('#cart-count, .cart-count');
    cartCountElements.forEach(el => {
        el.textContent = totalItems;
        el.style.display = totalItems > 0 ? 'inline-block' : 'none';
    });
}

// Add item to cart - GLOBAL FUNCTION
window.addToCart = function(productId, productName, productPrice, productImage, productDescription) {
    let cart = getCart();
    
    const existing = cart.find(item => item.id === productId && !item.variant);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: productPrice,
            image: productImage,
            description: productDescription || '',
            quantity: 1
        });
    }
    
    saveCart(cart);
    
    // Show notification
    const notification = document.createElement('div');
    notification.style.cssText = 'position: fixed; top: 100px; right: 20px; background: #10B981; color: white; padding: 1rem 2rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; animation: slideIn 0.3s ease;';
    notification.textContent = `${productName} added to cart!`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
};

// Add animation styles
if (!document.getElementById('cart-animations')) {
    const style = document.createElement('style');
    style.id = 'cart-animations';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// CART PAGE SPECIFIC FUNCTIONS
// ============================================

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

// Checkout function - FIXED
async function checkoutCart() {
    const cart = getCart();
    
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    
    try {
        // Create line items for Stripe
        const lineItems = cart.map(item => ({
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
        }));
        
        // Call Netlify function to create checkout session
        const response = await fetch('/.netlify/functions/create-checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cart: lineItems }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create checkout session');
        }
        
        const { sessionId } = await response.json();
        
        // Redirect to Stripe Checkout
        const { error } = await window.stripe.redirectToCheckout({ sessionId });
        
        if (error) {
            console.error('Checkout error:', error);
            alert('Error processing checkout: ' + error.message);
        }
        
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Error processing checkout: ' + error.message + '. Please try again.');
    }
}

// Initialize cart on page load
document.addEventListener('DOMContentLoaded', () => {
    // Update cart count immediately
    updateCartCount();
    
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
