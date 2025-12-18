// Admin dashboard functionality with image upload

let currentUser = null;
let allProducts = [];
let allOrders = [];
let allCategories = [];
let allTags = [];

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
        
        // Load fresh data
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
        const imageUrl = product.image_url || (product.images && product.images[0]) || '';
        return `
        <div class="product-admin-card">
            <img src="${imageUrl}" alt="${product.name}">
            <h3>${product.name}</h3>
            <div class="price">$${parseFloat(product.price).toFixed(2)}</div>
            <div class="stock">${product.stock} in stock</div>
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
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
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
                        <label>Stock</label>
                        <input type="number" id="modal-stock" value="${product?.stock || 0}" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="modal-description" rows="3" required>${product?.description || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>Upload Product Image</label>
                    <input type="file" id="modal-image-file" accept="image/*">
                    ${product?.image_url ? `<div style="margin-top: 0.5rem;"><small>Current image: <a href="${product.image_url}" target="_blank">View</a></small></div>` : ''}
                    <div id="upload-progress" style="display: none; margin-top: 0.5rem; color: #3B82F6;">Uploading...</div>
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
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('product-modal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const imageFile = document.getElementById('modal-image-file').files[0];
        let imageUrl = product?.image_url || '';
        
        // Upload new image if selected
        if (imageFile) {
            try {
                document.getElementById('upload-progress').style.display = 'block';
                imageUrl = await uploadImage(imageFile);
            } catch (error) {
                alert('Error uploading image: ' + error.message);
                document.getElementById('upload-progress').style.display = 'none';
                return;
            }
        }
        
        const productData = {
            name: document.getElementById('modal-name').value,
            price: parseFloat(document.getElementById('modal-price').value),
            stock: parseInt(document.getElementById('modal-stock').value),
            description: document.getElementById('modal-description').value,
            image_url: imageUrl,
            status: document.getElementById('modal-status').value
        };
        
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

// Initialize
checkAuth();
