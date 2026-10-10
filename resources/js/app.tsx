import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import FeedLayout from '@/layouts/feed-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { BRAND } from '@/lib/brand';

const appName = BRAND.name; // always the barangay title, even if .env still says APP_NAME=Laravel

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name === 'dashboard':
            case name === 'newsfeed':
            case name === 'submissions':
            case name === 'admin/moderation':
                return FeedLayout; // Facebook-style shell (top bar + left nav)
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [FeedLayout, SettingsLayout]; // settings now share the same look as the feed
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
