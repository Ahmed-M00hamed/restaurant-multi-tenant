export default function Header({
    restaurantName,
    restaurantDescription,
    restaurantLogo,
    restaurantCover,
    restaurantPhone,
    isOpen,
    overlay,
}) {
    return (
        <header className="relative overflow-hidden">
            {restaurantCover && (
                <img
                    src={restaurantCover}
                    alt={restaurantName}
                    className="absolute inset-0 h-full w-full object-cover"
                />
            )}

            <div
                className="absolute inset-0"
                style={{
                    background: overlay,
                }}
            />

            <div className="relative mx-auto flex min-h-[220px] max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
                <div className="flex w-full flex-col items-center text-center text-white">
                    {restaurantLogo && (
                        <img
                            src={restaurantLogo}
                            alt={restaurantName}
                            className="mb-4 h-24 w-24 rounded-full border-4 border-white/80 bg-white object-cover shadow-lg"
                        />
                    )}

                    <h1 className="text-3xl font-bold sm:text-4xl">
                        {restaurantName}
                    </h1>

                    {restaurantDescription && (
                        <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">
                            {restaurantDescription}
                        </p>
                    )}

                    <div className="mt-4">
                        <span
                            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${isOpen
                                    ? "bg-green-500/90 text-white"
                                    : "bg-red-500/90 text-white"
                                }`}
                        >
                            <span
                                className={`me-2 h-2.5 w-2.5 rounded-full ${isOpen ? "bg-white" : "bg-white"
                                    }`}
                            />

                            {isOpen ? "مفتوح الآن" : "مغلق الآن"}
                        </span>
                    </div>

                    {restaurantPhone && (
                        <a
                            href={`tel:${restaurantPhone}`}
                            className="mt-3 text-sm text-white/90 transition hover:text-white"
                        >
                            {restaurantPhone}
                        </a>
                    )}
                </div>
            </div>
        </header>
    )
}