import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export const JVSHeader: React.FC = () => {
  return (
    <header className="bg-neutral-900 shadow-lg border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="flex-shrink-0 flex items-center">
              <div className="w-12 h-12 bg-primary-400 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-xl">JVS</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-white">Jewish Vegan Society</span>
                <span className="text-sm text-neutral-300">Ticket Booking</span>
              </div>
            </a>
          </div>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a 
              href="/" 
              className="text-neutral-200 hover:text-primary-400 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Home
            </a>
            <a 
              href="/events" 
              className="text-neutral-200 hover:text-primary-400 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Events
            </a>
            <a 
              href="/about" 
              className="text-neutral-200 hover:text-primary-400 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              About
            </a>
            <a 
              href="/contact" 
              className="text-neutral-200 hover:text-primary-400 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Contact
            </a>
          </nav>

          {/* User Menu */}
          <div className="flex items-center">
            <div className="w-8 h-8 bg-neutral-700 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-neutral-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
