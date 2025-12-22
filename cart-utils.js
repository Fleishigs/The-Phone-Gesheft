// Shared Cart Utilities
// Used across all pages to manage cart state and display

// Get cart from localStorage
function getCart() {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
}

// Save cart to localStorage
function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    
    // Trigger storage event for other tabs/windows
    window.dispatchEvent(new Event('cartUpdated'));
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

// Add product to cart
function addToCart(id, name, price, image, description) {
    let cart = getCart();
    
    // Check if product already in cart
    const existingItem = cart.find(item => item.id === id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id,
            name,
            price,
            image,
            description,
            quantity: 1
        });
    }
    
    saveCart(cart);
    showAddedToCartFeedback();
}

// Show "Added to cart" feedback
function showAddedToCartFeedback() {
    // Remove any existing feedback
    const existing = document.getElementById('cart-feedback');
    if (existing) existing.remove();
    
    const feedback = document.createElement('div');
    feedback.id = 'cart-feedback';
    feedback.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        font-weight: 600;
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        z-index: 10000;
        animation: slideInUp 0.3s ease-out;
    `;
    feedback.textContent = '✓ Added to cart!';
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.style.animation = 'slideOutDown 0.3s ease-out';
        setTimeout(() => feedback.remove(), 300);
    }, 2000);
}

// Listen for cart updates from other tabs/windows
window.addEventListener('storage', (e) => {
    if (e.key === 'cart') {
        updateCartCount();
    }
});

// Listen for custom cart update events
window.addEventListener('cartUpdated', () => {
    updateCartCount();
});

// Update count on page load
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
});

// Add CSS animations
if (!document.getElementById('cart-animations')) {
    const style = document.createElement('style');
    style.id = 'cart-animations';
    style.textContent = `
        @keyframes slideInUp {
            from {
                transform: translateY(100px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutDown {
            from {
                transform: translateY(0);
                opacity: 1;
            }
            to {
                transform: translateY(100px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}
