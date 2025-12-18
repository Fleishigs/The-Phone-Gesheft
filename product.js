// Single product page with VARIANTS support
const productId = new URLSearchParams(window.location.search).get('id');
let currentProduct = null;
let selectedVariant = null;

async function loadProduct() {
    if (!productId) {
        document.getElementById('product-content').innerHTML = '<p>Product not found</p>';
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
            document.getElementById('product-content').innerHTML = '<p>Product not found</p>';
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
        document.getElementById('product-content').innerHTML = '<p>Error loading product</p>';
    }
}

function displayProduct(product) {
    const container = document.getElementById('product-content');
    const images = product.images || [product.image_url];
    
    // Determine display price
    let priceDisplay = '';
    if (product.variants && product.variants.length > 0) {
        const prices = product.variants.map(v => v.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        if (minPrice === maxPrice) {
            priceDisplay = `$${minPrice.toFixed(2)}`;
        } else {
            priceDisplay = `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
        }
    } else {
        priceDisplay = `$${product.price.toFixed(2)}`;
    }
    
    container.innerHTML = `
        <div class="product-detail">
            <div class="product-gallery">
                <div class="main-image">
                    <img id="main-product-image" src="${images[0]}" alt="${product.name}">
                </div>
                ${images.length > 1 ? `
                <div class="thumbnail-gallery">
                    ${images.map((img, i) => `
                        <img src="${img}" 
                             alt="${product.name}" 
                             class="thumbnail ${i === 0 ? 'active' : ''}"
                             onclick="changeMainImage('${img}', this)">
                    `).join('')}
                </div>
                ` : ''}
            </div>
            
            <div class="product-info">
                <h1>${product.name}</h1>
                <div class="product-price" id="product-price">${priceDisplay}</div>
                <div class="product-description">${product.description}</div>
                
                ${product.variants && product.variants.length > 0 ? `
                <div class="variant-selector">
                    <label for="variant-select">Choose Option:</label>
                    <select id="variant-select" onchange="updateSelectedVariant()">
                        ${product.variants.map((variant, i) => `
                            <option value="${i}">
                                ${variant.name} - $${variant.price.toFixed(2)}
                                ${variant.stock === 0 ? ' (Out of Stock)' : ''}
                            </option>
                        `).join('')}
                    </select>
                </div>
                ` : ''}
                
                <div class="product-stock" id="product-stock">
                    ${getStockDisplay(product)}
                </div>
                
                <div class="product-actions">
                    <button onclick="addToCart()" class="btn btn-primary btn-large" id="add-to-cart-btn">
                        Add to Cart
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

function getStockDisplay(product) {
    if (product.track_inventory === false) {
        return '<span style="color: #10B981; font-weight: 600;">✓ In Stock</span>';
    }
    
    if (product.variants && product.variants.length > 0) {
        // Stock will be shown for selected variant
        return '<span id="variant-stock"></span>';
    }
    
    if (product.stock > 0) {
        return `<span style="color: #10B981; font-weight: 600;">✓ In Stock (${product.stock} available)</span>`;
    } else {
        return '<span style="color: #EF4444; font-weight: 600;">✗ Out of Stock</span>';
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
    const stockEl = document.getElementById('variant-stock');
    const addBtn = document.getElementById('add-to-cart-btn');
    
    if (!selectedVariant) return;
    
    if (selectedVariant.stock > 0) {
        stockEl.innerHTML = `<span style="color: #10B981; font-weight: 600;">✓ In Stock (${selectedVariant.stock} available)</span>`;
        addBtn.disabled = false;
        addBtn.style.opacity = '1';
    } else {
        stockEl.innerHTML = '<span style="color: #EF4444; font-weight: 600;">✗ Out of Stock</span>';
        addBtn.disabled = true;
        addBtn.style.opacity = '0.5';
    }
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
    btn.textContent = '✓ Added!';
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
