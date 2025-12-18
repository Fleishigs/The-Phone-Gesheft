// Single product detail page

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

if (!productId) {
    window.location.href = '/products';
}

let product = null;
let allCategories = [];
let allTags = [];
let currentImageIndex = 0;

async function loadProduct() {
    const [productResult, categoriesResult, tagsResult] = await Promise.all([
        supabase.from('products').select('*').eq('id', productId).single(),
        supabase.from('categories').select('*'),
        supabase.from('tags').select('*')
    ]);
    
    if (productResult.error || !productResult.data) {
        window.location.href = '/products';
        return;
    }
    
    product = productResult.data;
    allCategories = categoriesResult.data || [];
    allTags = tagsResult.data || [];
    
    displayProduct();
    updateCartCount();
}

function displayProduct() {
    document.getElementById('page-title').textContent = product.seo_title || product.name;
    document.getElementById('page-description').content = product.seo_description || product.description.substring(0, 160);
    
    const images = product.images && product.images.length > 0 ? product.images : [product.image_url];
    
    const categoryNames = product.category_ids 
        ? product.category_ids.map(id => {
            const cat = allCategories.find(c => c.id === id);
            return cat ? cat.name : '';
        }).filter(Boolean)
        : [];
    
    const tagNames = product.tag_ids 
        ? product.tag_ids.map(id => {
            const tag = allTags.find(t => t.id === id);
            return tag ? tag.name : '';
        }).filter(Boolean)
        : [];
    
    const features = product.features ? product.features.split('\n').filter(f => f.trim()) : [];
    
    const trackInventory = product.track_inventory !== false;
    const outOfStock = trackInventory && product.stock <= 0;
    
    document.getElementById('product-detail').innerHTML = `
        <div class="product-gallery">
            <div class="main-image">
                <img src="${images[currentImageIndex]}" alt="${product.name}" id="main-product-image">
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
            
            ${categoryNames.length > 0 ? `
                <div class="product-meta-categories">
                    ${categoryNames.map(c => `<span class="cat-badge">${c}</span>`).join('')}
                </div>
            ` : ''}
            
            <div class="product-price-large">$${product.price.toFixed(2)}</div>
            
            <div class="product-stock-info">
                ${outOfStock ? '<span class="out-of-stock-badge">Temporarily Unavailable</span>' : '<span class="in-stock-badge">In Stock</span>'}
            </div>
            
            <p class="product-description-full">${product.description}</p>
            
            ${features.length > 0 ? `
                <div class="product-features">
                    <h3>Features</h3>
                    <ul>
                        ${features.map(f => `<li>${f}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${tagNames.length > 0 ? `
                <div class="product-tags-section">
                    <strong>Tags:</strong>
                    ${tagNames.map(t => `<span class="tag-badge">${t}</span>`).join('')}
                </div>
            ` : ''}
            
            ${!outOfStock ? `
                <div class="product-actions" style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button class="btn btn-secondary btn-large" style="flex: 1;" onclick="addToCartDetail()">
                        Add to Cart
                    </button>
                    <button class="btn btn-primary btn-large" style="flex: 1;" onclick="buyNow()">
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
    
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find(item => item.id === product.id);
    
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: mainImage,
            quantity: 1
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    
    showNotification(`${product.name} added to cart!`);
}

function buyNow() {
    if (!product) return;
    
    addToCartDetail();
    window.location.href = '/cart';
}

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

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = count;
    });
}

// Add animation keyframes
const style = document.createElement('style');
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

loadProduct();
