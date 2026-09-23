export default function CategoryTabs({
    categories,
    activeCategory,
    setActiveCategory,
}) {
    if (!categories?.length) {
        return null
    }

    return (
        <div className="flex gap-2 overflow-x-auto pb-2">
            <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${activeCategory === "all"
                        ? "bg-(--color-primary) text-white"
                        : "bg-(--color-card) text-gray-700 ring-1 ring-black/10"
                    }`}
            >
                الكل
            </button>

            {categories.map((category) => {
                const categoryValue =
                    category.slug || category.name || category.id

                const categoryLabel =
                    category.name || category.title || "تصنيف"

                return (
                    <button
                        key={category.id ?? categoryValue}
                        type="button"
                        onClick={() => setActiveCategory(categoryValue)}
                        className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${activeCategory === categoryValue
                                ? "bg-(--color-primary) text-white"
                                : "bg-(--color-card) text-gray-700 ring-1 ring-black/10"
                            }`}
                    >
                        {categoryLabel}
                    </button>
                )
            })}
        </div>
    )
}
