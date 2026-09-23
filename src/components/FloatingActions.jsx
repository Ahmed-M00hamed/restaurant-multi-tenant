export default function FloatingActions({
    cartItemsCount,
    onOpenCart,
    onOpenTracking,
}) {
    return (
        <div className="fixed bottom-5 start-4 z-40 flex flex-col gap-3">
            {onOpenTracking && (
                <button
                    type="button"
                    onClick={onOpenTracking}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-(--color-card) text-(--color-primary) shadow-lg ring-1 ring-black/10 transition hover:scale-105"
                    aria-label="تتبع الطلب"
                    title="تتبع الطلب"
                >
                    <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M3 12h18" />
                        <path d="M13 5l7 7-7 7" />
                    </svg>
                </button>
            )}

            <button
                type="button"
                onClick={onOpenCart}
                className="relative flex h-14 w-14 items-center justify-center rounded-full bg-(--color-primary) text-white shadow-lg transition hover:scale-105"
                aria-label="السلة"
                title="السلة"
            >
                <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <path d="M6 7h12l1 13H5L6 7Z" />
                    <path d="M9 7a3 3 0 0 1 6 0" />
                </svg>

                {cartItemsCount > 0 && (
                    <span className="absolute -end-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                        {cartItemsCount > 99 ? "99+" : cartItemsCount}
                    </span>
                )}
            </button>
        </div>
    )
}