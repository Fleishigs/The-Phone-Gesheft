// FIXED Admin Dashboard - All Issues Resolved
let currentUser = null;
let allProducts = [];
let allOrders = [];
let allCategories = [];
let allTags = [];

// Login
document.getElementById("login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("admin-email").value;
    const password = document.getElementById("admin-password").value;
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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

// Check auth
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
        
        document.querySelectorAll(".menu-link").forEach(l => l.classList.remove("active"));
        e.target.classList.add("active");
        document.querySelectorAll(".admin-section").forEach(s => s.style.display = "none");
        document.getElementById(section + "-section").style.display = "block";
        
        if (section === "dashboard") await loadDashboard();
        else if (section === "products") await loadProducts();
        else if (section === "featured") await loadFeaturedManager();
        else if (section === "orders") await loadOrders();
        else if (section === "categories") await loadCategories();
        else if (section === "tags") await loadTags();
    });
});

// DASHBOARD
async function loadDashboard() {
    try {
        const { data: products } = await supabase.from("products").select("*").eq("deleted", false);
        const { data: orders } = await supabase.from("orders").select("*");
        
        allProducts = products || [];
        const totalProducts = allProducts.length;
        const activeProducts = allProducts.filter(p => p.status === "active").length;
        const totalOrders = orders ? orders.length : 0;
        
        let totalRevenue = 0;
        if (orders) orders.forEach(order => totalRevenue += parseFloat(order.total_price || 0));
        
        document.getElementById("stat-products").textContent = totalProducts;
        document.getElementById("stat-orders").textContent = totalOrders;
        document.getElementById("stat-revenue").textContent = "$" + totalRevenue.toFixed(2);
        document.getElementById("stat-active").textContent = activeProducts;
        
        displayRecentOrders(orders ? orders.slice(0, 5) : []);
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
                <thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Date</th><th>Status</th></tr></thead>
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

// PRODUCTS
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
                <img src="${mainImage}" alt="${product.name}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;">
                ${imageCount > 1 ? `<div style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">+${imageCount - 1}</div>` : ""}
                ${variantCount > 0 ? `<div style="position: absolute; bottom: 8px; left: 8px; background: rgba(59,130,246,0.9); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">${variantCount} variants</div>` : ""}
            </div>
            <h3>${product.name}</h3>
            <div class="price">$${parseFloat(product.price).toFixed(2)}${variantCount > 0 ? "+" : ""}</div>
            <div class="stock">${product.track_inventory === false ? "Unlimited" : product.stock + " in stock"}</div>
            <div class="product-admin-actions">
                <button class="btn-edit" onclick="alert('Edit feature coming soon')">Edit</button>
                <button class="btn-delete" onclick="softDeleteProduct(${product.id})">Delete</button>
            </div>
        </div>
    `}).join("");
}

window.softDeleteProduct = async function(productId) {
    if (!confirm("Delete this product?")) return;
    try {
        // Also unfeatured if it's featured
        await supabase.from("products").update({ deleted: true, is_featured: false, featured_order: null }).eq("id", productId);
        alert("Product deleted!");
        await loadProducts();
    } catch (error) {
        alert("Error: " + error.message);
    }
};

// ORDERS
async function loadOrders() {
    try {
        const { data: orders } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
        allOrders = orders || [];
        displayOrders();
    } catch (error) {
        console.error("Orders error:", error);
    }
}

function displayOrders() {
    const container = document.getElementById("orders-table");
    if (allOrders.length === 0) {
        container.innerHTML = '<div style="background: white; padding: 2rem; border-radius: 8px; text-align: center; color: #6B7280;">No orders yet</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="admin-table">
            <table>
                <thead><tr><th>Order ID</th><th>Customer</th><th>Email</th><th>Total</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                    ${allOrders.map(order => `
                        <tr>
                            <td>#${order.id}</td>
                            <td>${order.customer_name || "N/A"}</td>
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

// CATEGORIES
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

// TAGS
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

// FEATURED PRODUCTS MANAGER - FIXED
async function loadFeaturedManager() {
    const container = document.getElementById("featured-products-manager");
    container.innerHTML = '<p style="text-align: center; padding: 2rem;">Loading...</p>';
    
    try {
        // Get ONLY active, non-deleted products
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
        
        // Count ONLY active, non-deleted featured products
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
        // Count ONLY active, non-deleted featured products
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
        
        // Reorder remaining featured products (active & non-deleted only)
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

checkAuth();
