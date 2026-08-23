/**
 * GSAP Animations & ScrollTrigger Effects
 * All content is visible by default - animations only add motion effects
 */

class Animations {
    constructor() {
        this.isLoaded = false;
        this.init();
    }

    init() {
        // Start typewriter immediately
        this.typeWriter();

        // Hide loader immediately
        this.hideLoader();

        // Check if GSAP is available
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
            console.warn('GSAP or ScrollTrigger not loaded');
            return;
        }

        // Register ScrollTrigger plugin
        gsap.registerPlugin(ScrollTrigger);

        // Set default ease
        gsap.defaults({
            ease: 'power3.out',
            duration: 0.8
        });

        this.isLoaded = true;
        this.initAllAnimations();
    }

    hideLoader() {
        const loader = document.querySelector('.loader');
        if (loader) {
            // Hide loader after a short delay
            setTimeout(() => {
                loader.classList.add('hidden');
            }, 1500);
        }
    }

    initAllAnimations() {
        // Only run simple motion animations - no opacity changes
        this.animateSkillBars();
        this.initCounters();
    }

    typeWriter() {
        const typingText = document.querySelector('.typing-text');
        if (!typingText) return;

        const texts = [
            'Vipul Rathod',
            'Python Developer',
            'Team Lead',
            'AI/LLM Expert',
            'Full Stack Developer',
            'Problem Solver'
        ];

        // Ensure the text is visible immediately
        typingText.textContent = texts[0];

        let textIndex = 0;
        let charIndex = texts[0].length;
        let isDeleting = true;
        let typeSpeed = 100;

        function type() {
            const currentText = texts[textIndex];

            if (isDeleting) {
                typingText.textContent = currentText.substring(0, charIndex - 1);
                charIndex--;
                typeSpeed = 50;
            } else {
                typingText.textContent = currentText.substring(0, charIndex + 1);
                charIndex++;
                typeSpeed = 100;
            }

            if (!isDeleting && charIndex === currentText.length) {
                typeSpeed = 2000;
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                textIndex = (textIndex + 1) % texts.length;
                typeSpeed = 500;
            }

            setTimeout(type, typeSpeed);
        }

        // Start with shorter delay - content already visible
        setTimeout(type, 1500);
    }

    animateSkillBars() {
        const skillBars = document.querySelectorAll('.skill-bar');

        skillBars.forEach((bar) => {
            const level = bar.dataset.level;
            const fill = bar.querySelector('.skill-fill');

            if (fill && level) {
                // Set initial width
                fill.style.width = '0%';

                gsap.to(fill, {
                    scrollTrigger: {
                        trigger: bar,
                        start: 'top 90%',
                        toggleActions: 'play none none none'
                    },
                    width: `${level}%`,
                    duration: 1.5,
                    ease: 'power3.out'
                });
            }
        });
    }

    initCounters() {
        const counters = document.querySelectorAll('.stat-number[data-count]');

        counters.forEach((counter) => {
            const target = parseInt(counter.dataset.count);
            // Ensure the number is visible
            counter.textContent = target;
        });
    }

    refresh() {
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.refresh();
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.animations = new Animations();
});
