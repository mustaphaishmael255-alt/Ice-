// animations.js - Global Scroll Animation System

document.addEventListener("DOMContentLoaded", () => {
    initScrollAnimations();
});

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const animationObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("animate-in");
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, observerOptions);

    // Targets for animations
    const animationTargets = document.querySelectorAll(
        ".service-card, .footer-col, section > h1, .home .text, .home .grid, .about-content, .contact-container"
    );

    animationTargets.forEach(target => {
        // Assign default animation types if not specified
        if (!target.classList.contains("leftani") && 
            !target.classList.contains("rightani") && 
            !target.classList.contains("bottomani")) {
            target.classList.add("bottomani");
        }
        animationObserver.observe(target);
    });
}
