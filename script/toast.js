// toast.js - Global Notification System
export function showToast(message, type = 'success') {
    window.showToast(message, type);
}

// Global exposure for non-module scripts
window.showToast = function(message, type = 'success') {
    let container = document.getElementById('toast-container');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';

    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Fade in
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS dynamically
const style = document.createElement('style');
style.textContent = `
    #toast-container {
        position: fixed;
        bottom: 30px;
        right: 30px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .toast {
        background: white;
        padding: 15px 25px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        gap: 12px;
        transform: translateX(120%);
        transition: 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        border-left: 5px solid var(--main-color);
        min-width: 250px;
    }

    .toast.show { transform: translateX(0); }

    .toast.error { border-left-color: #f44336; }
    .toast.info { border-left-color: #2196f3; }

    .toast i { font-size: 1.2rem; }
    .toast.success i { color: #4caf50; }
    .toast.error i { color: #f44336; }
    .toast.info i { color: #2196f3; }

    .toast span { font-weight: 600; color: #333; font-size: 0.9rem; }

    [data-theme='dark'] .toast {
        background: #1e1e1e;
        color: white;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    [data-theme='dark'] .toast span { color: white; }
`;
document.head.appendChild(style);
