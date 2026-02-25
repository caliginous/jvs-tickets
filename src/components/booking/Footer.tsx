import React, { useState } from 'react';
import Image from 'next/image';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error' | 'already_subscribed'>('idle');

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('https://www.jvs.org.uk/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.message.includes('already subscribed')) {
          setSubmitStatus('already_subscribed');
        } else {
          setSubmitStatus('success');
          setEmail(''); // Clear the form
        }
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-[#263238] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* JVS Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <Image 
                src="/transparent_logo.png" 
                alt="JVS Logo" 
                width={100} 
                height={40} 
                className="h-10 w-auto"
              />
              <span className="ml-3 text-lg font-medium">Jewish, Vegan, Sustainable</span>
            </div>
            <p className="text-neutral-300 mb-4 max-w-md">
              Promoting Jewish values through veganism and sustainability, 
              building community through education and advocacy.
            </p>
            <div className="flex space-x-4">
              <a href="https://x.com/JewishVegSoc" className="text-neutral-400 hover:text-[#4FC3F7]">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="https://www.facebook.com/JewishVegUK" className="text-neutral-400 hover:text-[#4FC3F7]">
                <span className="sr-only">Facebook</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="https://www.instagram.com/jewishvegsoc/?hl=en" className="text-neutral-400 hover:text-[#4FC3F7]">
                <span className="sr-only">Instagram</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.153-1.772 4.902 4.902 0 01-1.772-1.153c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="https://www.jvs.org.uk/articles" className="text-neutral-300 hover:text-[#4FC3F7] transition-colors">
                  Articles
                </a>
              </li>
              <li>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="https://www.jvs.org.uk/events" className="text-neutral-300 hover:text-[#4FC3F7] transition-colors">
                  Events
                </a>
              </li>
              <li>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="https://www.jvs.org.uk/recipes" className="text-neutral-300 hover:text-[#4FC3F7] transition-colors">
                  Recipes
                </a>
              </li>
              <li>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="https://www.jvs.org.uk/about" className="text-neutral-300 hover:text-[#4FC3F7] transition-colors">
                  About Us
                </a>
              </li>
              <li>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="https://www.jvs.org.uk/venue-hire" className="text-neutral-300 hover:text-[#4FC3F7] transition-colors">
                  Venue Hire
                </a>
              </li>
              <li>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="https://www.jvs.org.uk/membership" className="text-neutral-300 hover:text-[#4FC3F7] transition-colors">
                  Membership
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter Signup */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Stay Updated</h3>
            <p className="text-neutral-300 mb-4">Subscribe to our newsletter for the latest news and events.</p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-2">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#8BC34A] focus:border-transparent disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="w-full bg-[#8BC34A] hover:bg-[#558B2F] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Subscribing...' : 'Subscribe'}
              </button>
              
              {/* Status Messages */}
              {submitStatus === 'success' && (
                <p className="text-green-400 text-sm">✓ Successfully subscribed to our newsletter!</p>
              )}
              {submitStatus === 'already_subscribed' && (
                <p className="text-yellow-400 text-sm">✓ You&apos;re already subscribed to our newsletter!</p>
              )}
              {submitStatus === 'error' && (
                <p className="text-red-400 text-sm">✗ Please enter a valid email address.</p>
              )}
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-neutral-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-neutral-400 text-sm">
            © {new Date().getFullYear()} JVS. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="https://www.jvs.org.uk/privacy" className="text-neutral-400 hover:text-[#4FC3F7] text-sm transition-colors">
              Privacy Policy
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="https://www.jvs.org.uk/terms" className="text-neutral-400 hover:text-[#4FC3F7] text-sm transition-colors">
              Terms of Service
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="https://www.jvs.org.uk/contact" className="text-neutral-400 hover:text-[#4FC3F7] text-sm transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
} 