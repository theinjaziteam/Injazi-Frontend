// services/emailService.ts
import emailjs from '@emailjs/browser';

// Replace these with your actual values from EmailJS
const EMAILJS_SERVICE_ID = 'service_f1znoi8';   // From Email Services
const EMAILJS_TEMPLATE_ID = 'template_agifutn'; // From Email Templates
const EMAILJS_PUBLIC_KEY = '3WSYiB_ABD81mbxND';   // From Account > API Keys

emailjs.init(EMAILJS_PUBLIC_KEY);

export const emailService = {
    sendVerificationCode: async (toEmail: string, code: string, name: string): Promise<boolean> => {
        try {
            const response = await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                {
                    to_email: toEmail,
                    code: code,
                    name: name || 'there'
                }
            );
            console.log('✅ Email sent:', response.status);
            return true;
        } catch (error) {
            console.error('❌ Email failed:', error);
            return false;
        }
    }
};
