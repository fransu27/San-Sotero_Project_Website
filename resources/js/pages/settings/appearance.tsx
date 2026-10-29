import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import Heading from '@/components/heading';
import { useLocale } from '@/hooks/use-locale';
import { edit as editAppearance } from '@/routes/appearance';

export default function Appearance() {
    const { t } = useLocale();

    return (
        <>
            <Head title={t('page.appearanceSettings')} />

            <h1 className="sr-only">{t('page.appearanceSettings')}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('appearance.title')}
                    description={t('appearance.desc')}
                />
                <AppearanceTabs />
            </div>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Appearance settings',
            href: editAppearance(),
        },
    ],
};
