export default function CartDrawer({
    isOpen,
    cart,
    cartTotal,
    onClose,
    onIncrease,
    onDecrease,
    onRemove,
    onCheckout,
}) {
    if (!isOpen) {
        return null
    }

    return (
        <div className="fixed inset-0 z-50">
            {/* Overlay */}
            <button
                type="button"
                aria-label="إغلاق السلة"
                onClick={onClose}
                className="absolute inset-0 h-full w-full bg-black/50"
            />

            {/* Drawer */}
            <aside className="absolute inset-e-0 top-0 flex h-full w-full max-w-md flex-col bg-(--color-background,white) shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            سلة الطلب
                        </h2>

                        <p className="mt-1 text-xs text-gray-500">
                            راجع المنتجات قبل إكمال الطلب
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-700 transition hover:bg-gray-200"
                        aria-label="إغلاق"
                    >
                        ×
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {!cart?.length ? (
                        <div className="flex h-full min-h-60 flex-col items-center justify-center text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-2xl">
                                🛒
                            </div>

                            <h3 className="font-bold text-gray-800">
                                السلة فارغة
                            </h3>

                            <p className="mt-1 text-sm text-gray-500">
                                أضف بعض المنتجات للبدء
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cart.map((item) => {
                                const itemTotal =
                                    Number(item.price || 0) * Number(item.quantity || 0)

                                return (
                                    <div
                                        key={item.id}
                                        className="rounded-2xl border border-black/10 bg-(--color-card) p-3"
                                    >
                                        <div className="flex gap-3">
                                            {/* Image */}
                                            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                                                {item.image_url ? (
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                                                        لا توجد صورة
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="line-clamp-2 text-sm font-bold text-gray-900">
                                                        {item.name}
                                                    </h3>

                                                    <button
                                                        type="button"
                                                        onClick={() => onRemove(item)}
                                                        className="shrink-0 text-sm text-red-500 transition hover:text-red-700"
                                                        aria-label={`حذف ${item.name}`}
                                                    >
                                                        حذف
                                                    </button>
                                                </div>

                                                <p className="mt-1 text-sm font-semibold text-(--color-primary)">
                                                    {Number(item.price || 0).toLocaleString("ar-EG")} جنيه
                                                </p>

                                                <div className="mt-3 flex items-center justify-between">
                                                    {/* Quantity */}
                                                    <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white p-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => onIncrease(item)}
                                                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--color-primary) text-lg font-bold text-white"
                                                            aria-label="زيادة الكمية"
                                                        >
                                                            +
                                                        </button>

                                                        <span className="min-w-6 text-center text-sm font-bold">
                                                            {item.quantity}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={() => onDecrease(item)}
                                                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-lg font-bold text-gray-800"
                                                            aria-label="تقليل الكمية"
                                                        >
                                                            −
                                                        </button>
                                                    </div>

                                                    {/* Item total */}
                                                    <span className="text-sm font-bold text-gray-800">
                                                        {itemTotal.toLocaleString("ar-EG")} جنيه
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {cart?.length > 0 && (
                    <div className="border-t border-black/10 bg-(--color-card) p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                                إجمالي المنتجات
                            </span>

                            <span className="text-lg font-bold text-gray-900">
                                {Number(cartTotal || 0).toLocaleString("ar-EG")} جنيه
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={onCheckout}
                            className="w-full rounded-2xl bg-(--color-primary) px-5 py-3.5 text-sm font-bold text-white transition hover:opacity-90"
                        >
                            إكمال الطلب
                        </button>
                    </div>
                )}
            </aside>
        </div>
    )
}
