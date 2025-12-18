// Homepage functionality

async function loadFeaturedProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('status', 'active')
            .eq('is_featured', true)
            .order('featured_order', { ascending: true })
            .limit(3);

        if (error) throw error;

        const grid = document.getElementById('featured-grid');
        if (!grid) return;

        if (data && data.length > 0) {
            grid.innerHTML = data.map(product => createProductCard(product)).join('');
        } else {
            grid.innerHTML = '<p style="text-align: center; color: #6B7280; grid-column: 1 / -1;">No featured products yet. Set them in the admin dashboard.</p>';
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function createProductCard(product) {
    // Handle missing images safely
    let mainImage = '';
    if (product.images && product.images.length > 0 && product.images[0]) {
        mainImage = product.images[0];
    } else if (product.image_url && product.image_url !== 'null' && product.image_url !== '') {
        mainImage = product.image_url;
    } else {
        mainImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24"%3ENo Image%3C/text%3E%3C/svg%3E';
    }
    
    return `
        <div class="product-card">
            <div class="product-image-container" onclick="window.location.href='/product?id=${product.id}'" style="cursor: pointer;">
                <img src="${mainImage}" alt="${product.name}" class="product-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22%3E%3Crect fill=%22%23ddd%22 width=%22400%22 height=%22400%22/%3E%3Ctext fill=%22%23999%22 x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2224%22%3ENo Image%3C/text%3E%3C/svg%3E'">
            </div>
            <div class="product-info">
                <h3 class="product-name" onclick="window.location.href='/product?id=${product.id}'" style="cursor: pointer;">${product.name}</h3>
                <p class="product-description">${truncateText(product.description, 80)}</p>
                <div class="product-price">$${product.price.toFixed(2)}</div>
            </div>
        </div>
    `;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Testimonials Slider
let currentTestimonial = 0;
const testimonialCards = document.querySelectorAll('.testimonial-card');
const totalTestimonials = testimonialCards.length;

function slideTestimonial(direction) {
    if (testimonialCards.length === 0) return;
    
    testimonialCards[currentTestimonial].classList.remove('active');
    
    currentTestimonial += direction;
    
    if (currentTestimonial >= totalTestimonials) {
        currentTestimonial = 0;
    } else if (currentTestimonial < 0) {
        currentTestimonial = totalTestimonials - 1;
    }
    
    testimonialCards[currentTestimonial].classList.add('active');
    updateDots();
}

function goToTestimonial(index) {
    testimonialCards[currentTestimonial].classList.remove('active');
    currentTestimonial = index;
    testimonialCards[currentTestimonial].classList.add('active');
    updateDots();
}

function updateDots() {
    const dotsContainer = document.getElementById('slider-dots');
    if (!dotsContainer) return;
    
    dotsContainer.innerHTML = Array.from({length: totalTestimonials}, (_, i) => 
        `<span class="dot ${i === currentTestimonial ? 'active' : ''}" onclick="goToTestimonial(${i})"></span>`
    ).join('');
}

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = count;
    });
}

// Initialize
if (document.getElementById('featured-grid')) {
    loadFeaturedProducts();
}

if (testimonialCards.length > 0) {
    updateDots();
    setInterval(() => slideTestimonial(1), 5000);
}

updateCartCount();
