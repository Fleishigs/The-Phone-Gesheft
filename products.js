// Products page functionality

let allProducts = [];
let allCategories = [];
let allTags = [];
let currentFilter = 'all';

async function loadAll() {
    await Promise.all([
        loadCategories(),
        loadTags(),
        loadProducts()
    ]);
    
    createCategoryFilters();
    displayProducts();
}

async function loadCategories() {
    const { data } = await supabase.from('categories').select('*').order('name');
    allCategories = data || [];
}

async function loadTags() {
    const { data } = await supabase.from('tags').select('*').order('name');
    allTags = data || [];
}

async function loadProducts() {
    const { data } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
    
    allProducts = (data || []).filter(p => 
        p.stock > 0 || p.track_inventory === false
    );
}

function createCategoryFilters() {
    const container = document.getElementById('category-filters');
    container.innerHTML = allCategories.map(cat => 
        `<button class="filter-btn" data-filter="${cat.id}">${cat.name}</button>`
    ).join('');
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            displayProducts();
        });
    });
}

function displayProducts() {
    let filtered = allProducts;
    
    if (currentFilter !== 'all') {
        filtered = allProducts.filter(p => 
            p.category_ids && p.category_ids.includes(parseInt(currentFilter))
        );
    }
    
    const grid = document.getElementById('products-grid');
    
    if (filtered.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #6B7280; grid-column: 1 / -1;">No products found</p>';
        return;
    }
    
    grid.innerHTML = filtered.map(product => {
        const images = product.images && product.images.length > 0 ? product.images : [product.image_url];
        const mainImage = images[0];
        
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
        
        return `
            <div class="product-card">
                <div class="product-image-container" onclick="window.location.href='/product?id=${product.id}'" style="cursor: pointer;">
                    <img src="${mainImage}" alt="${product.name}" class="product-image">
                </div>
                <div class="product-info">
                    <h3 class="product-name" onclick="window.location.href='/product?id=${product.id}'" style="cursor: pointer;">${product.name}</h3>
                    ${categoryNames.length > 0 ? `<div class="product-categories">${categoryNames.map(c => `<span class="cat-badge">${c}</span>`).join('')}</div>` : ''}
                    <p class="product-description">${truncate(product.description, 80)}</p>
                    ${tagNames.length > 0 ? `<div class="product-tags">${tagNames.slice(0, 3).map(t => `<span class="tag-badge">${t}</span>`).join('')}</div>` : ''}
                    <div class="product-price">$${product.price.toFixed(2)}</div>
                    <button class="btn btn-primary btn-full" onclick="event.stopPropagation(); addToCart(${product.id}, '${escapeHtml(product.name)}', ${product.price}, '${escapeHtml(mainImage)}')">
                        Add to Cart
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function truncate(text, length) {
    if (!text || text.length <= length) return text || '';
    return text.substring(0, length) + '...';
}

function addToCart(productId, productName, productPrice, productImage) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: productPrice,
            image: productImage,
            quantity: 1
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    
    showNotification(`${productName} added to cart!`);
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

// Initialize
loadAll();
updateCartCount();
