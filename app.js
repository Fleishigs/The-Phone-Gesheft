// Homepage functionality - WITH SOFT DELETE FILTER
async function loadFeaturedProducts() {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_featured', true)
            .eq('status', 'active')
            .eq('deleted', false)  // SOFT DELETE - Filter out deleted products
            .order('featured_order', { ascending: true })
            .limit(3);
        
        if (error) throw error;
        
        displayFeaturedProducts(products || []);
    } catch (error) {
        console.error('Error loading featured products:', error);
    }
}

function displayFeaturedProducts(products) {
    const grid = document.getElementById('featured-products-grid');
    if (!grid) return;
    
    if (products.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #6B7280; grid-column: 1 / -1;">No featured products yet</p>';
        return;
    }
    
    grid.innerHTML = products.map(product => {
        const images = product.images && product.images.length > 0 ? product.images : [product.image_url];
        const mainImage = images[0];
        
        // Determine price display
        let priceDisplay = '';
        let hasVariants = product.variants && product.variants.length > 0;
        if (hasVariants) {
            const prices = product.variants.map(v => v.price);
            const minPrice = Math.min(...prices);
            priceDisplay = `From $${minPrice.toFixed(2)}`;
        } else {
            priceDisplay = `$${product.price.toFixed(2)}`;
        }
        
        return `
            <div class="product-card" onclick="window.location.href='/product?id=${product.id}'" style="cursor: pointer;">
                <div class="product-image-container">
                    <img src="${mainImage}" alt="${product.name}" class="product-image">
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${truncate(product.description, 80)}</p>
                    <div class="product-price">${priceDisplay}</div>
                </div>
            </div>
        `;
    }).join('');
}

function truncate(text, length) {
    if (!text || text.length <= length) return text || '';
    return text.substring(0, length) + '...';
}

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = count;
    });
}

// Initialize
if (document.getElementById('featured-products-grid')) {
    loadFeaturedProducts();
}
updateCartCount();
