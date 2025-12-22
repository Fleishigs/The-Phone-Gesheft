// Products page functionality
// Uses window.supabase and window.stripe from config.js
// Uses cart-utils.js for cart management

// Load products from Supabase
async function loadProducts() {
    try {
        const { data: products, error } = await window.supabase
            .from('products')
            .select('*')
            .eq('active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        displayProducts(products || []);
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

    grid.innerHTML = products.map(product => `
        <div class="product-card">
            <img src="${product.image_url || '/placeholder.png'}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p style="color: #6B7280; font-size: 0.9rem; margin: 0.5rem 0;">${product.description || ''}</p>
            <div class="price">$${product.price.toFixed(2)}</div>
            ${product.stock > 0 ? `
                <button class="add-to-cart-btn" onclick="addToCart(${product.id}, '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.image_url || '/placeholder.png'}', '${(product.description || '').replace(/'/g, "\\'")}')">
                    Add to Cart
                </button>
            ` : `
                <button class="add-to-cart-btn" disabled style="background: #9CA3AF; cursor: not-allowed;">
                    Out of Stock
                </button>
            `}
        </div>
    `).join('');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
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
            document.getElementById('products-grid').innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <p style="color: #EF4444; font-weight: 600;">Failed to connect to database. Please refresh the page.</p>
                </div>
            `;
        }
    }, 5000);
});
