// app.js - Main frontend functionality
// NOTE: Supabase client is already initialized in config.js

// Shopping cart
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Update cart count
function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const countElement = document.querySelector('.cart-count');
    if (countElement) {
        countElement.textContent = count;
        countElement.style.display = count > 0 ? 'flex' : 'none';
    }
}

// Load featured products on homepage - FIXED
async function loadFeaturedProducts() {
    const container = document.getElementById('featured-products-grid');
    if (!container) return;
    
    try {
        // Get ONLY active, non-deleted featured products
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_featured', true)
            .eq('status', 'active')
            .eq('deleted', false)
            .order('featured_order', { ascending: true })
            .limit(3);
        
        if (error) {
            console.error('Error loading featured products:', error);
            container.innerHTML = '<p style="text-align: center; color: #6B7280; grid-column: 1/-1;">Error loading products</p>';
            return;
        }
        
        if (!products || products.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6B7280; grid-column: 1/-1;">No featured products available</p>';
            return;
        }
        
        container.innerHTML = products.map(product => {
            const imageUrl = product.images?.[0] || product.image_url || '';
            const stockText = product.track_inventory === false ? 'In Stock' : 
                             product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock';
            
            return `
                <div class="product-card">
                    <a href="product.html?id=${product.id}">
                        <div class="product-image-container">
                            <img src="${imageUrl}" alt="${product.name}" class="product-image" loading="lazy">
                        </div>
                    </a>
                    <div class="product-info">
                        <a href="product.html?id=${product.id}">
                            <h3 class="product-name">${product.name}</h3>
                        </a>
                        <p class="product-description">${product.description || ''}</p>
                        <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
                        <div class="product-stock">${stockText}</div>
                        <button class="btn btn-primary btn-full" onclick="addToCart(${product.id}, '${product.name}', ${product.price}, '${imageUrl}')">
                            Add to Cart
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Fatal error loading featured products:', error);
        container.innerHTML = '<p style="text-align: center; color: #EF4444; grid-column: 1/-1;">Failed to load products. Please refresh the page.</p>';
    }
}

// Load all products for products page
async function loadAllProducts() {
    const container = document.getElementById('all-products-grid');
    if (!container) return;
    
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('status', 'active')
            .eq('deleted', false)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!products || products.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6B7280; grid-column: 1/-1;">No products available</p>';
            return;
        }
        
        displayProducts(products);
        window.allProductsData = products;
    } catch (error) {
        console.error('Error loading products:', error);
        container.innerHTML = '<p style="text-align: center; color: #EF4444; grid-column: 1/-1;">Error loading products</p>';
    }
}

// Display products
function displayProducts(products) {
    const container = document.getElementById('all-products-grid');
    if (!container) return;
    
    container.innerHTML = products.map(product => {
        const imageUrl = product.images?.[0] || product.image_url || '';
        const stockText = product.track_inventory === false ? 'In Stock' : 
                         product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock';
        
        return `
            <div class="product-card">
                <a href="product.html?id=${product.id}">
                    <div class="product-image-container">
                        <img src="${imageUrl}" alt="${product.name}" class="product-image" loading="lazy">
                    </div>
                </a>
                <div class="product-info">
                    <a href="product.html?id=${product.id}">
                        <h3 class="product-name">${product.name}</h3>
                    </a>
                    <p class="product-description">${product.description || ''}</p>
                    <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
                    <div class="product-stock">${stockText}</div>
                    <button class="btn btn-primary btn-full" onclick="addToCart(${product.id}, '${product.name}', ${product.price}, '${imageUrl}')">
                        Add to Cart
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Filter products
function filterProducts(category) {
    const allProducts = window.allProductsData || [];
    
    if (category === 'all') {
        displayProducts(allProducts);
    } else {
        const filtered = allProducts.filter(p => 
            p.categories && p.categories.includes(category)
        );
        displayProducts(filtered);
    }
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });
}

// Add to cart
function addToCart(id, name, price, image) {
    const existingItem = cart.find(item => item.id === id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, image, quantity: 1 });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    alert('Added to cart!');
}

// Load product detail
async function loadProductDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
        window.location.href = 'products.html';
        return;
    }
    
    try {
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();
        
        if (error || !product) {
            window.location.href = 'products.html';
            return;
        }
        
        // Display product details
        const images = product.images || [product.image_url];
        const mainImageContainer = document.querySelector('.main-image');
        const thumbnailsContainer = document.querySelector('.image-thumbnails');
        
        if (mainImageContainer) {
            mainImageContainer.innerHTML = `<img src="${images[0]}" alt="${product.name}" id="main-product-image">`;
        }
        
        if (thumbnailsContainer && images.length > 1) {
            thumbnailsContainer.innerHTML = images.map((img, index) => `
                <img src="${img}" alt="${product.name}" class="thumbnail ${index === 0 ? 'active' : ''}" 
                     onclick="changeMainImage('${img}', this)">
            `).join('');
        }
        
        document.getElementById('product-name').textContent = product.name;
        document.getElementById('product-price').textContent = `$${parseFloat(product.price).toFixed(2)}`;
        document.getElementById('product-description').textContent = product.description || '';
        
        const stockBadge = document.getElementById('product-stock');
        if (product.track_inventory === false) {
            stockBadge.className = 'in-stock-badge';
            stockBadge.textContent = 'In Stock';
        } else if (product.stock > 0) {
            stockBadge.className = 'in-stock-badge';
            stockBadge.textContent = `${product.stock} in stock`;
        } else {
            stockBadge.className = 'out-of-stock-badge';
            stockBadge.textContent = 'Out of Stock';
        }
        
        // Variants
        const variantSelector = document.getElementById('variant-selector');
        if (product.variants && product.variants.length > 0) {
            variantSelector.style.display = 'block';
            const select = document.getElementById('variant-select');
            select.innerHTML = product.variants.map(v => `
                <option value="${v.name}" data-price="${v.price}" data-stock="${v.stock}">
                    ${v.name} - $${parseFloat(v.price).toFixed(2)}
                    ${product.track_inventory && v.stock <= 0 ? ' (Out of Stock)' : ''}
                </option>
            `).join('');
            
            select.addEventListener('change', (e) => {
                const option = e.target.selectedOptions[0];
                const price = option.dataset.price;
                document.getElementById('product-price').textContent = `$${parseFloat(price).toFixed(2)}`;
            });
        }
        
        // Add to cart button
        document.getElementById('add-to-cart-btn').onclick = () => {
            const mainImage = document.getElementById('main-product-image').src;
            const currentPrice = document.getElementById('product-price').textContent.replace('$', '');
            addToCart(product.id, product.name, parseFloat(currentPrice), mainImage);
        };
        
    } catch (error) {
        console.error('Error loading product:', error);
        window.location.href = 'products.html';
    }
}

// Change main product image
function changeMainImage(src, thumbnail) {
    document.getElementById('main-product-image').src = src;
    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
    thumbnail.classList.add('active');
}

// Load cart page
function loadCart() {
    const container = document.getElementById('cart-items-container');
    const summaryContainer = document.getElementById('cart-summary');
    
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <h2>Your cart is empty</h2>
                <a href="products.html" class="btn btn-primary">Shop Now</a>
            </div>
        `;
        summaryContainer.style.display = 'none';
        return;
    }
    
    container.innerHTML = `
        <div class="cart-items">
            ${cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-image">
                        <img src="${item.image}" alt="${item.name}">
                    </div>
                    <div class="cart-item-details">
                        <h3>${item.name}</h3>
                        <div style="color: #3B82F6; font-weight: 600;">$${parseFloat(item.price).toFixed(2)}</div>
                    </div>
                    <div class="cart-item-quantity">
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    </div>
                    <div class="cart-item-total">$${(item.price * item.quantity).toFixed(2)}</div>
                    <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
            `).join('')}
        </div>
    `;
    
    // Update summary
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 0; // Free shipping
    const total = subtotal + shipping;
    
    document.getElementById('cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('cart-shipping').textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
    document.getElementById('cart-total').textContent = `$${total.toFixed(2)}`;
}

// Update quantity
function updateQuantity(productId, change) {
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.id !== productId);
        }
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    loadCart();
}

// Remove from cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    loadCart();
}

// Testimonials slider
let currentTestimonial = 0;
const testimonials = document.querySelectorAll('.testimonial-card');

function showTestimonial(index) {
    testimonials.forEach((t, i) => {
        t.classList.remove('active');
        if (i === index) t.classList.add('active');
    });
    
    document.querySelectorAll('.dot').forEach((d, i) => {
        d.classList.remove('active');
        if (i === index) d.classList.add('active');
    });
}

function nextTestimonial() {
    currentTestimonial = (currentTestimonial + 1) % testimonials.length;
    showTestimonial(currentTestimonial);
}

function prevTestimonial() {
    currentTestimonial = (currentTestimonial - 1 + testimonials.length) % testimonials.length;
    showTestimonial(currentTestimonial);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    
    // Load content based on page
    if (document.getElementById('featured-products-grid')) {
        loadFeaturedProducts();
    }
    
    if (document.getElementById('all-products-grid')) {
        loadAllProducts();
    }
    
    if (document.getElementById('product-name')) {
        loadProductDetail();
    }
    
    if (document.getElementById('cart-items-container')) {
        loadCart();
    }
    
    // Testimonials auto-rotate
    if (testimonials.length > 0) {
        showTestimonial(0);
        setInterval(nextTestimonial, 5000);
    }
});
