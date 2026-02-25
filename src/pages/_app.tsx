import "../globals.css";
import "../style/Global.scss";

import React, { useState } from "react";
import { useRouter } from "next/router";
import { AnimatePresence } from "framer-motion";
import { Provider } from "react-redux";
import { store } from "../store/store";
import { SessionProvider, SessionProviderProps } from "next-auth/react";
import { ThemeConfig } from "../components/admin/ThemeProvider";
import { Toaster } from "../ui";

import { StoreThemeConfig } from "../components/StoreThemeConfig";
import appWithI18n from "next-translate/appWithI18n";
import i18nConfig from "../../i18n-cached";
import axios from "axios";
import Head from "next/head";

// Initialize i18n cache on server-side
import "../lib/i18nInit";






const Global: React.FunctionComponent<{Component, pageProps}> = ({ Component, pageProps }) => {
    const router = useRouter();


    if (typeof window !== 'undefined') {
        axios.defaults.baseURL = window.location.origin;
    }

    if (router.pathname === "/refund") {
        return (
            <StoreThemeConfig customTheme={pageProps.theme}>
                <Component {...pageProps} />
            </StoreThemeConfig>
        );
    }

    if (router.pathname.startsWith("/admin")) {
        // Use regular imports for admin routes to prevent blank screen issues
        // Note: basePath removed because we use Next.js rewrites to handle /api/auth -> /api/admin/auth
        return (
            <SessionProvider session={pageProps.session}>
                <ThemeConfig>
                    <Component {...pageProps} />
                    <Toaster />
                </ThemeConfig>
            </SessionProvider>
        );
    }



    return (
        <>
            <Head>
                <link rel="icon" type="image/x-icon" href="/jvs_logo.ico?v=2" />
                <link rel="shortcut icon" type="image/x-icon" href="/jvs_logo.ico?v=2" />
                <link rel="apple-touch-icon" href="/jvs_logo.ico?v=2" />
            </Head>
            <Provider store={store}>
                <StoreThemeConfig customTheme={pageProps.theme}>
                    <AnimatePresence exitBeforeEnter initial={false}>
                        <Component
                            {...pageProps}
                            key={router.pathname}
                        />
                    </AnimatePresence>
                </StoreThemeConfig>
            </Provider>
        </>
    );
}

export default appWithI18n(Global, {
    ...i18nConfig,
    skipInitialProps: true,
    loadLocaleFrom: i18nConfig.loadLocaleFrom
});
