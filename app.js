// Products page functionality
// Uses window.supabase and window.stripe from config.js

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
        document.getElementById('products-grid').innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <p style="color: #EF4444; font-weight: 600;">Error loading products. Please try again later.</p>
            </div>
        `;
    }
}

// Display products in grid
function displayProducts(products) {
    const grid = document.getElementById('products-grid');
    
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
    if (typeof updateCartCount === 'function') {
        updateCartCount();
    }
    
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
