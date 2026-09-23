export default function ProductCard({
    product,
    onAddToCart,
    onIncrease,
    onDecrease,
    quantity = 0,
}) {
    const isAvailable = product?.is_available !== false

    return (
        <article className="overflow-hidden rounded-2xl bg-(--color-card) shadow-sm ring-1 ring-black/5">
            <div className="relative aspect-square overflow-hidden bg-black/5">
                {product?.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-300 hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                        لا توجد صورة
                    </div>
                )}

                {!isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                        <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-800">
                            غير متوفر
                        </span>
                    </div>
                )}
            </div>

            <div className="p-4">
                <h3 className="line-clamp-2 text-base font-bold text-gray-900">
                    {product?.name}
                </h3>

                {product?.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                        {product.description}
                    </p>
                )}

                <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="font-bold text-(--color-primary)">
                        {Number(product?.price || 0).toLocaleString("ar-EG")} جنيه
                    </span>

                    {isAvailable && quantity === 0 && (
                        <button
                            type="button"
                            onClick={() => onAddToCart(product)}
                            className="rounded-xl bg-(--color-primary) px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                        >
                            إضافة
                        </button>
                    )}

                    {isAvailable && quantity > 0 && (
                        <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-2 py-1">
                            <button
                                type="button"
                                onClick={() => onIncrease(product)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--color-primary) text-lg font-bold text-white"
                                aria-label="زيادة الكمية"
                            >
                                +
                            </button>

                            <span className="min-w-6 text-center text-sm font-bold">
                                {quantity}
                            </span>

                            <button
                                type="button"
                                onClick={() => onDecrease(product)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-lg font-bold text-gray-800"
                                aria-label="تقليل الكمية"
                            >
                                −
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </article>
    )
}