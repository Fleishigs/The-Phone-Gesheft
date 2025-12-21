// CLEAN ADMIN.JS - FEATURED PRODUCTS FIXED
let currentUser = null;
let allProducts = [];

// Login
document.getElementById("login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("admin-email").value;
    const password = document.getElementById("admin-password").value;
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("admin-dashboard").style.display = "block";
        await loadDashboard();
    } catch (error) {
        const errorDiv = document.getElementById("login-error");
        errorDiv.textContent = error.message;
        errorDiv.style.display = "block";
    }
});

// Logout
document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.reload();
});

// Check auth on load
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("admin-dashboard").style.display = "block";
        await loadDashboard();
    }
}

// Menu navigation
document.querySelectorAll(".menu-link").forEach(link => {
    link.addEventListener("click", async (e) => {
        e.preventDefault();
        const section = e.target.dataset.section;
        
        // Update active state
        document.querySelectorAll(".menu-link").forEach(l => l.classList.remove("active"));
        e.target.classList.add("active");
        
        // Hide all sections
        document.querySelectorAll(".admin-section").forEach(s => s.style.display = "none");
        
        // Show selected section
        document.getElementById(section + "-section").style.display = "block";
        
        // Load data for section
        if (section === "dashboard") await loadDashboard();
        else if (section === "products") await loadProducts();
        else if (section === "featured") await loadFeaturedManager();
        else if (section === "orders") await loadOrders();
        else if (section === "categories") await loadCategories();
        else if (section === "tags") await loadTags();
    });
});

// Load dashboard
async function loadDashboard() {
    try {
        const { data: products } = await supabase.from("products").select("*").eq("deleted", false);
        const { data: orders } = await supabase.from("orders").select("*");
        
        allProducts = products || [];
        const totalProducts = allProducts.length;
        const activeProducts = allProducts.filter(p => p.status === "active").length;
        const totalOrders = orders ? orders.length : 0;
        
        let totalRevenue = 0;
        if (orders) {
            orders.forEach(order => {
                totalRevenue += parseFloat(order.total_price || 0);
            });
        }
        
        document.getElementById("stat-products").textContent = totalProducts;
        document.getElementById("stat-orders").textContent = totalOrders;
        document.getElementById("stat-revenue").textContent = "$" + totalRevenue.toFixed(2);
        document.getElementById("stat-active").textContent = activeProducts;
        
        displayRecentOrders(orders ? orders.slice(0, 5) : []);
    } catch (error) {
        console.error("Error loading dashboard:", error);
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
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

// Load products (stub for now)
async function loadProducts() {
    document.getElementById("products-grid").innerHTML = '<p style="padding: 2rem; text-align: center;">Products section - working on it...</p>';
}

// Load orders (stub for now)
async function loadOrders() {
    document.getElementById("orders-table").innerHTML = '<p style="padding: 2rem; text-align: center;">Orders section - working on it...</p>';
}

// Load categories (stub for now)
async function loadCategories() {
    document.getElementById("categories-table").innerHTML = '<p style="padding: 2rem; text-align: center;">Categories section - working on it...</p>';
}

// Load tags (stub for now)
async function loadTags() {
    document.getElementById("tags-table").innerHTML = '<p style="padding: 2rem; text-align: center;">Tags section - working on it...</p>';
}

// FEATURED PRODUCTS MANAGER - THE MAIN THING TO FIX
async function loadFeaturedManager() {
    const container = document.getElementById("featured-products-manager");
    container.innerHTML = '<p style="text-align: center; padding: 2rem;">Loading...</p>';
    
    try {
        // Get all active products
        const { data: products, error } = await supabase
            .from("products")
            .select("*")
            .eq("status", "active")
            .eq("deleted", false)
            .order("created_at", { ascending: false });
        
        if (error) throw error;
        
        if (!products || products.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #6B7280;">No active products available. Create some products first!</p>';
            return;
        }
        
        // Split into featured and available
        const featured = products.filter(p => p.is_featured === true).sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0));
        const available = products.filter(p => !p.is_featured);
        
        // Render UI
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                <!-- Featured Products (Left) -->
                <div>
                    <h3 style="margin-bottom: 1rem; color: #111827; font-size: 1.25rem;">Featured Products (${featured.length}/3)</h3>
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        ${featured.length === 0 ? 
                            '<div style="background: #F9FAFB; padding: 2rem; border-radius: 8px; text-align: center; color: #6B7280;">No featured products yet. Click "Add" on products from the right side.</div>' 
                            : ''}
                        ${featured.map(product => `
                            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 1rem;">
                                <img src="${product.images?.[0] || product.image_url || ''}" 
                                     style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; background: #f3f4f6;">
                                <div style="flex: 1;">
                                    <strong style="display: block; margin-bottom: 0.25rem; color: #111827;">${product.name}</strong>
                                    <div style="color: #3B82F6; font-size: 1.125rem; font-weight: 600;">$${parseFloat(product.price).toFixed(2)}</div>
                                    <div style="color: #6B7280; font-size: 0.875rem; margin-top: 0.25rem;">Position: ${product.featured_order || 'N/A'}</div>
                                </div>
                                <button onclick="removeFeaturedProduct(${product.id})" 
                                        class="btn btn-secondary" 
                                        style="padding: 0.5rem 1rem; white-space: nowrap;">
                                    Remove
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Available Products (Right) -->
                <div>
                    <h3 style="margin-bottom: 1rem; color: #111827; font-size: 1.25rem;">Available Products</h3>
                    <div style="display: flex; flex-direction: column; gap: 1rem; max-height: 600px; overflow-y: auto;">
                        ${available.length === 0 ? 
                            '<div style="background: #F9FAFB; padding: 2rem; border-radius: 8px; text-align: center; color: #6B7280;">All products are already featured!</div>' 
                            : ''}
                        ${available.map(product => `
                            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 1rem;">
                                <img src="${product.images?.[0] || product.image_url || ''}" 
                                     style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; background: #f3f4f6;">
                                <div style="flex: 1;">
                                    <strong style="display: block; margin-bottom: 0.25rem; color: #111827;">${product.name}</strong>
                                    <div style="color: #3B82F6; font-size: 1.125rem; font-weight: 600;">$${parseFloat(product.price).toFixed(2)}</div>
                                </div>
                                <button onclick="addFeaturedProduct(${product.id})" 
                                        class="btn btn-primary" 
                                        style="padding: 0.5rem 1rem; white-space: nowrap; ${featured.length >= 3 ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
                                        ${featured.length >= 3 ? 'disabled' : ''}>
                                    ${featured.length >= 3 ? 'Max (3)' : 'Add'}
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error("Error loading featured products:", error);
        container.innerHTML = `<p style="text-align: center; padding: 2rem; color: #EF4444;">Error loading featured products: ${error.message}</p>`;
    }
}

// Add product to featured
window.addFeaturedProduct = async function(productId) {
    try {
        // Check current count
        const { data: currentFeatured } = await supabase
            .from("products")
            .select("id")
            .eq("is_featured", true);
        
        if (currentFeatured && currentFeatured.length >= 3) {
            alert("Maximum 3 featured products allowed! Remove one first.");
            return;
        }
        
        // Calculate next order
        const nextOrder = currentFeatured ? currentFeatured.length + 1 : 1;
        
        // Update product
        const { error } = await supabase
            .from("products")
            .update({
                is_featured: true,
                featured_order: nextOrder
            })
            .eq("id", productId);
        
        if (error) throw error;
        
        // Reload the manager
        await loadFeaturedManager();
        
    } catch (error) {
        console.error("Error adding featured product:", error);
        alert("Error adding featured product: " + error.message);
    }
};

// Remove product from featured
window.removeFeaturedProduct = async function(productId) {
    try {
        // Remove featured status
        const { error } = await supabase
            .from("products")
            .update({
                is_featured: false,
                featured_order: null
            })
            .eq("id", productId);
        
        if (error) throw error;
        
        // Reorder remaining featured products
        const { data: remaining } = await supabase
            .from("products")
            .select("*")
            .eq("is_featured", true)
            .order("featured_order", { ascending: true });
        
        if (remaining && remaining.length > 0) {
            for (let i = 0; i < remaining.length; i++) {
                await supabase
                    .from("products")
                    .update({ featured_order: i + 1 })
                    .eq("id", remaining[i].id);
            }
        }
        
        // Reload the manager
        await loadFeaturedManager();
        
    } catch (error) {
        console.error("Error removing featured product:", error);
        alert("Error removing featured product: " + error.message);
    }
};

// Initialize
checkAuth();
