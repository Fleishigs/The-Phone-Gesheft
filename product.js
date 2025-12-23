// Single product detail page
// Uses window.supabase from config.js

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

if (!productId) {
    window.location.href = '/products';
}

let product = null;
let currentImageIndex = 0;

// ============================================
// CART UTILITIES - Integrated
// ============================================

function getCart() {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    const cartCountElements = document.querySelectorAll('#cart-count, .cart-count');
    cartCountElements.forEach(el => {
        el.textContent = totalItems;
        el.style.display = totalItems > 0 ? 'inline-block' : 'none';
    });
}

window.addToCart = function(productId, productName, productPrice, productImage, productDescription) {
    let cart = getCart();
    
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
            price: price,
            image: productImage,
            description: productDescription || '',
            quantity: 1
        });
    }
    
    saveCart(cart);
    showNotification(`${productName} added to cart!`);
};

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = 'position: fixed; top: 100px; right: 20px; background: #10B981; color: white; padding: 1rem 2rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; animation: slideIn 0.3s ease;';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

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
// PRODUCT PAGE FUNCTIONS
// ============================================

async function loadProduct() {
    try {
        const { data, error } = await window.supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .eq('deleted', false)
            .single();
        
        if (error || !data) {
            console.error('Product not found:', error);
            window.location.href = '/products';
            return;
        }
        
        product = data;
        displayProduct();
        updateCartCount();
    } catch (error) {
        console.error('Error loading product:', error);
        window.location.href = '/products';
    }
}

function displayProduct() {
    const images = product.images && product.images.length > 0 ? product.images : [product.image_url];
    const mainImage = images[0] || '/placeholder.png';
    
    // Check stock
    let outOfStock = false;
    if (product.track_inventory !== false) {
        if (product.variants && product.variants.length > 0) {
            outOfStock = !product.variants.some(v => v.track_inventory === false || v.stock > 0);
        } else {
            outOfStock = product.stock <= 0;
        }
    }
    
    const hasVariants = product.variants && product.variants.length > 0;
    
    document.getElementById('product-detail').innerHTML = `
        <div class="product-gallery">
            <div class="main-image">
                <img src="${mainImage}" alt="${product.name}" id="main-product-image">
            </div>
            ${images.length > 1 ? `
                <div class="image-thumbnails">
                    ${images.map((img, i) => `
                        <img src="${img}" 
                             class="thumbnail ${i === 0 ? 'active' : ''}" 
                             onclick="changeImage(${i})"
                             alt="View ${i + 1}">
                    `).join('')}
                </div>
            ` : ''}
        </div>
        
        <div class="product-details">
            <h1>${product.name}</h1>
            
            <div class="product-price-large">${hasVariants ? `From $${product.price.toFixed(2)}` : `$${product.price.toFixed(2)}`}</div>
            
            <div class="product-stock-info">
                <span class="${outOfStock ? 'out-of-stock-badge' : 'in-stock-badge'}">
                    ${outOfStock ? 'Out of Stock' : 'In Stock'}
                </span>
            </div>
            
            <p class="product-description-full">${product.description || ''}</p>
            
            ${!outOfStock ? `
                <div class="product-actions" style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button class="btn btn-primary btn-large" style="flex: 1;" onclick="addToCartDetail()">
                        Add to Cart
                    </button>
                    <button class="btn btn-secondary btn-large" style="flex: 1;" onclick="buyNow()">
                        Buy Now
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

function changeImage(index) {
    currentImageIndex = index;
    const images = product.images && product.images.length > 0 ? product.images : [product.image_url];
    document.getElementById('main-product-image').src = images[index];
    
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

function addToCartDetail() {
    if (!product) return;
    
    const images = product.images && product.images.length > 0 ? product.images : [product.image_url];
    const mainImage = images[0];
    
    window.addToCart(product.id, product.name, product.price, mainImage, product.description);
}

function buyNow() {
    if (!product) return;
    addToCartDetail();
    window.location.href = '/cart';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    
    const initInterval = setInterval(() => {
        if (window.supabase) {
            clearInterval(initInterval);
            loadProduct();
        }
    }, 50);
    
    setTimeout(() => {
        clearInterval(initInterval);
    }, 5000);
});
