interface StoreThemeConfigProps {
    customTheme?: any;
    children: React.ReactNode;
}

export const StoreThemeConfig = ({ customTheme, children }: StoreThemeConfigProps) => {
    // Since we're using Tailwind CSS now, we don't need MUI's theme system
    // We can just return the children with any custom CSS variables if needed
    return (
        <>
            <style jsx global>{`
                :root {
                    --primary-color: #1976d2;
                    --primary-light: #edf5fd;
                    --text-primary: #212B36;
                    --text-secondary: #637381;
                    --text-disabled: #919EAB;
                    --background-default: #fff;
                }
                
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
                    background-color: var(--background-default);
                    color: var(--text-primary);
                }
            `}</style>
            {children}
        </>
    );
};
