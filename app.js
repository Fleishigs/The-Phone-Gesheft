// Main app.js - Homepage featured products loader
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Update cart count
async function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountEl = document.querySelector('.cart-count');
    if (cartCountEl) {
        cartCountEl.textContent = count;
        cartCountEl.style.display = count > 0 ? 'flex' : 'none';
    }
}

// Load featured products on homepage
async function loadFeaturedProducts() {
    try {
        const { data: products, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('is_featured', true)
            .eq('status', 'active')
            .eq('deleted', false)
            .order('featured_order', { ascending: true })
            .limit(3);

        if (error) throw error;

        const grid = document.getElementById('featured-grid');
        if (!grid) return;

        if (!products || products.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #6B7280;">No featured products yet. Add some in the admin panel!</p>';
            return;
        }

        grid.innerHTML = products.map(product => {
            const imageUrl = product.images && product.images.length > 0 
                ? product.images[0] 
                : product.image_url || '';
            
            const hasVariants = product.variants && product.variants.length > 0;
            const basePrice = parseFloat(product.price);

            return `
                <div class="product-card">
                    <a href="/product.html?id=${product.id}">
                        <div class="product-image">
                            <img src="${imageUrl}" alt="${product.name}">
                        </div>
                        <div class="product-info">
                            <h3>${product.name}</h3>
                            <div class="product-price">$${basePrice.toFixed(2)}${hasVariants ? '+' : ''}</div>
                            ${product.track_inventory !== false ? `<div class="product-stock">${product.stock} in stock</div>` : ''}
                        </div>
                    </a>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading featured products:', error);
        const grid = document.getElementById('featured-grid');
        if (grid) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #EF4444;">Error loading products. Please try again later.</p>';
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    
    // Load featured products if we're on the homepage
    if (document.getElementById('featured-grid')) {
        loadFeaturedProducts();
    }
});
