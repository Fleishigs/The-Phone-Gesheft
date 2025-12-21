// UNIFIED Admin Dashboard - Complete System
let currentUser = null;
let allProducts = [];
let allOrders = [];
let allCategories = [];
let allTags = [];
let productImages = [];
let productVariants = [];
let currentEditingProductId = null;
let selectedOrderId = null;
let syncInterval = null;
let allOrdersCache = [];
let currentFilter = 'all';

// ============================================
// AUTHENTICATION
// ============================================
document.getElementById("login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("admin-email").value;
    const password = document.getElementById("admin-password").value;
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        currentUser = data.user;
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("admin-dashboard").style.display = "flex";
        await loadDashboard();
        startAutoSync();
    } catch (error) {
        const errorDiv = document.getElementById("login-error");
        errorDiv.textContent = error.message;
        errorDiv.style.display = "block";
    }
});

document.getElementById("logout-btn")?.addEventListener("click", async () => {
    stopAutoSync();
    await supabase.auth.signOut();
    location.reload();
});

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("admin-dashboard").style.display = "flex";
        await loadDashboard();
        startAutoSync();
    }
}

// ============================================
// NAVIGATION
// ============================================
document.querySelectorAll(".menu-link").forEach(link => {
    link.addEventListener("click", async (e) => {
        e.preventDefault();
        const section = e.target.dataset.section;
        goToSection(section);
        
        if (section === "dashboard") {
            await loadDashboard();
        } else if (section === "orders") {
            currentFilter = 'all';
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('[onclick="filterOrders(\'all\')"]')?.classList.add('active');
            displayOrders(allOrdersCache);
        } else if (section === "products") {
            await loadProducts();
        } else if (section === "featured") {
            await loadFeaturedManager();
        } else if (section === "categories") {
            await loadCategories();
        } else if (section === "tags") {
            await loadTags();
        }
    });
});

function goToSection(section) {
    document.querySelectorAll(".menu-link").forEach(l => l.classList.remove("active"));
    document.querySelector(`[data-section="${section}"]`)?.classList.add('active');
    document.querySelectorAll(".admin-section").forEach(s => s.style.display = "none");
    document.getElementById(section + "-section").style.display = "block";
    
    const titles = {
        dashboard: 'Dashboard',
        orders: 'Order Management',
        products: 'Products',
        featured: 'Featured Products',
        categories: 'Categories',
        tags: 'Tags'
    };
    document.getElementById('section-title').textContent = titles[section] || section;
}

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
    try {
        await syncOrders(); // Load orders first
        
        const { data: products } = await supabase.from("products").select("*").eq("deleted", false);
        allProducts = products || [];
        
        const totalProducts = allProducts.length;
        const activeProducts = allProducts.filter(p => p.status === "active").length;
        const totalOrders = allOrdersCache.length;
        const pendingShip = allOrdersCache.filter(o => o.status === 'pending_shipment').length;
        
        let totalRevenue = 0;
        allOrdersCache.filter(o => o.status !== 'refunded').forEach(order => {
            totalRevenue += parseFloat(order.total_price || 0);
        });
        
        document.getElementById("stat-products").textContent = totalProducts;
        document.getElementById("stat-orders").textContent = totalOrders;
        document.getElementById("stat-revenue").textContent = "$" + totalRevenue.toFixed(2);
        document.getElementById("stat-pending").textContent = pendingShip;
        
        displayRecentOrders(allOrdersCache.slice(0, 5));
    } catch (error) {
        console.error("Dashboard error:", error);
    }
}

function displayRecentOrders(orders) {
    const container = document.getElementById("recent-orders-table");
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div style="background: white; padding: 2rem; border-radius: 8px; text-align: center; color: #6B7280;">No orders yet</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="admin-table">
            <table>
                <thead><tr><th>Order ID</th><th>Customer</th><th>Product</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                    ${orders.map(order => `
                        <tr class="recent-order-row" onclick="viewOrder(${order.id})">
                            <td><strong>#${order.id}</strong></td>
                            <td>${order.customer_name}</td>
                            <td>${order.product_name}</td>
                            <td>$${parseFloat(order.total_price).toFixed(2)}</td>
                            <td><span class="order-status status-${order.status || 'pending_shipment'}">${getStatusLabel(order.status)}</span></td>
                            <td>${new Date(order.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

// ============================================
// ORDERS MANAGEMENT
// ============================================
function startAutoSync() {
    syncOrders();
    syncInterval = setInterval(syncOrders, 30000);
}

function stopAutoSync() {
    if (syncInterval) clearInterval(syncInterval);
}

async function syncOrders() {
    const indicator = document.getElementById('sync-indicator');
    const syncText = document.getElementById('sync-text');
    const syncBtn = document.getElementById('sync-btn-text');
    
    if (indicator) {
        indicator.style.display = 'flex';
        indicator.className = 'sync-indicator syncing';
        syncText.textContent = 'Syncing...';
    }
    if (syncBtn) syncBtn.innerHTML = '<span class="loading-spinner"></span> Syncing...';
    
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allOrdersCache = orders || [];
        
        // Check refunds
        for (let order of allOrdersCache) {
            if (order.stripe_payment_intent && order.status !== 'refunded') {
                try {
                    const response = await fetch(`/.netlify/functions/check-payment-status`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ payment_intent: order.stripe_payment_intent })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.status === 'refunded' && order.status !== 'refunded') {
                            order.status = 'refunded';
                            order.refunded_at = new Date().toISOString();
                            
                            await supabase
                                .from('orders')
                                .update({ status: 'refunded', refunded_at: order.refunded_at })
                                .eq('id', order.id);
                        }
                    }
                } catch (err) {
                    console.error('Error checking payment:', err);
                }
            }
        }
        
        // Apply current filter before displaying
        let ordersToDisplay = allOrdersCache;
        if (currentFilter !== 'all') {
            ordersToDisplay = allOrdersCache.filter(o => o.status === currentFilter);
        }
        
        displayOrders(ordersToDisplay);
        updateDashboardStats(allOrdersCache);
        
        if (indicator) {
            indicator.className = 'sync-indicator synced';
            syncText.textContent = 'Synced';
            setTimeout(() => indicator.style.display = 'none', 3000);
        }
        if (syncBtn) syncBtn.textContent = '🔄 Sync Now';
        
    } catch (error) {
        console.error('Sync error:', error);
        if (indicator) {
            indicator.className = 'sync-indicator';
            indicator.style.background = '#FEE2E2';
            indicator.style.color = '#991B1B';
            syncText.textContent = 'Sync failed';
        }
        if (syncBtn) syncBtn.textContent = '🔄 Sync Now';
    }
}

function updateDashboardStats(orders) {
    const totalOrders = orders.length;
    const totalRevenue = orders
        .filter(o => o.status !== 'refunded')
        .reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
    const pendingShip = orders.filter(o => o.status === 'pending_shipment').length;
    
    document.getElementById('stat-orders').textContent = totalOrders;
    document.getElementById('stat-revenue').textContent = `$${totalRevenue.toFixed(2)}`;
    document.getElementById('stat-pending').textContent = pendingShip;
    
    displayRecentOrders(orders.slice(0, 5));
}

function getStatusLabel(status) {
    const labels = {
        'pending_shipment': 'AWAITING SHIPMENT',
        'completed': 'COMPLETED',
        'refunded': 'REFUNDED'
    };
    return labels[status] || 'AWAITING SHIPMENT';
}

function viewOrder(orderId) {
    goToSection('orders');
    setTimeout(() => {
        const orderCard = document.querySelector(`[data-order-id="${orderId}"]`);
        if (orderCard) {
            orderCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            orderCard.classList.add('expanded');
            orderCard.style.borderColor = '#3B82F6';
            setTimeout(() => orderCard.style.borderColor = '', 2000);
        }
    }, 300);
}

window.filterOrders = function(filter) {
    currentFilter = filter;
    
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (document.getElementById('orders-section').style.display === 'none') {
        goToSection('orders');
    }
    
    let filteredOrders = allOrdersCache;
    if (filter !== 'all') {
        filteredOrders = allOrdersCache.filter(o => o.status === filter);
    }
    
    displayOrders(filteredOrders);
};

function displayOrders(orders) {
    const container = document.getElementById('orders-container');
    
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><h3>No orders found</h3><p>Try a different filter</p></div>';
        return;
    }
    
    container.innerHTML = orders.map(order => {
        const address = order.shipping_address || {};
        const statusClass = `status-${order.status || 'pending_shipment'}`;
        
        return `
            <div class="order-card-compact" data-order-id="${order.id}">
                <div class="order-card-header" onclick="toggleOrder(${order.id})">
                    <div class="order-card-left">
                        <div class="order-id-badge">#${order.id}</div>
                        <div class="order-customer-info">
                            <h4>${order.customer_name}</h4>
                            <p>${order.product_name} × ${order.quantity}</p>
                        </div>
                    </div>
                    <div class="order-card-right">
                        <span class="order-status ${statusClass}">
                            ${getStatusLabel(order.status)}
                        </span>
                        <div class="order-price">$${parseFloat(order.total_price).toFixed(2)}</div>
                        <div class="expand-icon">▶</div>
                    </div>
                </div>
                
                <div class="order-details">
                    <div class="order-details-grid">
                        <div class="detail-section">
                            <h4>📦 SHIP TO</h4>
                            <p>
                                <strong>${address.name || order.shipping_name || 'N/A'}</strong><br>
                                ${address.line1 || 'No address'}<br>
                                ${address.line2 ? address.line2 + '<br>' : ''}
                                ${address.city || ''}, ${address.state || ''} ${address.postal_code || ''}<br>
                                ${address.country || ''}
                            </p>
                        </div>
                        
                        <div class="detail-section">
                            <h4>👤 CUSTOMER</h4>
                            <p>
                                <strong>${order.customer_name}</strong><br>
                                ${order.customer_email}<br>
                                📞 ${order.customer_phone || 'No phone'}
                            </p>
                        </div>
                        
                        <div class="detail-section">
                            <h4>📱 PRODUCT</h4>
                            <p>
                                <strong>${order.product_name}</strong><br>
                                Qty: ${order.quantity}<br>
                                Price: $${order.product_price.toFixed(2)}<br>
                                <strong style="color: var(--primary);">Total: $${order.total_price.toFixed(2)}</strong>
                            </p>
                        </div>
                        
                        ${order.tracking_number ? `
                            <div class="detail-section">
                                <h4>📬 TRACKING</h4>
                                <p>
                                    <strong>Carrier:</strong> ${order.shipping_carrier}<br>
                                    <strong>Number:</strong> ${order.tracking_number}<br>
                                    ${order.estimated_delivery ? `<strong>Est. Delivery:</strong> ${new Date(order.estimated_delivery).toLocaleDateString()}<br>` : ''}
                                </p>
                            </div>
                        ` : ''}

                        ${order.completion_notes ? `
                            <div class="detail-section">
                                <h4>📝 COMPLETION NOTES</h4>
                                <p>${order.completion_notes}</p>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="order-actions">
                        ${order.status === 'refunded' ? `
                            <div style="color: #DC2626; font-weight: 600; padding: 0.75rem; background: #FEE2E2; border-radius: 8px;">
                                💸 Refunded on ${new Date(order.refunded_at || order.created_at).toLocaleDateString()}
                            </div>
                        ` : order.status === 'completed' ? `
                            <div style="color: #10B981; font-weight: 600; padding: 0.75rem; background: #D1FAE5; border-radius: 8px;">
                                ✅ Completed on ${new Date(order.completed_at || order.created_at).toLocaleDateString()}
                            </div>
                        ` : `
                            <button class="action-btn btn-ship" onclick="openShippingModal(${order.id})">
                                📦 Mark as Shipped
                            </button>
                            <button class="action-btn btn-complete" onclick="openCompleteModal(${order.id})">
                                ✅ Mark as Complete
                            </button>
                        `}
                        
                        ${order.stripe_payment_intent ? `
                            <a href="https://dashboard.stripe.com/payments/${order.stripe_payment_intent}" 
                               target="_blank" 
                               class="action-btn btn-stripe">
                                View in Stripe →
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.toggleOrder = function(orderId) {
    const orderCard = document.querySelector(`[data-order-id="${orderId}"]`);
    orderCard.classList.toggle('expanded');
};

window.openShippingModal = function(orderId) {
    selectedOrderId = orderId;
    document.getElementById('shipping-modal').classList.add('active');
};

window.closeShippingModal = function() {
    document.getElementById('shipping-modal').classList.remove('active');
    selectedOrderId = null;
    document.getElementById('tracking-number').value = '';
    document.getElementById('estimated-delivery').value = '';
};

window.confirmShipping = async function() {
    const carrier = document.getElementById('shipping-carrier').value;
    const trackingNumber = document.getElementById('tracking-number').value;
    const estimatedDelivery = document.getElementById('estimated-delivery').value;
    
    if (!trackingNumber) {
        alert('Please enter a tracking number');
        return;
    }
    
    try {
        const order = allOrdersCache.find(o => o.id === selectedOrderId);
        
        const { error } = await supabase
            .from('orders')
            .update({
                status: 'completed',
                shipping_carrier: carrier,
                tracking_number: trackingNumber,
                tracking_url: generateTrackingUrl(carrier, trackingNumber),
                estimated_delivery: estimatedDelivery || null,
                completion_notes: 'Shipped with tracking',
                completed_at: new Date().toISOString()
            })
            .eq('id', selectedOrderId);
        
        if (error) throw error;
        
        await sendShippingEmail(order, carrier, trackingNumber, estimatedDelivery);
        
        alert('✅ Order marked as complete and customer notified!');
        closeShippingModal();
        await syncOrders();
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error: ' + error.message);
    }
};

window.openCompleteModal = function(orderId) {
    selectedOrderId = orderId;
    document.getElementById('complete-modal').classList.add('active');
};

window.closeCompleteModal = function() {
    document.getElementById('complete-modal').classList.remove('active');
    selectedOrderId = null;
    document.getElementById('completion-notes').value = '';
};

window.confirmComplete = async function() {
    const notes = document.getElementById('completion-notes').value || 'Manually completed';
    
    try {
        const { error } = await supabase
            .from('orders')
            .update({
                status: 'completed',
                completion_notes: notes,
                completed_at: new Date().toISOString()
            })
            .eq('id', selectedOrderId);
        
        if (error) throw error;
        
        alert('✅ Order marked as complete!');
        closeCompleteModal();
        await syncOrders();
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error: ' + error.message);
    }
};

async function sendShippingEmail(order, carrier, trackingNumber, estimatedDelivery) {
    const response = await fetch('/.netlify/functions/send-shipping-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            order: {
                ...order,
                tracking_number: trackingNumber,
                tracking_url: generateTrackingUrl(carrier, trackingNumber),
                shipping_carrier: carrier,
                estimated_delivery: estimatedDelivery
            }
        })
    });
    
    if (!response.ok) throw new Error('Failed to send email');
}

function generateTrackingUrl(carrier, trackingNumber) {
    const urls = {
        'USPS': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
        'UPS': `https://www.ups.com/track?tracknum=${trackingNumber}`,
        'FedEx': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
        'DHL': `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`
    };
    return urls[carrier] || '#';
}

// ============================================
// PRODUCTS
// ============================================
async function loadProducts() {
    try {
        const { data: products } = await supabase.from("products").select("*").eq("deleted", false).order("created_at", { ascending: false });
        allProducts = products || [];
        displayProducts();
    } catch (error) {
        console.error("Products error:", error);
    }
}

function displayProducts() {
    const grid = document.getElementById("products-grid");
    if (!grid) return;
    
    if (allProducts.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #6B7280;">No products yet. Click "Add Product" to create one.</p>';
        return;
    }
    
    grid.innerHTML = allProducts.map(product => {
        const mainImage = product.images?.[0] || product.image_url || "";
        const imageCount = product.images?.length || (product.image_url ? 1 : 0);
        const variantCount = product.variants?.length || 0;
        
        return `
        <div class="product-admin-card">
            <div style="position: relative;">
                <img src="${mainImage}" alt="${product.name}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px;">
                ${imageCount > 1 ? `<div style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">+${imageCount - 1}</div>` : ""}
                ${variantCount > 0 ? `<div style="position: absolute; bottom: 8px; left: 8px; background: rgba(59,130,246,0.9); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">${variantCount} variants</div>` : ""}
            </div>
            <h3>${product.name}</h3>
            <div class="price">$${parseFloat(product.price).toFixed(2)}${variantCount > 0 ? "+" : ""}</div>
            <div class="stock">${product.track_inventory === false ? "Unlimited" : product.stock + " in stock"}</div>
            <div class="product-admin-actions">
                <button class="btn-edit" onclick="editProduct(${product.id})">Edit</button>
                <button class="btn-delete" onclick="softDeleteProduct(${product.id})">Delete</button>
            </div>
        </div>
    `}).join("");
}

document.getElementById("add-product-btn")?.addEventListener("click", () => {
    showProductModal();
});

function showProductModal(product = null) {
    currentEditingProductId = product ? product.id : null;
    productImages = product?.images || [];
    productVariants = product?.variants || [];
    
    const modal = document.getElementById("product-modal");
    const title = document.getElementById("modal-title");
    
    title.textContent = product ? "Edit Product" : "Add Product";
    
    document.getElementById("product-name").value = product?.name || "";
    document.getElementById("product-description").value = product?.description || "";
    document.getElementById("product-price").value = product?.price || "";
    document.getElementById("product-stock").value = product?.stock || "";
    document.getElementById("product-status").value = product?.status || "active";
    document.getElementById("track-inventory").checked = product?.track_inventory !== false;
    
    updateImagesPreview();
    updateVariantsDisplay();
    
    modal.classList.add("active");
}

document.getElementById("close-modal")?.addEventListener("click", () => {
    document.getElementById("product-modal").classList.remove("active");
    currentEditingProductId = null;
    productImages = [];
    productVariants = [];
});

document.getElementById("product-images")?.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const uploadZone = document.querySelector('.image-upload-zone');
    const originalHTML = uploadZone.innerHTML;
    
    uploadZone.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 1rem; animation: spin 2s linear infinite;">⏳</div>
        <p style="font-weight: 600; color: #3B82F6;">Uploading ${files.length} image${files.length > 1 ? 's' : ''}...</p>
    `;
    
    for (const file of files) {
        try {
            const url = await uploadImage(file);
            productImages.push(url);
        } catch (error) {
            alert("Error uploading image: " + error.message);
        }
    }
    
    uploadZone.innerHTML = originalHTML;
    updateImagesPreview();
    e.target.value = "";
});

async function uploadImage(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `products/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);
    
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
    return data.publicUrl;
}

function updateImagesPreview() {
    const container = document.getElementById("images-preview");
    if (!container) return;
    
    if (productImages.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = productImages.map((url, index) => `
        <div class="image-preview-item ${index === 0 ? 'primary' : ''}">
            <img src="${url}" alt="Product image ${index + 1}">
            <button class="image-remove-btn" onclick="removeImage(${index})">×</button>
            ${index === 0 
                ? '<div class="image-primary-badge" style="position: absolute; bottom: 4px; left: 4px; right: 4px; background: rgba(59, 130, 246, 0.95); color: white; padding: 0.25rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; text-align: center;">✓ Primary</div>' 
                : `<button class="image-set-primary-btn" onclick="setPrimaryImage(${index})">Set as Primary</button>`
            }
        </div>
    `).join("");
}

window.removeImage = function(index) {
    productImages.splice(index, 1);
    updateImagesPreview();
};

window.setPrimaryImage = function(index) {
    const image = productImages.splice(index, 1)[0];
    productImages.unshift(image);
    updateImagesPreview();
};

document.getElementById("add-variant-btn")?.addEventListener("click", () => {
    productVariants.push({ name: "", price: "", stock: "" });
    updateVariantsDisplay();
});

function updateVariantsDisplay() {
    const container = document.getElementById("variants-container");
    if (!container) return;
    
    if (productVariants.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = productVariants.map((variant, index) => `
        <div class="variant-card">
            <div class="variant-inputs">
                <div class="form-group" style="margin: 0;">
                    <label style="font-size: 0.875rem;">Variant Name</label>
                    <input type="text" placeholder="e.g. Red, Large, 64GB" value="${variant.name}" onchange="updateVariant(${index}, 'name', this.value)" style="padding: 0.75rem;">
                </div>
                <div class="form-group" style="margin: 0;">
                    <label style="font-size: 0.875rem;">Price</label>
                    <input type="number" step="0.01" placeholder="99.99" value="${variant.price}" onchange="updateVariant(${index}, 'price', this.value)" style="padding: 0.75rem;">
                </div>
                <div class="form-group" style="margin: 0;">
                    <label style="font-size: 0.875rem;">Stock</label>
                    <input type="number" placeholder="0" value="${variant.stock}" onchange="updateVariant(${index}, 'stock', this.value)" style="padding: 0.75rem;">
                </div>
            </div>
            <button class="btn-delete" onclick="removeVariant(${index})" style="width: auto; padding: 0.5rem 1rem; margin-top: 0.5rem;">🗑️ Remove Variant</button>
        </div>
    `).join("");
}

window.updateVariant = function(index, field, value) {
    productVariants[index][field] = value;
};

window.removeVariant = function(index) {
    productVariants.splice(index, 1);
    updateVariantsDisplay();
};

document.getElementById("save-product-btn")?.addEventListener("click", async () => {
    const name = document.getElementById("product-name").value;
    const description = document.getElementById("product-description").value;
    const price = parseFloat(document.getElementById("product-price").value);
    const stock = parseInt(document.getElementById("product-stock").value);
    const status = document.getElementById("product-status").value;
    const trackInventory = document.getElementById("track-inventory").checked;
    
    if (!name || !price) {
        alert("Please fill in required fields (name and price)");
        return;
    }
    
    const productData = {
        name,
        description,
        price,
        stock: trackInventory ? stock : null,
        track_inventory: trackInventory,
        status,
        images: productImages,
        image_url: productImages[0] || null,
        variants: productVariants.length > 0 ? productVariants : null
    };
    
    try {
        if (currentEditingProductId) {
            await supabase.from("products").update(productData).eq("id", currentEditingProductId);
            alert("Product updated!");
        } else {
            await supabase.from("products").insert([productData]);
            alert("Product created!");
        }
        
        document.getElementById("product-modal").classList.remove("active");
        await loadProducts();
    } catch (error) {
        alert("Error: " + error.message);
    }
});

window.editProduct = async function(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (product) {
        showProductModal(product);
    }
};

window.softDeleteProduct = async function(productId) {
    if (!confirm("Delete this product?")) return;
    try {
        await supabase.from("products").update({ deleted: true, is_featured: false, featured_order: null }).eq("id", productId);
        alert("Product deleted!");
        await loadProducts();
    } catch (error) {
        alert("Error: " + error.message);
    }
};

// ============================================
// FEATURED PRODUCTS
// ============================================
async function loadFeaturedManager() {
    const container = document.getElementById("featured-products-manager");
    if (!container) return;
    
    container.innerHTML = '<p style="text-align: center; padding: 2rem;">Loading...</p>';
    
    try {
        const { data: products, error } = await supabase
            .from("products")
            .select("*")
            .eq("status", "active")
            .eq("deleted", false)
            .order("created_at", { ascending: false });
        
        if (error) throw error;
        
        if (!products || products.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #6B7280;">No active products. Create products first!</p>';
            return;
        }
        
        const featured = products.filter(p => p.is_featured === true).sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0));
        const available = products.filter(p => !p.is_featured);
        
        const featuredCount = featured.length;
        
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                <div>
                    <h3 style="margin-bottom: 1rem; color: #111827;">Featured Products (${featuredCount}/3)</h3>
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        ${featuredCount === 0 ? '<div style="background: #F9FAFB; padding: 2rem; border-radius: 8px; text-align: center; color: #6B7280;">No featured products. Click "Add" on products →</div>' : ''}
                        ${featured.map(p => `
                            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 1rem;">
                                <img src="${p.images?.[0] || p.image_url || ""}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                                <div style="flex: 1;">
                                    <strong>${p.name}</strong>
                                    <div style="color: #3B82F6; font-size: 1.125rem; font-weight: 600;">$${p.price.toFixed(2)}</div>
                                    <div style="color: #6B7280; font-size: 0.875rem;">Position: ${p.featured_order || "N/A"}</div>
                                </div>
                                <button class="btn btn-secondary" style="padding: 0.5rem 1rem;" onclick="removeFeaturedProduct(${p.id})">Remove</button>
                            </div>
                        `).join("")}
                    </div>
                </div>
                
                <div>
                    <h3 style="margin-bottom: 1rem; color: #111827;">Available Products</h3>
                    <div style="display: flex; flex-direction: column; gap: 1rem; max-height: 600px; overflow-y: auto;">
                        ${available.length === 0 ? '<div style="background: #F9FAFB; padding: 2rem; border-radius: 8px; text-align: center; color: #6B7280;">All products featured!</div>' : ''}
                        ${available.map(p => `
                            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 1rem;">
                                <img src="${p.images?.[0] || p.image_url || ""}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                                <div style="flex: 1;">
                                    <strong>${p.name}</strong>
                                    <div style="color: #3B82F6; font-size: 1.125rem; font-weight: 600;">$${p.price.toFixed(2)}</div>
                                </div>
                                <button class="btn btn-primary" style="padding: 0.5rem 1rem; ${featuredCount >= 3 ? "opacity: 0.5; cursor: not-allowed;" : ""}" ${featuredCount >= 3 ? "disabled" : ""} onclick="addFeaturedProduct(${p.id})">
                                    ${featuredCount >= 3 ? "Max (3)" : "Add"}
                                </button>
                            </div>
                        `).join("")}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Featured products error:", error);
        container.innerHTML = `<p style="color: #EF4444; text-align: center; padding: 2rem;">Error: ${error.message}</p>`;
    }
}

window.addFeaturedProduct = async function(productId) {
    try {
        const { data: current } = await supabase
            .from("products")
            .select("id")
            .eq("is_featured", true)
            .eq("status", "active")
            .eq("deleted", false);
        
        if (current && current.length >= 3) {
            alert("Maximum 3 featured products!");
            return;
        }
        
        const nextOrder = current ? current.length + 1 : 1;
        await supabase.from("products").update({ is_featured: true, featured_order: nextOrder }).eq("id", productId);
        await loadFeaturedManager();
    } catch (error) {
        alert("Error: " + error.message);
    }
};

window.removeFeaturedProduct = async function(productId) {
    try {
        await supabase.from("products").update({ is_featured: false, featured_order: null }).eq("id", productId);
        
        const { data: remaining } = await supabase
            .from("products")
            .select("*")
            .eq("is_featured", true)
            .eq("status", "active")
            .eq("deleted", false)
            .order("featured_order", { ascending: true });
        
        if (remaining) {
            for (let i = 0; i < remaining.length; i++) {
                await supabase.from("products").update({ featured_order: i + 1 }).eq("id", remaining[i].id);
            }
        }
        
        await loadFeaturedManager();
    } catch (error) {
        alert("Error: " + error.message);
    }
};

// ============================================
// CATEGORIES
// ============================================
async function loadCategories() {
    try {
        const { data: categories } = await supabase.from("categories").select("*").order("name");
        allCategories = categories || [];
        displayCategories();
    } catch (error) {
        console.error("Categories error:", error);
    }
}

function displayCategories() {
    const container = document.getElementById("categories-table");
    if (!container) return;
    
    if (allCategories.length === 0) {
        container.innerHTML = '<div style="background: white; padding: 2rem; border-radius: 8px; text-align: center; color: #6B7280;">No categories yet</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="admin-table">
            <table>
                <thead><tr><th>ID</th><th>Name</th><th>Actions</th></tr></thead>
                <tbody>
                    ${allCategories.map(cat => `
                        <tr>
                            <td>${cat.id}</td>
                            <td>${cat.name}</td>
                            <td>
                                <button class="btn-edit" onclick="editCategory(${cat.id})">Edit</button>
                                <button class="btn-delete" onclick="deleteCategory(${cat.id})">Delete</button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

document.getElementById("add-category-btn")?.addEventListener("click", () => {
    const name = prompt("Enter category name:");
    if (name) addCategory(name);
});

async function addCategory(name) {
    try {
        await supabase.from("categories").insert([{ name }]);
        alert("Category added!");
        await loadCategories();
    } catch (error) {
        alert("Error: " + error.message);
    }
}

window.editCategory = function(id) {
    const cat = allCategories.find(c => c.id === id);
    const newName = prompt("Edit category:", cat.name);
    if (newName && newName !== cat.name) updateCategory(id, newName);
};

async function updateCategory(id, name) {
    try {
        await supabase.from("categories").update({ name }).eq("id", id);
        alert("Updated!");
        await loadCategories();
    } catch (error) {
        alert("Error: " + error.message);
    }
}

window.deleteCategory = async function(id) {
    if (!confirm("Delete this category?")) return;
    try {
        await supabase.from("categories").delete().eq("id", id);
        alert("Deleted!");
        await loadCategories();
    } catch (error) {
        alert("Error: " + error.message);
    }
};

// ============================================
// TAGS
// ============================================
async function loadTags() {
    try {
        const { data: tags } = await supabase.from("tags").select("*").order("name");
        allTags = tags || [];
        displayTags();
    } catch (error) {
        console.error("Tags error:", error);
    }
}

function displayTags() {
    const container = document.getElementById("tags-table");
    if (!container) return;
    
    if (allTags.length === 0) {
        container.innerHTML = '<div style="background: white; padding: 2rem; border-radius: 8px; text-align: center; color: #6B7280;">No tags yet</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="admin-table">
            <table>
                <thead><tr><th>ID</th><th>Name</th><th>Actions</th></tr></thead>
                <tbody>
                    ${allTags.map(tag => `
                        <tr>
                            <td>${tag.id}</td>
                            <td>${tag.name}</td>
                            <td>
                                <button class="btn-edit" onclick="editTag(${tag.id})">Edit</button>
                                <button class="btn-delete" onclick="deleteTag(${tag.id})">Delete</button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

document.getElementById("add-tag-btn")?.addEventListener("click", () => {
    const name = prompt("Enter tag name:");
    if (name) addTag(name);
});

async function addTag(name) {
    try {
        await supabase.from("tags").insert([{ name }]);
        alert("Tag added!");
        await loadTags();
    } catch (error) {
        alert("Error: " + error.message);
    }
}

window.editTag = function(id) {
    const tag = allTags.find(t => t.id === id);
    const newName = prompt("Edit tag:", tag.name);
    if (newName && newName !== tag.name) updateTag(id, newName);
};

async function updateTag(id, name) {
    try {
        await supabase.from("tags").update({ name }).eq("id", id);
        alert("Updated!");
        await loadTags();
    } catch (error) {
        alert("Error: " + error.message);
    }
}

window.deleteTag = async function(id) {
    if (!confirm("Delete this tag?")) return;
    try {
        await supabase.from("tags").delete().eq("id", id);
        alert("Deleted!");
        await loadTags();
    } catch (error) {
        alert("Error: " + error.message);
    }
};

// Initialize
checkAuth();
