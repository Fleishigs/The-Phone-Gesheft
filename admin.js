// Admin dashboard functionality - COMPLETE VERSION with Featured Products & Multi-Image Upload

let currentUser = null;
let allProducts = [];
let allOrders = [];
let allCategories = [];
let allTags = [];
let productImages = []; // Array to store multiple images

// Login
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        
        await loadDashboard();
    } catch (error) {
        const errorDiv = document.getElementById('login-error');
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    }
});

// Logout
document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.reload();
});

// Check if already logged in
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        await loadDashboard();
    }
}

// Sidebar navigation
document.querySelectorAll('.menu-link').forEach(link => {
    link.addEventListener('click', async (e) => {
        e.preventDefault();
        const section = e.target.dataset.section;
        
        document.querySelectorAll('.menu-link').forEach(l => l.classList.remove('active'));
        e.target.classList.add('active');
        
        document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
        document.getElementById(section + '-section').style.display = 'block';
        
        if (section === 'dashboard') {
            await loadDashboard();
        } else if (section === 'products') {
            await loadProducts();
        } else if (section === 'orders') {
            await loadOrders();
        } else if (section === 'categories') {
            await loadCategories();
        } else if (section === 'tags') {
            await loadTags();
        } else if (section === 'featured') {
            await loadFeaturedManager();
        }
    });
});

// DASHBOARD
async function loadDashboard() {
    try {
        const { data: products } = await supabase.from('products').select('*');
        allProducts = products || [];
        
        const { data: orders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        allOrders = orders || [];
        
        const totalProducts = allProducts.length;
        const activeProducts = allProducts.filter(p => p.status === 'active').length;
        const totalOrders = allOrders.length;
        
        let totalRevenue = 0;
        allOrders.forEach(order => {
            const amount = order.total_price || order.amount_total / 100 || 0;
            totalRevenue += amount;
        });
        
        document.getElementById('stat-products').textContent = totalProducts;
        document.getElementById('stat-orders').textContent = totalOrders;
        document.getElementById('stat-revenue').textContent = '$' + totalRevenue.toFixed(2);
        document.getElementById('stat-active').textContent = activeProducts;
        
        displayRecentOrders(allOrders.slice(0, 5));
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function displayRecentOrders(orders) {
    const container = document.getElementById('recent-orders-table');
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div style="background: white; padding: 2rem; border-radius: 8px; text-align: center; color: #6B7280;">No orders yet</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="admin-table">
            <table>
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Date</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td>#${order.id}</td>
                            <td>${order.customer_email}</td>
                            <td>$${parseFloat(order.total_price).toFixed(2)}</td>
                            <td>${new Date(order.created_at).toLocaleDateString()}</td>
                            <td><span style="color: #10B981; font-weight: 600;">${order.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// PRODUCTS
async function loadProducts() {
    try {
        const { data: products } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        allProducts = products || [];
        
        const { data: categories } = await supabase.from('categories').select('*');
        allCategories = categories || [];
        
        const { data: tags } = await supabase.from('tags').select('*');
        allTags = tags || [];
        
        displayProducts();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function displayProducts() {
    const grid = document.getElementById('products-grid');
    
    if (allProducts.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #6B7280;">No products yet. Click "Add Product" to create one.</p>';
        return;
    }
    
    grid.innerHTML = allProducts.map(product => {
        const mainImage = product.images && product.images.length > 0 ? product.images[0] : (product.image_url || '');
        const imageCount = product.images ? product.images.length : (product.image_url ? 1 : 0);
        
        return `
        <div class="product-admin-card">
            <div style="position: relative;">
                <img src="${mainImage}" alt="${product.name}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; background: #f3f4f6;">
                ${imageCount > 1 ? `<div style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">+${imageCount - 1} more</div>` : ''}
            </div>
            <h3>${product.name}</h3>
            <div class="price">$${parseFloat(product.price).toFixed(2)}</div>
            <div class="stock">${product.track_inventory === false ? 'Unlimited' : product.stock + ' in stock'}</div>
            <div class="product-admin-actions">
                <button class="btn-edit" onclick="editProduct(${product.id})">Edit</button>
                <button class="btn-delete" onclick="deleteProduct(${product.id}, '${product.name.replace(/'/g, "\\'")}')">Delete</button>
            </div>
        </div>
    `}).join('');
}

document.getElementById('add-product-btn')?.addEventListener('click', () => {
    showProductModal();
});

// IMAGE UPLOAD FUNCTION
async function uploadImage(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `product-images/${fileName}`;

    const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

    if (error) {
        console.error('Upload error:', error);
        throw error;
    }

    const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

    return publicUrl;
}

function showProductModal(product = null) {
    // Initialize product images array
    productImages = product?.images ? [...product.images] : [];
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>${product ? 'Edit Product' : 'Add Product'}</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <form id="product-modal-form" style="padding: 1.5rem;">
                <div class="form-group">
                    <label>Product Name</label>
                    <input type="text" id="modal-name" value="${product?.name || ''}" required>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Price ($)</label>
                        <input type="number" id="modal-price" step="0.01" value="${product?.price || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="modal-track-inventory" ${product?.track_inventory !== false ? 'checked' : ''} style="width: auto; margin-right: 0.5rem;">
                            Track Inventory
                        </label>
                    </div>
                </div>
                
                <div class="form-group" id="stock-field" style="${product?.track_inventory === false ? 'display: none;' : ''}">
                    <label>Stock</label>
                    <input type="number" id="modal-stock" value="${product?.stock || 0}">
                </div>
                
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="modal-description" rows="3" required>${product?.description || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>Product Images</label>
                    <div style="margin-bottom: 1rem;">
                        <label for="modal-images" style="display: inline-block; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%); color: white; border-radius: 8px; cursor: pointer; font-weight: 600; text-align: center; transition: transform 0.2s;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px; display: inline-block; vertical-align: middle; margin-right: 0.5rem;">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="17 8 12 3 7 8"/>
                                <line x1="12" y1="3" x2="12" y2="15"/>
                            </svg>
                            Choose Images
                        </label>
                        <input type="file" id="modal-images" accept="image/*" multiple style="display: none;">
                    </div>
                    <div id="upload-progress" style="display: none; color: #3B82F6; font-weight: 600; margin-bottom: 1rem;">
                        <svg style="display: inline-block; width: 20px; height: 20px; animation: spin 1s linear infinite;" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" stroke="#3B82F6" stroke-width="4" fill="none" stroke-dasharray="31.4 31.4" transform="rotate(-90 12 12)"/>
                        </svg>
                        Uploading images...
                    </div>
                    <div id="images-preview" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 1rem;"></div>
                </div>
                
                <div class="form-group">
                    <label>Status</label>
                    <select id="modal-status">
                        <option value="active" ${product?.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="draft" ${product?.status === 'draft' ? 'selected' : ''}>Draft</option>
                    </select>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Save Product</button>
                </div>
            </form>
        </div>
        <style>
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;
    
    document.body.appendChild(modal);
    
    // Display existing images
    updateImagesPreview();
    
    // Track inventory checkbox handler
    document.getElementById('modal-track-inventory').addEventListener('change', (e) => {
        document.getElementById('stock-field').style.display = e.target.checked ? 'block' : 'none';
    });
    
    // File input handler
    document.getElementById('modal-images').addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        const progressDiv = document.getElementById('upload-progress');
        progressDiv.style.display = 'block';
        
        try {
            for (const file of files) {
                const url = await uploadImage(file);
                productImages.push(url);
            }
            updateImagesPreview();
            progressDiv.style.display = 'none';
            e.target.value = ''; // Reset file input
        } catch (error) {
            alert('Error uploading images: ' + error.message);
            progressDiv.style.display = 'none';
        }
    });
    
    // Form submit
    document.getElementById('product-modal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const trackInventory = document.getElementById('modal-track-inventory').checked;
        
        const productData = {
            name: document.getElementById('modal-name').value,
            price: parseFloat(document.getElementById('modal-price').value),
            stock: trackInventory ? parseInt(document.getElementById('modal-stock').value) : 999999,
            track_inventory: trackInventory,
            description: document.getElementById('modal-description').value,
            images: productImages,
            image_url: productImages.length > 0 ? productImages[0] : null,
            status: document.getElementById('modal-status').value
        };
        
        if (productImages.length === 0) {
            alert('Please upload at least one image!');
            return;
        }
        
        try {
            if (product) {
                const { error } = await supabase.from('products').update(productData).eq('id', product.id);
                if (error) throw error;
                alert('Product updated!');
            } else {
                const { error } = await supabase.from('products').insert([productData]);
                if (error) throw error;
                alert('Product created!');
            }
            
            modal.remove();
            await loadProducts();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });
}

function updateImagesPreview() {
    const previewDiv = document.getElementById('images-preview');
    if (!previewDiv) return;
    
    if (productImages.length === 0) {
        previewDiv.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #9CA3AF; padding: 2rem;">No images yet. Click "Choose Images" to upload.</p>';
        return;
    }
    
    previewDiv.innerHTML = productImages.map((url, index) => `
        <div style="position: relative; border: ${index === 0 ? '3px solid #3B82F6' : '2px solid #E5E7EB'}; border-radius: 8px; padding: 0.5rem; background: white;">
            <img src="${url}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px; margin-bottom: 0.5rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                <label style="font-size: 0.75rem; display: flex; align-items: center; cursor: pointer; flex: 1;">
                    <input type="radio" name="primary-image" ${index === 0 ? 'checked' : ''} onchange="setPrimaryImage(${index})" style="margin-right: 0.25rem;">
                    <span style="color: ${index === 0 ? '#3B82F6' : '#6B7280'}; font-weight: ${index === 0 ? '600' : '400'};">${index === 0 ? 'Primary' : 'Set Primary'}</span>
                </label>
                <button type="button" onclick="removeImage(${index})" style="background: #EF4444; color: white; border: none; border-radius: 4px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; line-height: 1;">&times;</button>
            </div>
        </div>
    `).join('');
}

window.removeImage = function(index) {
    productImages.splice(index, 1);
    updateImagesPreview();
};

window.setPrimaryImage = function(index) {
    const [primaryImage] = productImages.splice(index, 1);
    productImages.unshift(primaryImage);
    updateImagesPreview();
};

window.editProduct = async function(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (product) {
        showProductModal(product);
    }
};

window.deleteProduct = async function(productId, productName) {
    if (!confirm(`Are you sure you want to delete "${productName}"?`)) {
        return;
    }
    
    try {
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) throw error;
        alert('Product deleted!');
        await loadProducts();
    } catch (error) {
        alert('Error: ' + error.message);
    }
};

// ORDERS
async function loadOrders() {
    try {
        const { data: orders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        allOrders = orders || [];
        displayOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function displayOrders() {
    const container = document.getElementById('orders-table');
    
    if (allOrders.length === 0) {
        container.innerHTML = '<div style="background: white; padding: 2rem; border-radius: 8px; text-align: center; color: #6B7280;">No orders yet</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="admin-table">
            <table>
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Email</th>
                        <th>Total</th>
                        <th>Date</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${allOrders.map(order => `
                        <tr>
                            <td>#${order.id}</td>
                            <td>${order.customer_name || 'N/A'}</td>
                            <td>${order.customer_email}</td>
                            <td>$${parseFloat(order.total_price).toFixed(2)}</td>
                            <td>${new Date(order.created_at).toLocaleDateString()}</td>
                            <td><span style="color: #10B981; font-weight: 600;">${order.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// CATEGORIES
async function loadCategories() {
    try {
        const { data: categories } = await supabase.from('categories').select('*').order('name');
        allCategories = categories || [];
        displayCategories();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function displayCategories() {
    const container = document.getElementById('categories-table');
    
    if (allCategories.length === 0) {
        container.innerHTML = '<div style="background: white; padding: 2rem; border-radius: 8px; text-align: center; color: #6B7280;">No categories yet</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="admin-table">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Category Name</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${allCategories.map(cat => `
                        <tr>
                            <td>${cat.id}</td>
                            <td>${cat.name}</td>
                            <td>
                                <button class="btn-edit" onclick="editCategory(${cat.id})">Edit</button>
                                <button class="btn-delete" onclick="deleteCategory(${cat.id}, '${cat.name}')">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

document.getElementById('add-category-btn')?.addEventListener('click', () => {
    const name = prompt('Enter category name:');
    if (name) addCategory(name);
});

async function addCategory(name) {
    try {
        const { error } = await supabase.from('categories').insert([{ name }]);
        if (error) throw error;
        alert('Category added!');
        await loadCategories();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

window.editCategory = function(id) {
    const cat = allCategories.find(c => c.id === id);
    const newName = prompt('Edit category name:', cat.name);
    if (newName && newName !== cat.name) {
        updateCategory(id, newName);
    }
};

async function updateCategory(id, name) {
    try {
        const { error } = await supabase.from('categories').update({ name }).eq('id', id);
        if (error) throw error;
        alert('Category updated!');
        await loadCategories();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

window.deleteCategory = async function(id, name) {
    if (!confirm(`Delete category "${name}"?`)) return;
    
    try {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
        alert('Category deleted!');
        await loadCategories();
    } catch (error) {
        alert('Error: ' + error.message);
    }
};

// TAGS
async function loadTags() {
    try {
        const { data: tags } = await supabase.from('tags').select('*').order('name');
        allTags = tags || [];
        displayTags();
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

function displayTags() {
    const container = document.getElementById('tags-table');
    
    if (allTags.length === 0) {
        container.innerHTML = '<div style="background: white; padding: 2rem; border-radius: 8px; text-align: center; color: #6B7280;">No tags yet</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="admin-table">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Tag Name</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${allTags.map(tag => `
                        <tr>
                            <td>${tag.id}</td>
                            <td>${tag.name}</td>
                            <td>
                                <button class="btn-edit" onclick="editTag(${tag.id})">Edit</button>
                                <button class="btn-delete" onclick="deleteTag(${tag.id}, '${tag.name}')">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

document.getElementById('add-tag-btn')?.addEventListener('click', () => {
    const name = prompt('Enter tag name:');
    if (name) addTag(name);
});

async function addTag(name) {
    try {
        const { error } = await supabase.from('tags').insert([{ name }]);
        if (error) throw error;
        alert('Tag added!');
        await loadTags();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

window.editTag = function(id) {
    const tag = allTags.find(t => t.id === id);
    const newName = prompt('Edit tag name:', tag.name);
    if (newName && newName !== tag.name) {
        updateTag(id, newName);
    }
};

async function updateTag(id, name) {
    try {
        const { error} = await supabase.from('tags').update({ name }).eq('id', id);
        if (error) throw error;
        alert('Tag updated!');
        await loadTags();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

window.deleteTag = async function(id, name) {
    if (!confirm(`Delete tag "${name}"?`)) return;
    
    try {
        const { error } = await supabase.from('tags').delete().eq('id', id);
        if (error) throw error;
        alert('Tag deleted!');
        await loadTags();
    } catch (error) {
        alert('Error: ' + error.message);
    }
};

// FEATURED PRODUCTS MANAGER
async function loadFeaturedManager() {
    try {
        const { data: allProducts } = await supabase
            .from('products')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });
        
        const featured = (allProducts || []).filter(p => p.is_featured).sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0));
        const available = (allProducts || []).filter(p => !p.is_featured);
        
        const container = document.getElementById('featured-products-manager');
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                <div>
                    <h3 style="margin-bottom: 1rem; color: #111827;">Featured Products (${featured.length}/3)</h3>
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        ${featured.length === 0 ? '<p style="color: #6B7280; padding: 2rem; background: white; border-radius: 8px; text-align: center;">No featured products. Select from available products →</p>' : ''}
                        ${featured.map((p) => `
                            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 1rem;">
                                <img src="${p.images?.[0] || p.image_url || ''}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; background: #f3f4f6;">
                                <div style="flex: 1;">
                                    <strong style="display: block; margin-bottom: 0.25rem;">${p.name}</strong>
                                    <div style="color: #3B82F6; font-size: 1.125rem; font-weight: 600;">$${p.price.toFixed(2)}</div>
                                    <div style="color: #6B7280; font-size: 0.875rem; margin-top: 0.25rem;">Position: ${p.featured_order || 'N/A'}</div>
                                </div>
                                <button class="btn-delete" onclick="removeFeatured(${p.id})" style="padding: 0.5rem 1rem;">Remove</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div>
                    <h3 style="margin-bottom: 1rem; color: #111827;">Available Products</h3>
                    <div style="display: flex; flex-direction: column; gap: 1rem; max-height: 600px; overflow-y: auto;">
                        ${available.length === 0 ? '<p style="color: #6B7280; padding: 2rem; background: white; border-radius: 8px; text-align: center;">All products are featured!</p>' : ''}
                        ${available.map(p => `
                            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 1rem;">
                                <img src="${p.images?.[0] || p.image_url || ''}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; background: #f3f4f6;">
                                <div style="flex: 1;">
                                    <strong style="display: block; margin-bottom: 0.25rem;">${p.name}</strong>
                                    <div style="color: #3B82F6; font-size: 1.125rem; font-weight: 600;">$${p.price.toFixed(2)}</div>
                                </div>
                                <button class="btn-edit" onclick="addFeatured(${p.id})" ${featured.length >= 3 ? 'disabled style="opacity: 0.5; cursor: not-allowed; padding: 0.5rem 1rem;"' : 'style="padding: 0.5rem 1rem;"'}>
                                    ${featured.length >= 3 ? 'Max (3)' : 'Add'}
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading featured:', error);
        alert('Error loading featured products: ' + error.message);
    }
}

window.addFeatured = async function(productId) {
    try {
        const { data: current } = await supabase
            .from('products')
            .select('id')
            .eq('is_featured', true);
        
        if (current && current.length >= 3) {
            alert('Maximum 3 featured products allowed! Remove one first.');
            return;
        }
        
        const nextOrder = current ? current.length + 1 : 1;
        
        const { error } = await supabase
            .from('products')
            .update({ is_featured: true, featured_order: nextOrder })
            .eq('id', productId);
        
        if (error) throw error;
        
        await loadFeaturedManager();
        
    } catch (error) {
        console.error('Error adding featured:', error);
        alert('Error: ' + error.message);
    }
};

window.removeFeatured = async function(productId) {
    try {
        const { error } = await supabase
            .from('products')
            .update({ is_featured: false, featured_order: null })
            .eq('id', productId);
        
        if (error) throw error;
        
        // Reorder remaining
        const { data: remaining } = await supabase
            .from('products')
            .select('*')
            .eq('is_featured', true)
            .order('featured_order', { ascending: true });
        
        if (remaining) {
            for (let i = 0; i < remaining.length; i++) {
                await supabase
                    .from('products')
                    .update({ featured_order: i + 1 })
                    .eq('id', remaining[i].id);
            }
        }
        
        await loadFeaturedManager();
        
    } catch (error) {
        console.error('Error removing:', error);
        alert('Error: ' + error.message);
    }
};

// Initialize
checkAuth();
