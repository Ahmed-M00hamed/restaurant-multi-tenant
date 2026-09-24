const FINAL_STATUSES = ["delivered", "cancelled"]
const CANCELLABLE_STATUSES = ["pending", "processing"]


const TYPE_LABELS = {
    delivery: "توصيل",
    pickup: "استلام من المطعم",
    "dine-in": "داخل المطعم",
}

function getTrackingSteps(orderType) {
    if (orderType === "dine-in") {
        return [
            {
                status: "pending",
                label: "تم استلام الطلب",
            },
            {
                status: "processing",
                label: "جاري تجهيز الطلب",
            },
            {
                status: "shipped",
                label: "الطلب جاهز",
            },
            {
                status: "delivered",
                label: "تم تقديم الطلب",
            },
        ]
    }

    if (orderType === "pickup") {
        return [
            {
                status: "pending",
                label: "تم استلام الطلب",
            },
            {
                status: "processing",
                label: "جاري تجهيز الطلب",
            },
            {
                status: "delivered",
                label: "الطلب جاهز للاستلام",
            },
        ]
    }

    return [
        {
            status: "pending",
            label: "تم استلام الطلب",
        },
        {
            status: "processing",
            label: "جاري تجهيز الطلب",
        },
        {
            status: "shipped",
            label: "الطلب في الطريق",
        },
        {
            status: "delivered",
            label: "تم تسليم الطلب",
        },
    ]
}

function getStatusHeadline(status, orderType) {
    if (status === "pending") {
        return "تم استلام طلبك"
    }

    if (status === "processing") {
        return "جاري تجهيز طلبك"
    }

    if (status === "shipped") {
        return orderType === "delivery"
            ? "طلبك في الطريق"
            : "طلبك جاهز"
    }

    if (status === "delivered") {
        return orderType === "dine-in"
            ? "طلبك جاهز"
            : orderType === "pickup"
                ? "طلبك جاهز للاستلام"
                : "تم تسليم طلبك"
    }

    if (status === "cancelled") {
        return "تم إلغاء الطلب"
    }

    return "حالة الطلب"
}

export default function OrderTracking({
    isOpen,
    trackedOrder,
    orderStatus,
    isTrackingLoading,
    trackingError,
    onClose,
    onCancel,
}) {
    if (!isOpen) {
        return null
    }

    const steps = getTrackingSteps(trackedOrder?.type)
    const currentIndex = steps.findIndex(
        (step) => step.status === orderStatus
    )

    const isFinal = FINAL_STATUSES.includes(orderStatus)
    const canCancel = CANCELLABLE_STATUSES.includes(orderStatus)

    return (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
            <button
                type="button"
                onClick={onClose}
                className="fixed inset-0 h-full w-full bg-black/50"
                aria-label="إغلاق تتبع الطلب"
            />

            <div className="relative flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
                <div className="relative w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                تتبع الطلب
                            </h2>

                            {trackedOrder?.number && (
                                <p className="mt-1 text-xs text-gray-500">
                                    رقم الطلب: {trackedOrder.number}
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-700"
                            aria-label="إغلاق"
                        >
                            ×
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-5 py-6">
                        {isTrackingLoading && !orderStatus ? (
                            <div className="py-10 text-center">
                                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-(--color-primary)" />

                                <p className="mt-4 text-sm text-gray-500">
                                    جاري تحميل حالة الطلب...
                                </p>
                            </div>
                        ) : !trackedOrder ? (
                            <div className="py-10 text-center">
                                <div className="text-4xl">📦</div>

                                <h3 className="mt-4 font-bold text-gray-800">
                                    لا يوجد طلب قيد التتبع
                                </h3>
                            </div>
                        ) : (
                            <>
                                {/* Headline */}
                                <div className="rounded-2xl bg-(--color-primary)/10 p-5 text-center">
                                    <div className="text-3xl">
                                        {orderStatus === "cancelled"
                                            ? "❌"
                                            : orderStatus === "delivered"
                                                ? "✅"
                                                : "📦"}
                                    </div>

                                    <h3 className="mt-3 text-xl font-bold text-gray-900">
                                        {getStatusHeadline(
                                            orderStatus,
                                            trackedOrder.type
                                        )}
                                    </h3>

                                    <p className="mt-1 text-sm text-gray-500">
                                        {TYPE_LABELS[trackedOrder.type] ||
                                            trackedOrder.type}
                                    </p>

                                    {trackedOrder.table && (
                                        <p className="mt-2 text-sm font-semibold text-gray-700">
                                            طاولة رقم {trackedOrder.table}
                                        </p>
                                    )}
                                </div>

                                {/* Error */}
                                {trackingError && (
                                    <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                                        {trackingError}
                                    </div>
                                )}

                                {/* Steps */}
                                {!isFinal && (
                                    <div className="mt-6">
                                        {steps.map((step, index) => {
                                            const isCompleted =
                                                currentIndex >= 0 &&
                                                index <= currentIndex

                                            const isCurrent =
                                                step.status === orderStatus

                                            return (
                                                <div
                                                    key={step.status}
                                                    className="flex gap-3"
                                                >
                                                    <div className="flex flex-col items-center">
                                                        <div
                                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isCompleted
                                                                ? "bg-(--color-primary) text-white"
                                                                : "bg-gray-100 text-gray-400"
                                                                }`}
                                                        >
                                                            {isCompleted ? "✓" : index + 1}
                                                        </div>

                                                        {index < steps.length - 1 && (
                                                            <div
                                                                className={`my-1 min-h-8 w-0.5 ${currentIndex > index
                                                                    ? "bg-(--color-primary)"
                                                                    : "bg-gray-200"
                                                                    }`}
                                                            />
                                                        )}
                                                    </div>

                                                    <div className="pb-6">
                                                        <p
                                                            className={`text-sm font-bold ${isCurrent
                                                                ? "text-(--color-primary)"
                                                                : isCompleted
                                                                    ? "text-gray-800"
                                                                    : "text-gray-400"
                                                                }`}
                                                        >
                                                            {step.label}
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {orderStatus === "cancelled" && (
                                    <div className="mt-6 rounded-2xl bg-red-50 p-4 text-center">
                                        <p className="font-bold text-red-700">
                                            تم إلغاء هذا الطلب.
                                        </p>
                                    </div>
                                )}

                                {orderStatus === "delivered" && (
                                    <div className="mt-6 rounded-2xl bg-green-50 p-4 text-center">
                                        <p className="font-bold text-green-700">
                                            تم الانتهاء من الطلب بنجاح.
                                        </p>
                                    </div>
                                )}

                                {/* Cancel */}
                                {canCancel && (
                                    <button
                                        type="button"
                                        onClick={onCancel}
                                        className="mt-6 w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
                                    >
                                        إلغاء الطلب
                                    </button>
                                )}

                                <div className="mt-4 text-center">
                                    <p className="text-xs text-gray-400">
                                        يتم تحديث حالة الطلب تلقائيًا
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}