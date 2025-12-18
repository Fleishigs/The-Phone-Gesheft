// Homepage functionality

async function loadFeaturedProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('status', 'active')
            .gt('stock', 0)
            .order('created_at', { ascending: false })
            .limit(6);

        if (error) throw error;

        const grid = document.getElementById('featured-grid');
        if (!grid) return;

        if (data && data.length > 0) {
            grid.innerHTML = data.map(product => createProductCard(product)).join('');
        } else {
            grid.innerHTML = '<p style="text-align: center; color: #6B7280; grid-column: 1 / -1;">No products available yet.</p>';
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function createProductCard(product) {
    const images = product.images && product.images.length > 0 ? product.images : [product.image_url];
    const mainImage = images[0];
    
    return `
        <div class="product-card">
            <div class="product-image-container" onclick="window.location.href='/product?id=${product.id}'" style="cursor: pointer;">
                <img src="${mainImage}" alt="${product.name}" class="product-image">
            </div>
            <div class="product-info">
                <h3 class="product-name" onclick="window.location.href='/product?id=${product.id}'" style="cursor: pointer;">${product.name}</h3>
                <p class="product-description">${truncateText(product.description, 80)}</p>
                <div class="product-price">$${product.price.toFixed(2)}</div>
                <div class="product-stock">${product.stock} in stock</div>
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
