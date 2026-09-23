export default function ProductCard({
    product,
    onAddToCart,
    onIncrease,
    onDecrease,
    quantity = 0,
}) {
    const isAvailable = product?.is_available !== false

    return (
        <article className="flex items-center gap-3 rounded-2xl bg-(--color-card) p-3 shadow-sm ring-1 ring-black/5">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-black/5">
                {product?.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-center text-[11px] text-gray-400">
                        لا توجد صورة
                    </div>
                )}

                {!isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                        <span className="text-[10px] font-bold text-white">
                            غير متوفر
                        </span>
                    </div>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-bold text-gray-900">
                    {product?.name}
                </h3>

                {product?.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                        {product.description}
                    </p>
                )}

                <p className="mt-1.5 text-sm font-bold text-(--color-primary)">
                    {Number(product?.price || 0).toLocaleString("ar-EG")} جنيه
                </p>
            </div>

            {isAvailable && quantity === 0 && (
                <button
                    type="button"
                    onClick={() => onAddToCart(product)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-primary) text-xl font-bold leading-none text-white shadow-sm transition hover:opacity-90"
                    aria-label="إضافة"
                >
                    +
                </button>
            )}

            {isAvailable && quantity > 0 && (
                <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-white px-1.5 py-1">
                    <button
                        type="button"
                        onClick={() => onDecrease(product)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-base font-bold text-gray-800"
                        aria-label="تقليل الكمية"
                    >
                        −
                    </button>

                    <span className="min-w-5 text-center text-sm font-bold">
                        {quantity}
                    </span>

                    <button
                        type="button"
                        onClick={() => onIncrease(product)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-(--color-primary) text-base font-bold text-white"
                        aria-label="زيادة الكمية"
                    >
                        +
                    </button>
                </div>
            )}
        </article>
    )
}
