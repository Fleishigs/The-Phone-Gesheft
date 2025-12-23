// Products page functionality - COMPLETE STANDALONE
// Uses window.supabase and window.stripe from config.js

// ============================================
// CART UTILITIES - Integrated here
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

// Update cart count in navigation
function updateCartCount() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    const cartCountElements = document.querySelectorAll('#cart-count, .cart-count');
    cartCountElements.forEach(el => {
        el.textContent = totalItems;
        el.style.display = totalItems > 0 ? 'inline-block' : 'none';
    });
}

// Add item to cart - GLOBAL FUNCTION with price validation
window.addToCart = function(productId, productName, productPrice, productImage, productDescription) {
    let cart = getCart();
    
    // Validate price
    const price = parseFloat(productPrice);
    if (isNaN(price) || price <= 0) {
        console.error('Invalid price for product:', productName, productPrice);
        alert('Error: Invalid product price. Please refresh the page and try again.');
        return;
    }
    
    const existing = cart.find(item => item.id === productId && !item.variant);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: price, // Store as number
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
// PRODUCTS PAGE FUNCTIONS
// ============================================

// Load products from Supabase - FIXED: Filter deleted and out of stock
async function loadProducts() {
    try {
        const { data: products, error } = await window.supabase
            .from('products')
            .select('*')
            .eq('status', 'active')
            .eq('deleted', false)
            .order('id', { ascending: false });

        if (error) throw error;

        // Filter out of stock products
        const inStockProducts = (products || []).filter(p => {
            // If track_inventory is false, product has unlimited stock
            if (p.track_inventory === false) return true;
            
            // If has variants, check if any variant has stock
            if (p.variants && p.variants.length > 0) {
                return p.variants.some(v => {
                    if (v.track_inventory === false) return true;
                    return v.stock > 0;
                });
            }
            
            // Regular product - check stock
            return p.stock > 0;
        });

        displayProducts(inStockProducts);
    } catch (error) {
        console.error('Error loading products:', error);
        const grid = document.getElementById('products-grid');
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <p style="color: #EF4444; font-weight: 600;">Error loading products. Please try again later.</p>
                </div>
            `;
        }
    }
}

// Display products in grid
function displayProducts(products) {
    const grid = document.getElementById('products-grid');
    
    if (!grid) return;
    
    if (products.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <p style="color: #6B7280; font-size: 1.125rem;">No products available at the moment.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = products.map(product => {
        const mainImage = product.images?.[0] || product.image_url || '/placeholder.png';
        const hasVariants = product.variants && product.variants.length > 0;
        
        return `
            <div class="product-card">
                <img src="${mainImage}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p style="color: #6B7280; font-size: 0.9rem; margin: 0.5rem 0;">${product.description || ''}</p>
                <div class="price">$${product.price.toFixed(2)}${hasVariants ? '+' : ''}</div>
                <button class="add-to-cart-btn" onclick="addToCart(${product.id}, '${escapeQuotes(product.name)}', ${product.price}, '${mainImage}', '${escapeQuotes(product.description || '')}')">
                    Add to Cart
                </button>
            </div>
        `;
    }).join('');
}

// Escape quotes for onclick attributes
function escapeQuotes(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Update cart count immediately
    updateCartCount();
    
    // Wait for config.js to initialize Supabase
    const initInterval = setInterval(() => {
        if (window.supabase) {
            clearInterval(initInterval);
            loadProducts();
        }
    }, 50);
    
    // Timeout after 5 seconds
    setTimeout(() => {
        clearInterval(initInterval);
        if (!window.supabase) {
            console.error('Supabase failed to initialize');
            const grid = document.getElementById('products-grid');
            if (grid) {
                grid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                        <p style="color: #EF4444; font-weight: 600;">Failed to connect to database. Please refresh the page.</p>
                    </div>
                `;
            }
        }
    }, 5000);
});
