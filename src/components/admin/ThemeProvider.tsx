interface ThemeConfigProps {
    children: React.ReactNode;
}

export const ThemeConfig = ({ children }: ThemeConfigProps) => {
    return (
        <>
            <style jsx global>{`
                :root {
                    /* Color palette */
                    --color-primary-50: #f0fdf4;
                    --color-primary-100: #dcfce7;
                    --color-primary-200: #bbf7d0;
                    --color-primary-300: #86efac;
                    --color-primary-400: #4ade80;
                    --color-primary-500: #22c55e;
                    --color-primary-600: #16a34a;
                    --color-primary-700: #15803d;
                    --color-primary-800: #166534;
                    --color-primary-900: #14532d;
                    
                    --color-secondary-50: #eff6ff;
                    --color-secondary-100: #dbeafe;
                    --color-secondary-200: #bfdbfe;
                    --color-secondary-300: #93c5fd;
                    --color-secondary-400: #60a5fa;
                    --color-secondary-500: #3b82f6;
                    --color-secondary-600: #2563eb;
                    --color-secondary-700: #1d4ed8;
                    --color-secondary-800: #1e40af;
                    --color-secondary-900: #1e3a8a;
                    
                    --color-success-50: #f0fdf4;
                    --color-success-100: #dcfce7;
                    --color-success-200: #bbf7d0;
                    --color-success-300: #86efac;
                    --color-success-400: #4ade80;
                    --color-success-500: #22c55e;
                    --color-success-600: #16a34a;
                    --color-success-700: #15803d;
                    --color-success-800: #166534;
                    --color-success-900: #14532d;
                    
                    --color-warning-50: #fffbeb;
                    --color-warning-100: #fef3c7;
                    --color-warning-200: #fde68a;
                    --color-warning-300: #fcd34d;
                    --color-warning-400: #fbbf24;
                    --color-warning-500: #f59e0b;
                    --color-warning-600: #d97706;
                    --color-warning-700: #b45309;
                    --color-warning-800: #92400e;
                    --color-warning-900: #78350f;
                    
                    --color-error-50: #fef2f2;
                    --color-error-100: #fee2e2;
                    --color-error-200: #fecaca;
                    --color-error-300: #fca5a5;
                    --color-error-400: #f87171;
                    --color-error-500: #ef4444;
                    --color-error-600: #dc2626;
                    --color-error-700: #b91c1c;
                    --color-error-800: #991b1b;
                    --color-error-900: #7f1d1d;
                    
                    --color-grey-50: #f9fafb;
                    --color-grey-100: #f3f4f6;
                    --color-grey-200: #e5e7eb;
                    --color-grey-300: #d1d5db;
                    --color-grey-400: #9ca3af;
                    --color-grey-500: #6b7280;
                    --color-grey-600: #4b5563;
                    --color-grey-700: #374151;
                    --color-grey-800: #1f2937;
                    --color-grey-900: #111827;
                    
                    /* Chart colors */
                    --chart-violet: #826af9, #9e86ff, #d0aeff, #f7d2ff;
                    --chart-blue: #2d99ff, #83cfff, #a5f3ff, #ccfaff;
                    --chart-green: #2cd9c5, #60f1c8, #a4f7cc, #c0f2dc;
                    --chart-yellow: #ffe700, #ffef5a, #fff7ae, #fff3d6;
                    --chart-red: #ff6c40, #ff8f6d, #ffbd98, #fff2d4;
                    
                    /* Border radius */
                    --radius-sm: 8px;
                    --radius-md: 12px;
                    --radius-lg: 16px;
                }
                
                /* Global styles */
                * {
                    box-sizing: border-box;
                }
                
                body {
                    margin: 0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
                        sans-serif;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                    background-color: var(--color-grey-50);
                    color: var(--color-grey-800);
                }
                
                /* Utility classes for gradients */
                .gradient-primary {
                    background: linear-gradient(to bottom, var(--color-primary-300), var(--color-primary-500));
                }
                
                .gradient-info {
                    background: linear-gradient(to bottom, var(--color-secondary-300), var(--color-secondary-500));
                }
                
                .gradient-success {
                    background: linear-gradient(to bottom, var(--color-success-300), var(--color-success-500));
                }
                
                .gradient-warning {
                    background: linear-gradient(to bottom, var(--color-warning-300), var(--color-warning-500));
                }
                
                .gradient-error {
                    background: linear-gradient(to bottom, var(--color-error-300), var(--color-error-500));
                }
            `}</style>
            {children}
        </>
    );
};
