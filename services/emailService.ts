const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

if (!EMAILJS_PUBLIC_KEY) {
    console.error('❌ EmailJS not configured');
} else {
    emailjs.init(EMAILJS_PUBLIC_KEY);
}
