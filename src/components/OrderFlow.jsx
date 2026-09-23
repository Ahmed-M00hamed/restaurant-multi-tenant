export default function OrderFlow({
    isOpen,
    step,
    setStep,
    orderType,
    setOrderType,

    customerInfo,
    setCustomerInfo,

    deliveryAreas,
    deliveryPrice,
    productsTotal,
    finalTotal,

    paymentMethod,
    setPaymentMethod,

    deliveryEnabled,
    pickupEnabled,
    dineInEnabled,
    cashPaymentEnabled,
    onlinePaymentEnabled,

    tableNumber,
    tableInfo,
    isDineInQr,

    isSubmitting,
    onClose,
    onSubmit,

}) {
    if (!isOpen) {
        return null
    }

    const updateCustomerInfo = (field, value) => {
        setCustomerInfo((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const canContinueFromType = Boolean(orderType)

    const canSubmit =
        orderType === "delivery"
            ? Boolean(
                customerInfo.name?.trim() &&
                customerInfo.phone?.trim() &&
                customerInfo.deliveryArea &&
                customerInfo.address?.trim()
            )
            : orderType === "pickup"
                ? Boolean(
                    customerInfo.name?.trim() &&
                    customerInfo.phone?.trim()
                )
                : orderType === "dine-in"
                    ? Boolean(tableNumber)
                    : false

    const selectedDeliveryArea = deliveryAreas?.find(
        (area) => String(area.name) === String(customerInfo.deliveryArea)
    )

    const displayedDeliveryPrice =
        orderType === "delivery"
            ? Number(selectedDeliveryArea?.price ?? deliveryPrice ?? 0)
            : 0

    const displayedTotal =
        Number(productsTotal || 0) + displayedDeliveryPrice

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Overlay */}
            <button
                type="button"
                onClick={onClose}
                className="fixed inset-0 h-full w-full bg-black/50"
                aria-label="إغلاق"
            />

            <div className="relative flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
                <div className="relative flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
                    {/* Header */}
                    <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-5 py-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                إتمام الطلب
                            </h2>

                            <p className="mt-1 text-xs text-gray-500">
                                {step === 1 ? "اختر طريقة الطلب" : "بيانات الطلب"}
                            </p>
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

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-5 py-5">
                        {step === 1 && (
                            <div>
                                <h3 className="mb-4 text-base font-bold text-gray-900">
                                    طريقة استلام الطلب
                                </h3>

                                <div className="grid gap-3 sm:grid-cols-3">
                                    {deliveryEnabled && (
                                        <button
                                            type="button"
                                            onClick={() => setOrderType("delivery")}
                                            className={`rounded-2xl border p-4 text-start transition ${orderType === "delivery"
                                                    ? "border-(--color-primary) bg-(--color-primary)/10"
                                                    : "border-black/10 bg-white"
                                                }`}
                                        >
                                            <div className="text-2xl">🚚</div>

                                            <div className="mt-3 font-bold">
                                                توصيل
                                            </div>

                                            <p className="mt-1 text-xs text-gray-500">
                                                توصيل الطلب إلى العنوان
                                            </p>
                                        </button>
                                    )}

                                    {pickupEnabled && (
                                        <button
                                            type="button"
                                            onClick={() => setOrderType("pickup")}
                                            className={`rounded-2xl border p-4 text-start transition ${orderType === "pickup"
                                                    ? "border-(--color-primary) bg-(--color-primary)/10"
                                                    : "border-black/10 bg-white"
                                                }`}
                                        >
                                            <div className="text-2xl">🛍️</div>

                                            <div className="mt-3 font-bold">
                                                استلام
                                            </div>

                                            <p className="mt-1 text-xs text-gray-500">
                                                استلم طلبك من المطعم
                                            </p>
                                        </button>
                                    )}

                                    {dineInEnabled && (
                                        <button
                                            type="button"
                                            onClick={() => setOrderType("dine-in")}
                                            className={`rounded-2xl border p-4 text-start transition ${orderType === "dine-in"
                                                    ? "border-(--color-primary) bg-(--color-primary)/10"
                                                    : "border-black/10 bg-white"
                                                }`}
                                        >
                                            <div className="text-2xl">🍽️</div>

                                            <div className="mt-3 font-bold">
                                                داخل المطعم
                                            </div>

                                            <p className="mt-1 text-xs text-gray-500">
                                                اطلب على طاولتك
                                            </p>
                                        </button>
                                    )}
                                </div>

                                {orderType === "dine-in" && (
                                    <div className="mt-5 rounded-2xl bg-gray-50 p-4">
                                        <div className="text-sm font-bold text-gray-800">
                                            الطاولة
                                        </div>

                                        {isDineInQr && tableInfo ? (
                                            <div className="mt-3 rounded-xl bg-white p-4 ring-1 ring-black/5">
                                                <div className="text-sm text-gray-500">
                                                    أنت تطلب من
                                                </div>

                                                <div className="mt-1 text-lg font-bold">
                                                    {tableInfo.name ||
                                                        `طاولة ${tableInfo.table_number}`}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-3 rounded-xl bg-white p-4 text-sm text-gray-600">
                                                افتح رابط الـQR الخاص بالطاولة لبدء طلب
                                                داخل المطعم.
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    disabled={!canContinueFromType}
                                    onClick={() => setStep(2)}
                                    className="mt-6 w-full rounded-2xl bg-(--color-primary) px-5 py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    متابعة
                                </button>
                            </div>
                        )}

                        {step === 2 && (
                            <div>
                                {/* Delivery */}
                                {orderType === "delivery" && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold">
                                                الاسم
                                            </label>

                                            <input
                                                type="text"
                                                value={customerInfo.name || ""}
                                                onChange={(e) =>
                                                    updateCustomerInfo("name", e.target.value)
                                                }
                                                placeholder="اكتب اسمك"
                                                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-(--color-primary)"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-semibold">
                                                رقم الهاتف
                                            </label>

                                            <input
                                                type="tel"
                                                value={customerInfo.phone || ""}
                                                onChange={(e) =>
                                                    updateCustomerInfo("phone", e.target.value)
                                                }
                                                placeholder="01xxxxxxxxx"
                                                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-(--color-primary)"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-semibold">
                                                منطقة التوصيل
                                            </label>

                                            <select
                                                value={customerInfo.deliveryArea || ""}
                                                onChange={(e) =>
                                                    updateCustomerInfo(
                                                        "deliveryArea",
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-(--color-primary)"
                                            >
                                                <option value="">
                                                    اختر منطقة التوصيل
                                                </option>

                                                {deliveryAreas?.map((area) => (
                                                    <option
                                                        key={area.id}
                                                        value={area.name}
                                                    >
                                                        {area.name} —{" "}
                                                        {Number(area.price || 0).toLocaleString(
                                                            "ar-EG"
                                                        )}{" "}
                                                        جنيه
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-semibold">
                                                العنوان
                                            </label>

                                            <textarea
                                                value={customerInfo.address || ""}
                                                onChange={(e) =>
                                                    updateCustomerInfo(
                                                        "address",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="اكتب العنوان بالتفصيل"
                                                rows={3}
                                                className="w-full resize-none rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-(--color-primary)"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-semibold">
                                                ملاحظات
                                            </label>

                                            <textarea
                                                value={customerInfo.notes || ""}
                                                onChange={(e) =>
                                                    updateCustomerInfo(
                                                        "notes",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="أي ملاحظات إضافية؟"
                                                rows={2}
                                                className="w-full resize-none rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-(--color-primary)"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Pickup */}
                                {orderType === "pickup" && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold">
                                                الاسم
                                            </label>

                                            <input
                                                type="text"
                                                value={customerInfo.name || ""}
                                                onChange={(e) =>
                                                    updateCustomerInfo("name", e.target.value)
                                                }
                                                placeholder="اكتب اسمك"
                                                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-(--color-primary)"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-semibold">
                                                رقم الهاتف
                                            </label>

                                            <input
                                                type="tel"
                                                value={customerInfo.phone || ""}
                                                onChange={(e) =>
                                                    updateCustomerInfo("phone", e.target.value)
                                                }
                                                placeholder="01xxxxxxxxx"
                                                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-(--color-primary)"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-semibold">
                                                ملاحظات
                                            </label>

                                            <textarea
                                                value={customerInfo.notes || ""}
                                                onChange={(e) =>
                                                    updateCustomerInfo(
                                                        "notes",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="أي ملاحظات إضافية؟"
                                                rows={3}
                                                className="w-full resize-none rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-(--color-primary)"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Dine in */}
                                {orderType === "dine-in" && (
                                    <div className="space-y-4">
                                        {tableInfo ? (
                                            <div className="rounded-2xl bg-gray-50 p-5">
                                                <div className="text-sm text-gray-500">
                                                    الطاولة
                                                </div>

                                                <div className="mt-1 text-xl font-bold">
                                                    {tableInfo.name ||
                                                        `طاولة ${tableInfo.table_number}`}
                                                </div>

                                                {tableInfo.capacity && (
                                                    <div className="mt-1 text-xs text-gray-500">
                                                        السعة: {tableInfo.capacity} أفراد
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                                                لم يتم التعرف على الطاولة.
                                            </div>
                                        )}

                                        <div>
                                            <label className="mb-2 block text-sm font-semibold">
                                                ملاحظات
                                            </label>

                                            <textarea
                                                value={customerInfo.notes || ""}
                                                onChange={(e) =>
                                                    updateCustomerInfo(
                                                        "notes",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="أي ملاحظات على الطلب؟"
                                                rows={3}
                                                className="w-full resize-none rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-(--color-primary)"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Payment */}
                                <div className="mt-6">
                                    <h3 className="mb-3 text-sm font-bold">
                                        طريقة الدفع
                                    </h3>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {cashPaymentEnabled && (
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod("cash")}
                                                className={`rounded-xl border p-4 text-start ${paymentMethod === "cash"
                                                        ? "border-(--color-primary) bg-(--color-primary)/10"
                                                        : "border-black/10"
                                                    }`}
                                            >
                                                <div className="font-bold">
                                                    💵 كاش
                                                </div>

                                                <div className="mt-1 text-xs text-gray-500">
                                                    الدفع عند الاستلام
                                                </div>
                                            </button>
                                        )}

                                        {onlinePaymentEnabled && (
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod("online")}
                                                className={`rounded-xl border p-4 text-start ${paymentMethod === "online"
                                                        ? "border-(--color-primary) bg-(--color-primary)/10"
                                                        : "border-black/10"
                                                    }`}
                                            >
                                                <div className="font-bold">
                                                    💳 دفع أونلاين
                                                </div>

                                                <div className="mt-1 text-xs text-gray-500">
                                                    الدفع الإلكتروني
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Order Summary */}
                                <div className="mt-6 rounded-2xl bg-gray-50 p-4">
                                    <h3 className="mb-3 font-bold">
                                        ملخص الطلب
                                    </h3>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">
                                                المنتجات
                                            </span>

                                            <span className="font-semibold">
                                                {Number(productsTotal || 0).toLocaleString(
                                                    "ar-EG"
                                                )}{" "}
                                                جنيه
                                            </span>
                                        </div>

                                        {orderType === "delivery" && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">
                                                    التوصيل
                                                </span>

                                                <span className="font-semibold">
                                                    {displayedDeliveryPrice.toLocaleString(
                                                        "ar-EG"
                                                    )}{" "}
                                                    جنيه
                                                </span>
                                            </div>
                                        )}

                                        <div className="mt-3 flex justify-between border-t border-black/10 pt-3 text-base">
                                            <span className="font-bold">
                                                الإجمالي
                                            </span>

                                            <span className="font-bold text-(--color-primary)">
                                                {Number(displayedTotal || finalTotal || 0).toLocaleString(
                                                    "ar-EG"
                                                )}{" "}
                                                جنيه
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {step === 2 && (
                        <div className="flex shrink-0 gap-3 border-t border-black/10 bg-white px-5 py-4">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                disabled={isSubmitting}
                                className="flex-1 rounded-2xl border border-black/10 px-4 py-3.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                            >
                                رجوع
                            </button>

                            <button
                                type="button"
                                onClick={onSubmit}
                                disabled={!canSubmit || isSubmitting}
                                className="flex-[2] rounded-2xl bg-(--color-primary) px-4 py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {isSubmitting ? "جاري إرسال الطلب..." : "تأكيد الطلب"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
