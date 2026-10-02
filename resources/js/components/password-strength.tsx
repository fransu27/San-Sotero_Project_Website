import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Live password checklist + strength bar shown under the "Password" field on the register page.
 * The rules mirror the server policy (Password::min(8)->mixedCase()->letters()->numbers()).
 * SECURITY: this is only a guide so people can fix their password before submitting.
 * The server re-checks every rule, so bypassing this component gets you nothing.
 * The password never leaves the browser except in the normal (HTTPS) form post.
 */
export function checkPassword(pw: string, confirm = '') {
    const rules = [
        { label: 'At least 8 characters', ok: pw.length >= 8 },
        { label: 'One uppercase letter (A–Z)', ok: /[A-Z]/.test(pw) },
        { label: 'One lowercase letter (a–z)', ok: /[a-z]/.test(pw) },
        { label: 'One number (0–9)', ok: /\d/.test(pw) },
    ];
    const meetsAll = rules.every((r) => r.ok);
    // Bonus points (not required) for length and symbols → the bar reaches "Strong".
    const score =
        rules.filter((r) => r.ok).length +
        (pw.length >= 12 ? 1 : 0) +
        (/[^A-Za-z0-9]/.test(pw) ? 1 : 0);
    const level = !pw ? 0 : !meetsAll ? 1 : score >= 6 ? 3 : 2;

    return { rules, meetsAll, level, matches: pw.length > 0 && pw === confirm };
}

const LEVELS = ['', 'Too weak', 'Good', 'Strong'];
const COLORS = ['bg-muted', 'bg-[#D7263D]', 'bg-[#0197F6]', 'bg-[#448FA3]'];

export default function PasswordStrength({ password }: { password: string }) {
    const { rules, level } = checkPassword(password);

    return (
        <div
            className="space-y-2 rounded-lg border border-border bg-background/40 p-3"
            aria-live="polite"
        >
            <div className="flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                    {[1, 2, 3].map((i) => (
                        <span
                            key={i}
                            className={cn(
                                'h-1.5 flex-1 rounded-full',
                                level >= i ? COLORS[level] : 'bg-muted',
                            )}
                        />
                    ))}
                </div>
                <span className="w-14 text-right text-xs text-muted-foreground">
                    {LEVELS[level]}
                </span>
            </div>
            <ul className="grid gap-1 text-xs sm:grid-cols-2">
                {rules.map((r) => (
                    <li
                        key={r.label}
                        className={cn(
                            'flex items-center gap-1.5',
                            r.ok ? 'text-[#68C5DB]' : 'text-muted-foreground',
                        )}
                    >
                        {r.ok ? <Check size={13} /> : <Circle size={11} />}{' '}
                        {r.label}
                    </li>
                ))}
            </ul>
        </div>
    );
}
