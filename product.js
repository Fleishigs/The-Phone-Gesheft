// Single product page - FIXED VERSION
const productId = new URLSearchParams(window.location.search).get('id');
let currentProduct = null;
let selectedVariant = null;

async function loadProduct() {
    if (!productId) {
        document.getElementById('product-content').innerHTML = '<div class="container"><p>Product not found</p></div>';
        return;
    }

    try {
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (error) throw error;
        if (!product) {
            document.getElementById('product-content').innerHTML = '<div class="container"><p>Product not found</p></div>';
            return;
        }

        currentProduct = product;
        
        // If product has variants, select first one by default
        if (product.variants && product.variants.length > 0) {
            selectedVariant = product.variants[0];
        }
        
        displayProduct(product);
    } catch (error) {
        console.error('Error loading product:', error);
        document.getElementById('product-content').innerHTML = '<div class="container"><p>Error loading product</p></div>';
    }
}

function displayProduct(product) {
    const container = document.getElementById('product-content');
    const images = product.images || [product.image_url];
    
    // Determine display price
    let priceDisplay = '';
    let currentPrice = product.price;
    
    if (product.variants && product.variants.length > 0) {
        const prices = product.variants.map(v => v.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        if (minPrice === maxPrice) {
            priceDisplay = `$${minPrice.toFixed(2)}`;
            currentPrice = minPrice;
        } else {
            priceDisplay = `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
            currentPrice = selectedVariant.price;
        }
    } else {
        priceDisplay = `$${product.price.toFixed(2)}`;
    }
    
    // Check stock
    let inStock = true;
    let stockDisplay = '';
    
    if (product.variants && product.variants.length > 0) {
        if (selectedVariant.track_inventory !== false) {
            inStock = selectedVariant.stock > 0;
            stockDisplay = inStock ? `✓ In Stock (${selectedVariant.stock} available)` : '✗ Out of Stock';
        } else {
            stockDisplay = '✓ In Stock';
        }
    } else {
        if (product.track_inventory !== false) {
            inStock = product.stock > 0;
            stockDisplay = inStock ? `✓ In Stock (${product.stock} available)` : '✗ Out of Stock';
        } else {
            stockDisplay = '✓ In Stock';
        }
    }
    
    container.innerHTML = `
        <div class="container">
            <a href="products.html" class="back-link">← Back to Products</a>
            
            <div class="product-detail">
                <div class="product-gallery">
                    <div class="main-image">
                        <img id="main-product-image" src="${images[0]}" alt="${product.name}">
                    </div>
                    ${images.length > 1 ? `
                    <div class="image-thumbnails">
                        ${images.map((img, i) => `
                            <img src="${img}" 
                                 alt="${product.name}" 
                                 class="thumbnail ${i === 0 ? 'active' : ''}"
                                 onclick="changeMainImage('${img}', this)">
                        `).join('')}
                    </div>
                    ` : ''}
                </div>
                
                <div class="product-details">
                    <h1>${product.name}</h1>
                    <div class="product-price-large" id="product-price">${priceDisplay}</div>
                    
                    ${product.variants && product.variants.length > 0 ? `
                    <div class="variant-selector">
                        <label for="variant-select">Choose Option:</label>
                        <select id="variant-select" onchange="updateSelectedVariant()">
                            ${product.variants.map((variant, i) => `
                                <option value="${i}">
                                    ${variant.name} - $${variant.price.toFixed(2)}
                                    ${variant.track_inventory !== false && variant.stock === 0 ? ' (Out of Stock)' : ''}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    ` : ''}
                    
                    <div class="product-stock-info">
                        <span id="stock-display" class="${inStock ? 'in-stock-badge' : 'out-of-stock-badge'}">
                            ${stockDisplay}
                        </span>
                    </div>
                    
                    <div class="product-description-full">
                        ${product.description}
                    </div>
                    
                    <button onclick="addToCart()" class="btn btn-primary btn-large btn-full" id="add-to-cart-btn" ${!inStock ? 'disabled' : ''}>
                        ${inStock ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Update stock status if variants
    if (product.variants && product.variants.length > 0) {
        updateStockDisplay();
    }
}

function updateSelectedVariant() {
    const select = document.getElementById('variant-select');
    const variantIndex = parseInt(select.value);
    selectedVariant = currentProduct.variants[variantIndex];
    
    // Update price
    document.getElementById('product-price').textContent = `$${selectedVariant.price.toFixed(2)}`;
    
    // Update stock
    updateStockDisplay();
}

function updateStockDisplay() {
    const stockEl = document.getElementById('stock-display');
    const addBtn = document.getElementById('add-to-cart-btn');
    
    if (!selectedVariant) return;
    
    let inStock = true;
    let stockText = '';
    
    if (selectedVariant.track_inventory !== false) {
        inStock = selectedVariant.stock > 0;
        stockText = inStock ? `✓ In Stock (${selectedVariant.stock} available)` : '✗ Out of Stock';
    } else {
        stockText = '✓ In Stock';
    }
    
    stockEl.textContent = stockText;
    stockEl.className = inStock ? 'in-stock-badge' : 'out-of-stock-badge';
    
    addBtn.disabled = !inStock;
    addBtn.textContent = inStock ? 'Add to Cart' : 'Out of Stock';
}

function changeMainImage(imageSrc, thumbnail) {
    document.getElementById('main-product-image').src = imageSrc;
    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
    thumbnail.classList.add('active');
}

function addToCart() {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Determine what to add to cart
    let cartItem;
    if (selectedVariant) {
        // Add variant
        cartItem = {
            id: currentProduct.id,
            name: currentProduct.name,
            price: selectedVariant.price,
            variant: selectedVariant.name,
            image: currentProduct.images?.[0] || currentProduct.image_url,
            quantity: 1
        };
        
        // Check if this exact variant already in cart
        const existingIndex = cart.findIndex(item => 
            item.id === currentProduct.id && item.variant === selectedVariant.name
        );
        
        if (existingIndex > -1) {
            cart[existingIndex].quantity += 1;
        } else {
            cart.push(cartItem);
        }
    } else {
        // Add regular product (no variant)
        cartItem = {
            id: currentProduct.id,
            name: currentProduct.name,
            price: currentProduct.price,
            image: currentProduct.images?.[0] || currentProduct.image_url,
            quantity: 1
        };
        
        const existingIndex = cart.findIndex(item => item.id === currentProduct.id && !item.variant);
        
        if (existingIndex > -1) {
            cart[existingIndex].quantity += 1;
        } else {
            cart.push(cartItem);
        }
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    
    // Show feedback
    const btn = document.getElementById('add-to-cart-btn');
    const originalText = btn.textContent;
    btn.textContent = '✓ Added to Cart!';
    btn.style.background = '#10B981';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 1500);
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
loadProduct();
updateCartCount();
