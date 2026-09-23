function CartIcon() {
    return (
        <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 7h12l1 13H5L6 7Z" />
            <path d="M9 7a3 3 0 0 1 6 0" />
        </svg>
    )
}

export default function FloatingActions({
    cartItemsCount,
    cartTotal,
    onOpenCart,
    onOpenTracking,
}) {
    return (
        <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md flex-col gap-2 md:max-w-xl">
            {onOpenTracking && (
                <button
                    type="button"
                    onClick={onOpenTracking}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-(--color-card) py-3 text-sm font-bold text-(--color-primary) shadow-lg ring-1 ring-black/10"
                >
                    📦 تتبع الطلب
                </button>
            )}

            {cartItemsCount > 0 && (
                <button
                    type="button"
                    onClick={onOpenCart}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl bg-(--color-primary) px-5 py-4 text-white shadow-lg transition hover:opacity-90"
                >
                    <span className="flex items-center gap-2 font-bold">
                        <CartIcon />
                        اطلب الآن
                    </span>

                    <span className="flex items-center gap-2 text-sm font-bold">
                        <span className="rounded-full bg-white/20 px-2 py-0.5">
                            {cartItemsCount > 99 ? "99+" : cartItemsCount}
                        </span>
                        {cartTotal !== undefined && (
                            <span>
                                {Number(cartTotal).toLocaleString("ar-EG")} جنيه
                            </span>
                        )}
                    </span>
                </button>
            )}
        </div>
    )
}
