// Shorui Frontend JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Shorui application loaded');
    
    // Initialize tooltips and interactive elements
    initializeApp();
    
    // Add smooth transitions
    addPageTransitions();
    
    // Initialize mobile menu if exists
    initializeMobileMenu();
});

function initializeApp() {
    // Add loading states to buttons
    const buttons = document.querySelectorAll('button[type="submit"], .btn-loading');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.type === 'submit') {
                const form = this.closest('form');
                if (form && form.checkValidity()) {
                    addLoadingState(this);
                }
            }
        });
    });
    
    // Auto-hide alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert-auto-hide');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    });
    
    // Add copy to clipboard functionality
    initializeClipboard();
}

function addLoadingState(button) {
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
    
    // Remove loading state after 10 seconds (fallback)
    setTimeout(() => {
        button.disabled = false;
        button.innerHTML = originalText;
    }, 10000);
}

function addPageTransitions() {
    // Add fade-in effect to main content
    const mainContent = document.querySelector('main');
    if (mainContent) {
        mainContent.style.opacity = '0';
        mainContent.style.transition = 'opacity 0.3s ease-in-out';
        setTimeout(() => {
            mainContent.style.opacity = '1';
        }, 100);
    }
}

function initializeMobileMenu() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            const isOpen = mobileMenu.classList.contains('show');
            if (isOpen) {
                mobileMenu.classList.remove('show');
                mobileMenuButton.setAttribute('aria-expanded', 'false');
            } else {
                mobileMenu.classList.add('show');
                mobileMenuButton.setAttribute('aria-expanded', 'true');
            }
        });
    }
}

function initializeClipboard() {
    const copyButtons = document.querySelectorAll('.copy-to-clipboard');
    copyButtons.forEach(button => {
        button.addEventListener('click', async function() {
            const target = this.dataset.target;
            const text = document.querySelector(target)?.textContent;
            
            if (text) {
                try {
                    await navigator.clipboard.writeText(text);
                    showToast('Copied to clipboard!', 'success');
                } catch (err) {
                    showToast('Failed to copy to clipboard', 'error');
                }
            }
        });
    });
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white font-medium z-50 transition-all duration-300 transform translate-x-full`;
    
    // Set color based on type
    switch (type) {
        case 'success':
            toast.classList.add('bg-green-500');
            break;
        case 'error':
            toast.classList.add('bg-red-500');
            break;
        case 'warning':
            toast.classList.add('bg-yellow-500');
            break;
        default:
            toast.classList.add('bg-blue-500');
    }
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Utility functions
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export for use in other scripts
window.ShoruiApp = {
    showToast,
    addLoadingState,
    formatDate,
    formatTime,
    debounce
};