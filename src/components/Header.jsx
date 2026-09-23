export default function Header({
    restaurantName,
    restaurantDescription,
    restaurantLogo,
    restaurantCover,
    restaurantPhone,
    isOpen,
}) {
    return (
        <header className="relative overflow-hidden rounded-b-4xl text-white shadow-md">
            {restaurantCover ? (
                <img
                    src={restaurantCover}
                    alt={restaurantName}
                    className="absolute inset-0 h-full w-full object-cover"
                />
            ) : (
                <div className="absolute inset-0 bg-(--color-primary)" />
            )}

            {/* تعتيم متدرّج أفقي: غامق عند اليمين (مكان الكلام) وبيفتح تدريجيًا ناحية الشمال */}
            <div className="absolute inset-0 bg-linear-to-l from-black/90 via-black/50 to-transparent" />

            <div className="relative mx-auto max-w-md px-5 pb-6 pt-5 sm:max-w-3xl lg:max-w-6xl">
                {/* الشعار + الاسم */}
                <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 ring-2 ring-white/50">
                        {restaurantLogo ? (
                            <img
                                src={restaurantLogo}
                                alt={restaurantName}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <span className="text-2xl">🍽️</span>
                        )}
                    </div>

                    <div className="min-w-0">
                        <h1 className="truncate text-xl font-extrabold sm:text-2xl">
                            {restaurantName}
                        </h1>
                        <p className="truncate text-sm text-white/80">
                            Restaurant
                        </p>
                    </div>
                </div>

                {/* الوصف + الحالة */}
                <div className="mt-5">
                    {restaurantDescription ? (
                        <p className="text-base font-bold leading-snug sm:text-lg">
                            {restaurantDescription}
                        </p>
                    ) : (
                        <p className="text-base font-bold leading-snug sm:text-lg">
                            أشهى الأطباق
                            <br />
                            بأفضل جودة
                        </p>
                    )}

                    <span
                        className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white ${isOpen ? "bg-green-500" : "bg-red-500"
                            }`}
                    >
                        <span className="h-2 w-2 rounded-full bg-white" />
                        {isOpen ? "مفتوح الآن" : "مغلق الآن"}
                    </span>

                    {restaurantPhone && (
                        <a
                            href={`tel:${restaurantPhone}`}
                            className="mt-2 block text-xs text-white/85 hover:text-white"
                        >
                            {restaurantPhone}
                        </a>
                    )}
                </div>
            </div>
        </header>
    )
}