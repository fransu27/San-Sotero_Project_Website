/**
 * The barangay seal. ONE place, ONE file: public/images/logo.png.
 * To change the logo everywhere (landing page, login/register, dashboard bar), just replace that file.
 * alt="" because the barangay name is always written next to it (screen readers would otherwise read it twice).
 * SECURITY: a fixed local image, no user input.
 */
export default function BrandMark({ size = 36, className = '' }: { size?: number; className?: string }) {
    return <img src="/images/logo.png" alt="" width={size} height={size} style={{ width: size, height: size }} className={`shrink-0 object-contain ${className}`} />;
}
