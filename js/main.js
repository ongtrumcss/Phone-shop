// ========== UTILITIES ==========
// Format price to VND
const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
};

// Debounce function to prevent multiple rapid calls
const debounce = (func, wait) => {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};

// Show toast notifications
const showToast = (message, type = 'success') => {
    const toast = $(`
        <div class="toast-notification ${type}">
            <div class="toast-icon">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            </div>
            <div class="toast-message">${message}</div>
        </div>
    `).hide();
    
    $('body').append(toast);
    toast.fadeIn(300);
    
    setTimeout(() => toast.fadeOut(300, () => toast.remove()), 3000);
};

// ========== LOADING ANIMATION ==========
$(window).on('load', () => {
    $('.loading').fadeOut(800, () => {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true
        });
    });
});

// ========== SCROLL EFFECTS ==========
$(window).scroll(debounce(function() {
    // Navbar effect
    if ($(this).scrollTop() > 50) {
        $('.navbar').addClass('navbar-scrolled');
    } else {
        $('.navbar').removeClass('navbar-scrolled');
    }
    
    // Back to top button
    if ($(this).scrollTop() > 200) {
        $('#back-to-top').fadeIn();
    } else {
        $('#back-to-top').fadeOut();
    }
}, 100));

$('#back-to-top').click(() => {
    $('html, body').animate({scrollTop: 0}, 800);
    return false;
});

// ========== CART FUNCTIONALITY ==========
const cart = {
    items: [],
    
    init() {
        this.loadCart();
        this.bindEvents();
    },
    
    bindEvents() {
        // Add to cart
        $(document).on('click', '.add-to-cart', (e) => {
            const btn = $(e.currentTarget);
            const productId = btn.data('product-id');
            const product = this.getProductDetails(productId);
            
            if (product) {
                btn.prop('disabled', true)
                   .html('<span class="spinner-border spinner-border-sm"></span> Đang thêm...');
                
                setTimeout(() => {
                    this.addItem(product);
                    btn.prop('disabled', false)
                       .html('<i class="fas fa-shopping-cart"></i> Thêm vào giỏ');
                }, 500);
            }
        });
        
        // Update quantity
        $(document).on('click', '.quantity-btn', (e) => {
            const btn = $(e.currentTarget);
            const id = btn.data('id');
            const action = btn.data('action');
            this.updateQuantity(id, action);
        });
        
        // Remove item
        $(document).on('click', '.remove-item', (e) => {
            const id = $(e.currentTarget).data('id');
            this.removeItem(id);
        });
        
        // Clear cart
        $(document).on('click', '#clear-cart', () => {
            if (confirm('Bạn có chắc muốn xóa toàn bộ giỏ hàng?')) {
                this.clearCart();
            }
        });
        
        // Apply promo code
        $('#apply-promo').click(() => {
            const code = $('#promo-code').val().trim();
            this.applyPromoCode(code);
        });
    },
    
    getProductDetails(id) {
        const card = $(`[data-product-id="${id}"]`).closest('.product-card');
        if (card.length) {
            return {
                id: id,
                name: card.find('.card-title').text(),
                price: parseInt(card.data('price')),
                image: card.find('img').attr('src'),
                color: $('.color-options .active').data('color') || 'Mặc định',
                storage: $('.storage-options .active').text() || 'Mặc định',
                quantity: parseInt($('#quantity').val() || 1)
            };
        }
        return null;
    },
    
    addItem(product) {
        const existingItem = this.items.find(item => 
            item.id === product.id && 
            item.color === product.color && 
            item.storage === product.storage
        );
        
        if (existingItem) {
            existingItem.quantity = Math.min(existingItem.quantity + product.quantity, 10);
            showToast('Đã cập nhật số lượng sản phẩm');
        } else {
            this.items.push({...product, quantity: Math.min(product.quantity, 10)});
            showToast('Đã thêm sản phẩm vào giỏ hàng');
        }
        
        this.saveCart();
        this.updateUI();
    },
    
    updateQuantity(id, action) {
        const item = this.items.find(item => item.id === id);
        if (item) {
            if (action === 'increase' && item.quantity < 10) {
                item.quantity++;
            } else if (action === 'decrease' && item.quantity > 1) {
                item.quantity--;
            }
            this.saveCart();
            this.updateUI();
        }
    },
    
    removeItem(id) {
        const index = this.items.findIndex(item => item.id === id);
        if (index !== -1) {
            $(`#cart-item-${id}`).fadeOut(300, () => {
                this.items.splice(index, 1);
                this.saveCart();
                this.updateUI();
                showToast('Đã xóa sản phẩm khỏi giỏ hàng');
            });
        }
    },
    
    clearCart() {
        this.items = [];
        this.saveCart();
        this.updateUI();
        showToast('Đã xóa toàn bộ giỏ hàng');
    },
    
    applyPromoCode(code) {
        const validCodes = {
            'WELCOME10': 10,
            'SUMMER20': 20,
            'SPECIAL30': 30
        };
        
        if (validCodes[code]) {
            this.promoDiscount = validCodes[code];
            showToast(`Đã áp dụng mã giảm giá ${this.promoDiscount}%`);
        } else {
            this.promoDiscount = 0;
            showToast('Mã giảm giá không hợp lệ', 'error');
        }
        
        this.updateUI();
    },
    
    calculateTotals() {
        const subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const promoDiscount = (subtotal * (this.promoDiscount || 0)) / 100;
        const shipping = subtotal > 1000000 ? 0 : 30000;
        const total = subtotal - promoDiscount + shipping;
        
        return { subtotal, promoDiscount, shipping, total };
    },
    
    saveCart() {
        localStorage.setItem('cart', JSON.stringify({
            items: this.items,
            promoDiscount: this.promoDiscount
        }));
    },
    
    loadCart() {
        const savedCart = JSON.parse(localStorage.getItem('cart') || '{"items":[]}');
        this.items = savedCart.items;
        this.promoDiscount = savedCart.promoDiscount;
        this.updateUI();
    },
    
    updateUI() {
        // Update cart count
        const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
        $('.cart-count').text(totalItems);
        
        // Update cart items display
        const cartContainer = $('.cart-items');
        if (cartContainer.length) {
            cartContainer.empty();
            
            if (this.items.length === 0) {
                cartContainer.html(`
                    <div class="text-center py-5">
                        <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                        <h5>Giỏ hàng trống</h5>
                        <a href="products.html" class="btn btn-primary mt-3">
                            <i class="fas fa-shopping-bag"></i> Tiếp tục mua sắm
                        </a>
                    </div>
                `);
                $('.cart-summary').hide();
            } else {
                this.items.forEach(item => {
                    cartContainer.append(this.renderCartItem(item));
                });
                $('.cart-summary').show();
            }
            
            // Update totals
            const { subtotal, promoDiscount, shipping, total } = this.calculateTotals();
            $('.cart-subtotal').text(formatPrice(subtotal));
            $('.cart-discount').text(formatPrice(promoDiscount));
            $('.cart-shipping').text(formatPrice(shipping));
            $('.cart-total').text(formatPrice(total));
        }
    },
    
    renderCartItem(item) {
        return `
            <div class="card mb-3" id="cart-item-${item.id}">
                <div class="row g-0">
                    <div class="col-md-2">
                        <img src="${item.image}" class="img-fluid rounded" alt="${item.name}">
                    </div>
                    <div class="col-md-7">
                        <div class="card-body">
                            <h5 class="card-title">${item.name}</h5>
                            <p class="card-text">
                                <small class="text-muted">
                                    ${item.storage} - ${item.color}
                                </small>
                            </p>
                            <div class="quantity-controls">
                                <button class="btn btn-sm btn-outline-secondary quantity-btn" 
                                        data-id="${item.id}" data-action="decrease">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <input type="number" class="form-control form-control-sm quantity-input" 
                                       value="${item.quantity}" min="1" max="10" readonly>
                                <button class="btn btn-sm btn-outline-secondary quantity-btn"
                                        data-id="${item.id}" data-action="increase">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card-body text-end">
                            <h5 class="card-title price-tag">
                                ${formatPrice(item.price * item.quantity)}
                            </h5>
                            <button class="btn btn-sm btn-danger remove-item"
                                    data-id="${item.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};

// ========== PRODUCT FILTERS ==========
const productFilter = {
    init() {
        this.bindEvents();
        this.updateURL();
    },
    
    bindEvents() {
        // Search input
        $('#search-input').on('input', debounce(() => this.filterProducts(), 300));
        
        // Price range
        $('#price-range').on('input', debounce(() => {
            const value = $('#price-range').val();
            $('#price-value').text(formatPrice(value));
            this.filterProducts();
        }, 300));
        
        // Brand & RAM filters
        $('input[name="brand"], input[name="ram"]').change(() => this.filterProducts());
        
        // Sort options
        $('#sort-select').change(() => this.filterProducts());
    },
    
    filterProducts() {
        const searchQuery = $('#search-input').val().toLowerCase();
        const maxPrice = parseInt($('#price-range').val());
        const selectedBrands = $('input[name="brand"]:checked').map((_, el) => $(el).val()).get();
        const selectedRam = $('input[name="ram"]:checked').map((_, el) => $(el).val()).get();
        const sortBy = $('#sort-select').val();
        
        $('.product-card').each((_, card) => {
            const $card = $(card);
            const title = $card.find('.card-title').text().toLowerCase();
            const price = parseInt($card.data('price'));
            const brand = $card.data('brand');
            const ram = $card.data('ram');
            
            let isVisible = true;
            
            // Apply filters
            if (searchQuery && !title.includes(searchQuery)) isVisible = false;
            if (maxPrice && price > maxPrice) isVisible = false;
            if (selectedBrands.length && !selectedBrands.includes(brand)) isVisible = false;
            if (selectedRam.length && !selectedRam.includes(ram)) isVisible = false;
            
            $card.parent()[isVisible ? 'show' : 'hide']();
        });
        
        // Apply sorting
        const productContainer = $('.product-grid');
        const products = productContainer.children().toArray();
        
        products.sort((a, b) => {
            const priceA = parseInt($(a).find('.product-card').data('price'));
            const priceB = parseInt($(b).find('.product-card').data('price'));
            
            switch(sortBy) {
                case 'price-asc': return priceA - priceB;
                case 'price-desc': return priceB - priceA;
                case 'name-asc': return $(a).find('.card-title').text().localeCompare($(b).find('.card-title').text());
                case 'name-desc': return $(b).find('.card-title').text().localeCompare($(a).find('.card-title').text());
                default: return 0;
            }
        });
        
        productContainer.append(products);
        this.updateURL();
    },
    
    updateURL() {
        const params = new URLSearchParams(window.location.search);
        
        const search = $('#search-input').val();
        const maxPrice = $('#price-range').val();
        const brands = $('input[name="brand"]:checked').map((_, el) => $(el).val()).get();
        const rams = $('input[name="ram"]:checked').map((_, el) => $(el).val()).get();
        const sort = $('#sort-select').val();
        
        if (search) params.set('search', search);
        if (maxPrice) params.set('price', maxPrice);
        if (brands.length) params.set('brands', brands.join(','));
        if (rams.length) params.set('rams', rams.join(','));
        if (sort) params.set('sort', sort);
        
        window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
    }
};

// ========== CHECKOUT FUNCTIONALITY ==========
const checkout = {
    init() {
        this.bindEvents();
        this.loadProvinces();
    },
    
    bindEvents() {
        // Form validation
        $('#checkout-form').on('submit', (e) => {
            e.preventDefault();
            if (this.validateForm()) {
                this.processOrder();
            }
        });
        
        // Province/District selection
        $('#province').change(() => this.loadDistricts());
        
        // Payment method selection
        $('input[name="payment"]').change(() => this.togglePaymentFields());
    },
    
    async loadProvinces() {
        try {
            const response = await fetch('https://provinces.open-api.vn/api/p/');
            const provinces = await response.json();
            
            const options = provinces.map(p => 
                `<option value="${p.code}">${p.name}</option>`
            ).join('');
            
            $('#province').html('<option value="">Chọn tỉnh/thành</option>' + options);
        } catch (error) {
            console.error('Error loading provinces:', error);
        }
    },
    
    async loadDistricts() {
        const provinceCode = $('#province').val();
        if (!provinceCode) return;
        
        try {
            const response = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
            const province = await response.json();
            
            const options = province.districts.map(d => 
                `<option value="${d.code}">${d.name}</option>`
            ).join('');
            
            $('#district').html('<option value="">Chọn quận/huyện</option>' + options)
                         .prop('disabled', false);
        } catch (error) {
            console.error('Error loading districts:', error);
        }
    },
    
    validateForm() {
        let isValid = true;
        const requiredFields = [
            'fullname',
            'email',
            'phone',
            'address',
            'province',
            'district'
        ];
        
        // Clear previous errors
        $('.is-invalid').removeClass('is-invalid');
        $('.invalid-feedback').remove();
        
        // Check required fields
        requiredFields.forEach(field => {
            const input = $(`#${field}`);
            if (!input.val().trim()) {
                this.showError(input, 'Vui lòng điền thông tin này');
                isValid = false;
            }
        });
        
        // Validate email
        const email = $('#email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.val())) {
            this.showError(email, 'Email không hợp lệ');
            isValid = false;
        }
        
        // Validate phone (Vietnam format)
        const phone = $('#phone');
        const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
        if (!phoneRegex.test(phone.val())) {
            this.showError(phone, 'Số điện thoại không hợp lệ');
            isValid = false;
        }
        
        return isValid;
    },
    
    showError(input, message) {
        input.addClass('is-invalid')
             .after(`<div class="invalid-feedback">${message}</div>`);
    },
    
    togglePaymentFields() {
        const method = $('input[name="payment"]:checked').val();
        $('.payment-fields').hide();
        $(`#${method}-fields`).show();
    },
    
    processOrder() {
        const submitBtn = $('#checkout-button');
        submitBtn.prop('disabled', true)
                .html('<span class="spinner-border spinner-border-sm"></span> Đang xử lý...');
        
        // Simulate order processing
        setTimeout(() => {
            const order = {
                items: cart.items,
                totals: cart.calculateTotals(),
                customer: {
                    fullname: $('#fullname').val(),
                    email: $('#email').val(),
                    phone: $('#phone').val(),
                    address: $('#address').val(),
                    province: $('#province option:selected').text(),
                    district: $('#district option:selected').text(),
                    notes: $('#notes').val()
                },
                payment: {
                    method: $('input[name="payment"]:checked').val(),
                    details: this.getPaymentDetails()
                },
                orderDate: new Date()
            };
            
            // Here you would typically send the order to your server
            console.log('Order placed:', order);
            
            // Clear cart and redirect to success page
            cart.clearCart();
            window.location.href = 'order-success.html';
        }, 2000);
    },
    
    getPaymentDetails() {
        const method = $('input[name="payment"]:checked').val();
        switch (method) {
            case 'card':
                return {
                    cardNumber: $('#card-number').val(),
                    cardName: $('#card-name').val(),
                    expiry: $('#card-expiry').val(),
                    cvv: $('#card-cvv').val()
                };
            case 'banking':
                return {
                    bank: $('#bank-select').val(),
                    accountNumber: $('#account-number').val()
                };
            default:
                return {};
        }
    }
};

// ========== INITIALIZE ==========
$(document).ready(() => {
    // Initialize components
    cart.init();
    productFilter.init();
    checkout.init();
    
    // Initialize tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();
    
    // Initialize quantity inputs
    $('.quantity-input').on('input', function() {
        const value = $(this).val();
        if (value < 1) $(this).val(1);
        if (value > 10) $(this).val(10);
    });
    
    // Product gallery
    $('.product-thumbnail').click(function() {
        const newSrc = $(this).attr('src');
        $('#main-product-image').fadeOut(300, function() {
            $(this).attr('src', newSrc).fadeIn(300);
        });
    });
    
    // Newsletter subscription
    $('#newsletter-form').submit((e) => {
        e.preventDefault();
        const email = $('#newsletter-email').val();
        if (email) {
            showToast('Cảm ơn bạn đã đăng ký nhận tin!');
            $('#newsletter-email').val('');
        }
    });
});

