// COMPLETE Admin Dashboard - Full CRUD with Image Upload & Variants
let currentUser = null;
let allProducts = [];
let allOrders = [];
let allCategories = [];
let allTags = [];
let productImages = [];
let productVariants = [];
let currentEditingProductId = null;

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

// Add Product Button
document.getElementById("add-product-btn")?.addEventListener("click", () => {
    showProductModal();
});

// Show Product Modal
function showProductModal(product = null) {
    currentEditingProductId = product ? product.id : null;
    productImages = product?.images || [];
    productVariants = product?.variants || [];
    
    const modal = document.getElementById("product-modal");
    const title = document.getElementById("modal-title");
    
    title.textContent = product ? "Edit Product" : "Add Product";
    
    // Fill form
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

// Close Modal
document.getElementById("close-modal")?.addEventListener("click", () => {
    document.getElementById("product-modal").classList.remove("active");
    currentEditingProductId = null;
    productImages = [];
    productVariants = [];
});

// Image Upload
document.getElementById("product-images")?.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const uploadZone = document.querySelector('.image-upload-zone');
    const originalHTML = uploadZone.innerHTML;
    
    uploadZone.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 1rem; animation: spin 2s linear infinite;">⏳</div>
        <p style="font-weight: 600; color: #3B82F6;">Uploading ${files.length} image${files.length > 1 ? 's' : ''}...</p>
        <p style="font-size: 0.875rem; color: #6B7280; margin-top: 0.5rem;">Please wait</p>
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
    if (productImages.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = productImages.map((url, index) => `
        <div class="image-preview-item ${index === 0 ? 'primary' : ''}">
            <img src="${url}" alt="Product image ${index + 1}">
            <button class="image-remove-btn" onclick="removeImage(${index})">×</button>
            ${index === 0 
                ? '<div class="image-primary-badge">✓ Primary Image</div>' 
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

// Variants
document.getElementById("add-variant-btn")?.addEventListener("click", () => {
    productVariants.push({ name: "", price: "", stock: "" });
    updateVariantsDisplay();
});

function updateVariantsDisplay() {
    const container = document.getElementById("variants-container");
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
            <button class="variant-remove-btn" onclick="removeVariant(${index})">🗑️ Remove Variant</button>
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

// Save Product
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
            // Update
            await supabase.from("products").update(productData).eq("id", currentEditingProductId);
            alert("Product updated!");
        } else {
            // Create
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

checkAuth();
