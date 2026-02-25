'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-[#263238] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="https://www.jvs.org.uk" className="flex-shrink-0 flex items-center">
              <Image 
                src="/transparent_logo.png" 
                alt="JVS Logo" 
                width={120}
                height={48}
                className="h-12 w-auto"
                priority
              />
              <span className="ml-3 text-lg font-medium text-white">Jewish, Vegan, Sustainable</span>
            </a>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="https://www.jvs.org.uk/articles" className="text-neutral-200 hover:text-[#8BC34A] px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Articles
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="https://www.jvs.org.uk/events" className="text-neutral-200 hover:text-[#8BC34A] px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Events
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="https://www.jvs.org.uk/recipes" className="text-neutral-200 hover:text-[#8BC34A] px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Recipes
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="https://www.jvs.org.uk/resources" className="text-neutral-200 hover:text-[#8BC34A] px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Resources
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="https://www.jvs.org.uk/about" className="text-neutral-200 hover:text-[#8BC34A] px-3 py-2 rounded-md text-sm font-medium transition-colors">
              About
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="https://www.jvs.org.uk/membership" className="bg-[#8BC34A] hover:bg-[#558B2F] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              Join Us
            </a>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-neutral-200 hover:text-[#8BC34A] hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#8BC34A]"
            >
              <span className="sr-only">Open main menu</span>
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-[#263238] border-t border-neutral-700">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="https://www.jvs.org.uk/articles" className="text-neutral-200 hover:text-[#8BC34A] block px-3 py-2 rounded-md text-base font-medium">
              Articles
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="https://www.jvs.org.uk/events" className="text-neutral-200 hover:text-[#8BC34A] block px-3 py-2 rounded-md text-base font-medium">
              Events
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="https://www.jvs.org.uk/recipes" className="text-neutral-200 hover:text-[#8BC34A] block px-3 py-2 rounded-md text-base font-medium">
              Recipes
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="https://www.jvs.org.uk/resources" className="text-neutral-200 hover:text-[#8BC34A] block px-3 py-2 rounded-md text-base font-medium">
              Resources
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="https://www.jvs.org.uk/about" className="text-neutral-200 hover:text-[#8BC34A] block px-3 py-2 rounded-md text-base font-medium">
              About
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="https://www.jvs.org.uk/membership" className="bg-[#8BC34A] hover:bg-[#558B2F] text-white block px-3 py-2 rounded-md text-base font-medium">
              Join Us
            </a>
          </div>
        </div>
      )}
    </nav>
  );
} 