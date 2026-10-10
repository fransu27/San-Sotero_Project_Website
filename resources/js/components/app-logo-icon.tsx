import { usePage } from '@inertiajs/react';
import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    const page = usePage().props as any;
    return <img {...props} src={page.barangay?.logo_url || '/images/logo.png'} alt="" className={`object-contain ${props.className ?? ''}`} />;
}
