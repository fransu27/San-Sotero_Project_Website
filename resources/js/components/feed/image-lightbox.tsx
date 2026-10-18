import * as DialogPrimitive from '@radix-ui/react-dialog';
import { RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Click-to-enlarge photos.
 *
 *  - <ZoomableImage> : drop-in replacement for <img>. The photo becomes a button; clicking it opens the viewer.
 *  - <ImageLightbox> : the full-screen viewer. Zoom with the + / - buttons, the mouse wheel, a double click,
 *                      the + / - / 0 keys or a two-finger pinch; drag to move a zoomed photo; Esc or X closes it.
 *
 * Display only: the viewer shows the same URL the page already loaded (same access rules as the thumbnail).
 */
const MIN = 1;
const MAX = 5;
const STEP = 0.5;

const clamp = (n: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, n));

export function ImageLightbox({
    src,
    alt,
    open,
    onOpenChange,
}: {
    src: string;
    alt: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [scale, setScale] = useState(1);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
    const dragFrom = useRef<{ x: number; y: number } | null>(null);

    const reset = useCallback(() => {
        setScale(1);
        setPos({ x: 0, y: 0 });
    }, []);

    const zoomTo = useCallback((next: number) => {
        const s = clamp(Number(next.toFixed(2)), MIN, MAX);
        setScale(s);

        if (s === MIN) {
            setPos({ x: 0, y: 0 });
        }
    }, []);

    const handleOpenChange = (value: boolean) => {
        if (!value) {
            reset();
        }

        onOpenChange(value);
    };

    const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinchStart.current = {
                dist: Math.hypot(a.x - b.x, a.y - b.y),
                scale,
            };
            dragFrom.current = null;
            setDragging(false);
        } else if (scale > MIN) {
            dragFrom.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
            setDragging(true);
        }
    };

    const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (!pointers.current.has(e.pointerId)) {
            return;
        }

        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointers.current.size === 2 && pinchStart.current) {
            const [a, b] = [...pointers.current.values()];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            zoomTo((pinchStart.current.scale * dist) / pinchStart.current.dist);
        } else if (dragFrom.current) {
            setPos({
                x: e.clientX - dragFrom.current.x,
                y: e.clientY - dragFrom.current.y,
            });
        }
    };

    const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
        pointers.current.delete(e.pointerId);
        pinchStart.current = null;
        dragFrom.current = null;
        setDragging(false);
    };

    const btn =
        'inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-[#0197F6] disabled:opacity-40';

    return (
        <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
            <DialogPortal>
                <DialogOverlay className="z-[70] bg-black/90" />
                <DialogPrimitive.Content
                    aria-describedby={undefined}
                    onKeyDown={(e) => {
                        if (e.key === '+' || e.key === '=') {
                            zoomTo(scale + STEP);
                        } else if (e.key === '-' || e.key === '_') {
                            zoomTo(scale - STEP);
                        } else if (e.key === '0') {
                            reset();
                        }
                    }}
                    className="fixed inset-0 z-[70] flex flex-col outline-none"
                >
                    <DialogPrimitive.Title className="sr-only">
                        {alt || 'Photo preview'}
                    </DialogPrimitive.Title>

                    <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
                        <p className="min-w-0 truncate text-sm font-medium text-white/80">
                            {alt}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                type="button"
                                onClick={() => zoomTo(scale - STEP)}
                                disabled={scale <= MIN}
                                aria-label="Zoom out"
                                title="Zoom out"
                                className={btn}
                            >
                                <ZoomOut size={18} />
                            </button>
                            <span
                                className="w-12 text-center text-sm text-white/80 tabular-nums"
                                aria-live="polite"
                            >
                                {Math.round(scale * 100)}%
                            </span>
                            <button
                                type="button"
                                onClick={() => zoomTo(scale + STEP)}
                                disabled={scale >= MAX}
                                aria-label="Zoom in"
                                title="Zoom in"
                                className={btn}
                            >
                                <ZoomIn size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={reset}
                                disabled={scale === MIN}
                                aria-label="Reset zoom"
                                title="Reset zoom"
                                className={btn}
                            >
                                <RotateCcw size={17} />
                            </button>
                            <DialogPrimitive.Close
                                aria-label="Close photo"
                                title="Close"
                                className={cn(btn, 'ml-1')}
                            >
                                <X size={20} />
                            </DialogPrimitive.Close>
                        </div>
                    </div>

                    <div
                        className={cn(
                            'relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden select-none',
                            scale > MIN
                                ? dragging
                                    ? 'cursor-grabbing'
                                    : 'cursor-grab'
                                : 'cursor-zoom-in',
                        )}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                        onPointerLeave={onPointerUp}
                        onWheel={(e) =>
                            zoomTo(scale + (e.deltaY < 0 ? STEP : -STEP) / 2)
                        }
                        onDoubleClick={() =>
                            scale > MIN ? reset() : zoomTo(2.5)
                        }
                        onClick={(e) => {
                            // clicking the dark area around a not-zoomed photo closes the viewer
                            if (e.target === e.currentTarget && scale === MIN) {
                                handleOpenChange(false);
                            }
                        }}
                    >
                        <img
                            src={src}
                            alt={alt}
                            draggable={false}
                            style={{
                                transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                                transition: dragging
                                    ? 'none'
                                    : 'transform 150ms ease-out',
                            }}
                            className="max-h-full max-w-full object-contain"
                        />
                    </div>
                </DialogPrimitive.Content>
            </DialogPortal>
        </DialogPrimitive.Root>
    );
}

/** A photo that opens in the zoom viewer when clicked. Accepts the same className as the old <img>. */
export function ZoomableImage({
    src,
    alt,
    className,
    wrapperClassName,
    loading = 'lazy',
}: {
    src: string;
    alt: string;
    className?: string;
    wrapperClassName?: string;
    loading?: 'lazy' | 'eager';
}) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={alt ? `View photo: ${alt}` : 'View photo'}
                title="Click to enlarge"
                className={cn(
                    'zoom-frame block w-full cursor-zoom-in rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#0197F6]',
                    wrapperClassName,
                )}
            >
                <img
                    src={src}
                    alt={alt}
                    loading={loading}
                    decoding="async"
                    className={className}
                />
            </button>
            <ImageLightbox
                src={src}
                alt={alt}
                open={open}
                onOpenChange={setOpen}
            />
        </>
    );
}
