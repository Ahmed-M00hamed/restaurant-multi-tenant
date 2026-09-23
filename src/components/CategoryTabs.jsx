export default function CategoryTabs({
    categories,
    activeCategory,
    setActiveCategory,
}) {
    if (!categories?.length) {
        return null
    }

    const items = categories.map((category) => ({
        value: category.slug || category.name || category.id,
        label: category.name || category.title || "تصنيف",
        id: category.id,
    }))

    return (
        <div className="flex gap-2 overflow-x-auto px-0.5 pb-2 scrollbar-none">
            {items.map((item) => {
                const isActive = activeCategory === item.value

                return (
                    <button
                        key={item.id ?? item.value}
                        type="button"
                        onClick={() => setActiveCategory(item.value)}
                        className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${isActive
                                ? "bg-(--color-primary) text-white shadow-md"
                                : "bg-(--color-card) text-gray-700 ring-1 ring-black/5"
                            }`}
                    >
                        {item.label}
                    </button>
                )
            })}
        </div>
    )
}
