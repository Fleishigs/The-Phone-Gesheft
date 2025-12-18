// All products page with variants support
let allProducts = [];

async function loadProducts() {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allProducts = products || [];
        displayProducts(allProducts);
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('products-grid').innerHTML = '<p>Error loading products</p>';
    }
}

function displayProducts(products) {
    const grid = document.getElementById('products-grid');

    if (products.length === 0) {
        grid.innerHTML = '<p style="text-align: center; padding: 3rem; color: #6B7280;">No products available</p>';
        return;
    }

    grid.innerHTML = products.map(product => {
        const image = product.images && product.images.length > 0 ? product.images[0] : product.image_url;
        
        // Determine price display
        let priceDisplay = '';
        if (product.variants && product.variants.length > 0) {
            const prices = product.variants.map(v => v.price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            if (minPrice === maxPrice) {
                priceDisplay = `$${minPrice.toFixed(2)}`;
            } else {
                priceDisplay = `From $${minPrice.toFixed(2)}`;
            }
        } else {
            priceDisplay = `$${product.price.toFixed(2)}`;
        }
        
        return `
        <div class="product-card" onclick="window.location.href='product.html?id=${product.id}'">
            <div class="product-image">
                <img src="${image}" alt="${product.name}">
                ${product.variants && product.variants.length > 0 ? 
                    `<div style="position: absolute; top: 8px; left: 8px; background: rgba(59,130,246,0.9); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${product.variants.length} options</div>` 
                    : ''}
            </div>
            <div class="product-details">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-price">${priceDisplay}</div>
            </div>
        </div>
        `;
    }).join('');
}

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.querySelector('.cart-count');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

// Initialize
loadProducts();
updateCartCount();
