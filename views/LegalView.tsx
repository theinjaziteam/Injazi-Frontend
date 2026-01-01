// views/LegalView.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView } from '../types';
import { Icons } from '../components/UIComponents';

type LegalTab = 'terms' | 'privacy';

export default function LegalView() {
    const { setView } = useApp();
    const [activeTab, setActiveTab] = useState<LegalTab>('terms');
    
    // FIX #34: Scroll progress tracking
    const [scrollProgress, setScrollProgress] = useState(0);
    const [showScrollHint, setShowScrollHint] = useState(true);
    const contentRef = useRef<HTMLDivElement>(null);

    const lastUpdated = "December 30, 2024";

    // FIX #34: Calculate scroll progress
    const handleScroll = useCallback(() => {
        if (!contentRef.current) return;
        
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
        const maxScroll = scrollHeight - clientHeight;
        const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
        
        setScrollProgress(progress);
        
        // Hide scroll hint after user starts scrolling
        if (scrollTop > 50) {
            setShowScrollHint(false);
        }
    }, []);

    // Reset scroll on tab change
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
            setScrollProgress(0);
            setShowScrollHint(true);
        }
    }, [activeTab]);

    const TermsOfService = () => (
        <div className="prose prose-sm max-w-none text-gray-600">
            <p className="text-xs text-gray-400 mb-6">Last Updated: {lastUpdated}</p>
            
            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">1. Acceptance of Terms</h3>
                <p className="mb-3">
                    Welcome to InJazi ("the App", "we", "us", or "our"). By accessing or using the InJazi mobile application and related services, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the App.
                </p>
                <p>
                    InJazi is a goal achievement and personal development platform that uses artificial intelligence to help users set, track, and accomplish their personal and professional goals.
                </p>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">2. Eligibility</h3>
                <p className="mb-3">
                    You must be at least 13 years of age to use InJazi. If you are under 18, you must have parental or guardian consent to use the App. By using InJazi, you represent and warrant that you meet these eligibility requirements.
                </p>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">3. Account Registration</h3>
                <p className="mb-3">
                    To access certain features, you must create an account. You agree to:
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li>Provide accurate, current, and complete information during registration</li>
                    <li>Maintain and promptly update your account information</li>
                    <li>Keep your password secure and confidential</li>
                    <li>Be responsible for all activities under your account</li>
                    <li>Notify us immediately of any unauthorized use</li>
                </ul>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">4. Credits and Virtual Currency</h3>
                <p className="mb-3">
                    InJazi uses a virtual currency system called "Architect Credits" ("Credits"). By using Credits, you acknowledge and agree:
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li>Credits have no real-world monetary value until redeemed through our official redemption program</li>
                    <li>Credits can be earned through completing tasks, offers, and in-app activities</li>
                    <li>Credits can be purchased through in-app purchases</li>
                    <li>Minimum redemption threshold: 3,000 Credits = $1.00 USD</li>
                    <li>We reserve the right to modify Credit values, earning rates, and redemption terms at any time</li>
                    <li>Credits are non-transferable between accounts</li>
                    <li>Fraudulent activity will result in account termination and forfeiture of Credits</li>
                </ul>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">5. Subscription Plans</h3>
                <p className="mb-3">
                    InJazi offers the following subscription tiers:
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li><strong>Free Plan:</strong> 3 active goals, 3 AI tasks per day, basic analytics</li>
                    <li><strong>Premium Plan ($9.99/month):</strong> Unlimited goals, unlimited AI tasks, advanced analytics, priority support</li>
                    <li><strong>Creator Plan ($19.99/month):</strong> All Premium features plus API access, custom integrations, and marketplace publishing rights</li>
                </ul>
                <p className="mb-3">
                    Subscriptions auto-renew unless cancelled at least 24 hours before the renewal date. You can manage subscriptions through your device's app store settings.
                </p>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">6. AI-Generated Content</h3>
                <p className="mb-3">
                    InJazi uses Google's Gemini AI and other artificial intelligence technologies to provide personalized recommendations, task generation, and coaching. You acknowledge:
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li>AI-generated content is for informational and motivational purposes only</li>
                    <li>AI recommendations are not professional advice (medical, financial, legal, or otherwise)</li>
                    <li>You should consult qualified professionals for specific advice</li>
                    <li>AI responses may occasionally be inaccurate or inappropriate</li>
                    <li>We are not liable for decisions made based on AI-generated content</li>
                </ul>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">7. User Content and Conduct</h3>
                <p className="mb-3">
                    You are solely responsible for content you submit to InJazi. You agree NOT to:
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li>Upload illegal, harmful, threatening, abusive, or objectionable content</li>
                    <li>Impersonate others or misrepresent your affiliation</li>
                    <li>Violate any applicable laws or regulations</li>
                    <li>Attempt to gain unauthorized access to our systems</li>
                    <li>Use the App for commercial spam or advertising without permission</li>
                    <li>Interfere with or disrupt the App's functionality</li>
                    <li>Exploit bugs or vulnerabilities for unfair advantage</li>
                    <li>Create multiple accounts to abuse rewards systems</li>
                </ul>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">8. Marketplace and Creator Content</h3>
                <p className="mb-3">
                    Creator Plan users may publish courses and products on the InJazi marketplace:
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li>A 5% platform fee applies to all marketplace transactions</li>
                    <li>Creators are responsible for the accuracy and quality of their content</li>
                    <li>InJazi reserves the right to remove content that violates these Terms</li>
                    <li>Purchases are generally non-refundable unless otherwise stated</li>
                </ul>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">9. Third-Party Services</h3>
                <p className="mb-3">
                    InJazi integrates with third-party services including:
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li>Google Calendar, Apple Health, Notion, Todoist (via Bridge Hub)</li>
                    <li>AdGem (for earning offers)</li>
                    <li>Payment processors for transactions</li>
                </ul>
                <p>
                    Your use of these services is subject to their respective terms and privacy policies. We are not responsible for third-party service availability or content.
                </p>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">10. Intellectual Property</h3>
                <p className="mb-3">
                    All InJazi content, including but not limited to text, graphics, logos, icons, images, audio, video, software, and AI models, is the property of InJazi or its licensors and is protected by intellectual property laws. You may not reproduce, distribute, modify, or create derivative works without our express written permission.
                </p>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">11. Disclaimer of Warranties</h3>
                <p className="mb-3">
                    THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT GUARANTEE:
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li>Uninterrupted or error-free service</li>
                    <li>Accuracy of AI-generated recommendations</li>
                    <li>Achievement of specific goals or outcomes</li>
                    <li>Security from all cyber threats</li>
                </ul>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">12. Limitation of Liability</h3>
                <p className="mb-3">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, INJAZI SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE APP.
                </p>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">13. Indemnification</h3>
                <p className="mb-3">
                    You agree to indemnify and hold harmless InJazi, its affiliates, officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the App or violation of these Terms.
                </p>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">14. Termination</h3>
                <p className="mb-3">
                    We may suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion. Upon termination:
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li>Your right to use the App ceases immediately</li>
                    <li>Unredeemed Credits may be forfeited</li>
                    <li>We may delete your account data</li>
                </ul>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">15. Changes to Terms</h3>
                <p className="mb-3">
                    We reserve the right to modify these Terms at any time. We will notify users of material changes via email or in-app notification. Continued use of the App after changes constitutes acceptance of the modified Terms.
                </p>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">16. Governing Law</h3>
                <p className="mb-3">
                    These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
                </p>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">17. Contact Us</h3>
                <p className="mb-3">
                    For questions about these Terms, please contact us at:
                </p>
                <p className="font-medium text-primary">
                    Email: legal@injazi.app<br />
                    Support: support@injazi.app
                </p>
            </section>
        </div>
    );

    const PrivacyPolicy = () => (
        <div className="prose prose-sm max-w-none text-gray-600">
            <p className="text-xs text-gray-400 mb-6">Last Updated: {lastUpdated}</p>
            
            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">1. Introduction</h3>
                <p className="mb-3">
                    InJazi ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.
                </p>
                <p>
                    Please read this policy carefully. By using InJazi, you consent to the practices described in this Privacy Policy.
                </p>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">2. Information We Collect</h3>
                
                <h4 className="font-semibold text-primary mt-4 mb-2">2.1 Personal Information You Provide</h4>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li><strong>Account Information:</strong> Name, email address, password, country</li>
                    <li><strong>Profile Information:</strong> Goals, preferences, personal development data</li>
                    <li><strong>Payment Information:</strong> Transaction history, purchase records (payment details are processed by third-party providers)</li>
                    <li><strong>Communications:</strong> Messages sent through the app, support inquiries</li>
                    <li><strong>User Content:</strong> Task submissions, check-in responses, uploaded files (images, documents, audio)</li>
                </ul>

                <h4 className="font-semibold text-primary mt-4 mb-2">2.2 Information Collected Automatically</h4>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li><strong>Device Information:</strong> Device type, operating system, unique device identifiers</li>
                    <li><strong>Usage Data:</strong> App interactions, features used, time spent, task completion rates</li>
                    <li><strong>Log Data:</strong> IP address, access times, app crashes, system activity</li>
                    <li><strong>Location Data:</strong> General location (country/region) based on IP address</li>
                </ul>

                <h4 className="font-semibold text-primary mt-4 mb-2">2.3 Information from Third Parties</h4>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li><strong>Connected Apps (Bridge Hub):</strong> Data from Google Calendar, Apple Health, Notion, Todoist when you connect them</li>
                    <li><strong>AdGem:</strong> Offer completion data and rewards information</li>
                    <li><strong>Analytics Providers:</strong> Aggregated usage statistics</li>
                </ul>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">3. How We Use Your Information</h3>
                <p className="mb-3">We use collected information to:</p>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li>Provide, maintain, and improve the InJazi service</li>
                    <li>Personalize your experience with AI-powered recommendations</li>
                    <li>Generate custom tasks, curricula, and learning paths</li>
                    <li>Process transactions and manage your Credits balance</li>
                    <li>Send service-related communications (verification codes, updates, alerts)</li>
                    <li>Provide customer support</li>
                    <li>Analyze usage patterns to improve our AI models and features</li>
                    <li>Detect, prevent, and address fraud or security issues</li>
                    <li>Comply with legal obligations</li>
                </ul>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">4. AI and Data Processing</h3>
                <p className="mb-3">
                    InJazi uses Google's Gemini AI to provide personalized coaching. When you interact with our AI features:
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li>Your goals, tasks, and check-in data are processed to generate personalized recommendations</li>
                    <li>Chat conversations may be analyzed to improve response quality</li>
                    <li>Uploaded files (images, PDFs, audio) are processed for task verification and AI analysis</li>
                    <li>AI interactions are processed in real-time and not stored beyond your active session unless you explicitly save them</li>
                </ul>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">5. Information Sharing and Disclosure</h3>
                <p className="mb-3">We may share your information with:</p>
                
                <h4 className="font-semibold text-primary mt-4 mb-2">5.1 Service Providers</h4>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li>Cloud hosting providers (for data storage)</li>
                    <li>Email service providers (EmailJS for verification emails)</li>
                    <li>Payment processors (for transactions)</li>
                    <li>Analytics providers (for usage analysis)</li>
                    <li>AI service providers (Google Gemini)</li>
                </ul>

                <h4 className="font-semibold text-primary mt-4 mb-2">5.2 Third-Party Integrations</h4>
                <p className="mb-3">
                    When you connect third-party apps through Bridge Hub, data flows between InJazi and those services according to their respective privacy policies.
                </p>

                <h4 className="font-semibold text-primary mt-4 mb-2">5.3 Legal Requirements</h4>
                <p className="mb-3">
                    We may disclose information if required by law, court order, or governmental authority, or to protect rights, safety, or property.
                </p>

                <h4 className="font-semibold text-primary mt-4 mb-2">5.4 Business Transfers</h4>
                <p className="mb-3">
                    In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.
                </p>

                <p className="font-medium text-primary mt-4">
                    We do NOT sell your personal information to third parties for advertising purposes.
                </p>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">6. Data Security</h3>
                <p className="mb-3">
                    We implement appropriate technical and organizational security measures to protect your information:
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li>Encryption of data in transit (HTTPS/TLS)</li>
                    <li>Secure password hashing</li>
                    <li>Access controls and authentication</li>
                    <li>Regular security assessments</li>
                </ul>
                <p>
                    However, no method of transmission or storage is 100% secure. We cannot guarantee absolute security.
                </p>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">7. Data Retention</h3>
                <p className="mb-3">We retain your information for as long as:</p>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li>Your account remains active</li>
                    <li>Necessary to provide our services</li>
                    <li>Required by law or for legitimate business purposes</li>
                </ul>
                <p>
                    Upon account deletion, we will delete or anonymize your personal information within 30 days, except where retention is required by law.
                </p>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">8. Your Rights and Choices</h3>
                <p className="mb-3">Depending on your location, you may have the right to:</p>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li><strong>Access:</strong> Request a copy of your personal data</li>
                    <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                    <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                    <li><strong>Portability:</strong> Receive your data in a structured format</li>
                    <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                    <li><strong>Withdraw Consent:</strong> Revoke previously given consent</li>
                </ul>
                <p>
                    To exercise these rights, contact us at privacy@injazi.app or use the in-app Settings.
                </p>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">9. Children's Privacy</h3>
                <p className="mb-3">
                    InJazi is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we discover that a child under 13 has provided us with personal information, we will delete it immediately. If you believe a child has provided us with their information, please contact us.
                </p>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">10. International Data Transfers</h3>
                <p className="mb-3">
                    Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
                </p>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">11. Cookies and Tracking</h3>
                <p className="mb-3">
                    As a mobile application, InJazi primarily uses local storage and device identifiers rather than cookies. We may use:
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li>Local storage for authentication tokens and preferences</li>
                    <li>Analytics SDKs for usage tracking</li>
                    <li>Push notification tokens for alerts</li>
                </ul>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">12. Changes to This Policy</h3>
                <p className="mb-3">
                    We may update this Privacy Policy periodically. We will notify you of material changes via email or in-app notification. The "Last Updated" date at the top indicates the most recent revision.
                </p>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">13. Contact Us</h3>
                <p className="mb-3">
                    For questions or concerns about this Privacy Policy or our data practices:
                </p>
                <p className="font-medium text-primary">
                    Email: privacy@injazi.app<br />
                    Support: support@injazi.app
                </p>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">14. Additional Rights for Specific Regions</h3>
                
                <h4 className="font-semibold text-primary mt-4 mb-2">For EU/EEA Residents (GDPR)</h4>
                <p className="mb-3">
                    You have additional rights under GDPR including the right to lodge a complaint with a supervisory authority.
                </p>
                
                <h4 className="font-semibold text-primary mt-4 mb-2">For California Residents (CCPA)</h4>
                <p className="mb-3">
                    You have the right to know what personal information is collected, request deletion, and opt-out of sale of personal information (we do not sell personal information).
                </p>
            </section>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 bg-white border-b border-gray-100">
                <div className="flex items-center justify-between p-4">
                    <button
                        onClick={() => setView(AppView.SETTINGS)}
                        className="p-2 -ml-2 text-gray-400 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                        aria-label="Back to settings"
                    >
                        <Icons.ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-lg font-bold text-primary">Legal</h1>
                    <div className="w-10" aria-hidden="true" />
                </div>
                
                {/* FIX #33: Improved tabs with sliding indicator */}
                <div className="relative flex border-t border-gray-100">
                    <button
                        onClick={() => setActiveTab('terms')}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors relative z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                            activeTab === 'terms'
                                ? 'text-primary'
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                        role="tab"
                        aria-selected={activeTab === 'terms'}
                        aria-controls="terms-panel"
                    >
                        Terms of Service
                    </button>
                    <button
                        onClick={() => setActiveTab('privacy')}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors relative z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                            activeTab === 'privacy'
                                ? 'text-primary'
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                        role="tab"
                        aria-selected={activeTab === 'privacy'}
                        aria-controls="privacy-panel"
                    >
                        Privacy Policy
                    </button>
                    
                    {/* FIX #33: Sliding indicator that doesn't cause layout shift */}
                    <div 
                        className="absolute bottom-0 h-0.5 bg-primary transition-transform duration-300 ease-out"
                        style={{
                            width: '50%',
                            transform: activeTab === 'terms' ? 'translateX(0)' : 'translateX(100%)'
                        }}
                        aria-hidden="true"
                    />
                </div>
                
                {/* FIX #34: Scroll progress indicator */}
                <div className="h-0.5 bg-gray-100 relative">
                    <div 
                        className="h-full bg-primary/60 transition-all duration-150 ease-out"
                        style={{ width: `${scrollProgress}%` }}
                        role="progressbar"
                        aria-valuenow={Math.round(scrollProgress)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Scroll progress"
                    />
                </div>
            </div>

            {/* Content */}
            <div 
                ref={contentRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-5 pb-10 relative"
                role="tabpanel"
                id={activeTab === 'terms' ? 'terms-panel' : 'privacy-panel'}
                aria-labelledby={activeTab === 'terms' ? 'terms-tab' : 'privacy-tab'}
            >
                {activeTab === 'terms' ? <TermsOfService /> : <PrivacyPolicy />}
                
                {/* FIX #34: Scroll hint at bottom */}
                {showScrollHint && (
                    <div 
                        className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-900/80 text-white text-xs px-3 py-2 rounded-full flex items-center gap-2 animate-bounce shadow-lg"
                        aria-hidden="true"
                    >
                        <Icons.ChevronDown className="w-4 h-4" />
                        Scroll to read more
                    </div>
                )}
            </div>
        </div>
    );
}
