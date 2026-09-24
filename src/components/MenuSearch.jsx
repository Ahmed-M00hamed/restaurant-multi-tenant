export default function MenuSearch({
    searchTerm,
    setSearchTerm,
}) {
    return (
        <div className="relative w-full">
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث عن منتج..."
                className="w-full rounded-2xl border border-black/10 bg-(--color-card) px-4 py-3 pe-11 text-sm outline-none transition focus:border-(--color-primary)"
            />

            <svg
                className="pointer-events-none absolute inset-e-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
            </svg>
        </div>
    )
}
