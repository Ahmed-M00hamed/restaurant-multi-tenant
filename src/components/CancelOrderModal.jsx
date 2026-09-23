const CANCEL_REASONS = [
    "غيّرت رأيي",
    "طلبت بالغلط",
    "عايز أعدّل في الطلب وأطلب من جديد",
    "مش هقدر أستلم الطلب",
    "سبب آخر",
]

const OTHER_CANCEL_REASON = "سبب آخر"

export default function CancelOrderModal({
    isOpen,
    cancelReason,
    setCancelReason,
    cancelNote,
    setCancelNote,
    isCancelling,
    onClose,
    onConfirm,
}) {
    if (!isOpen) {
        return null
    }

    const canConfirm =
        Boolean(cancelReason) &&
        (cancelReason !== OTHER_CANCEL_REASON ||
            Boolean(cancelNote?.trim()))

    return (
        <div className="fixed inset-0 z-70 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
            <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            إلغاء الطلب
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            اختر سبب إلغاء الطلب
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isCancelling}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-lg text-gray-700 disabled:opacity-50"
                        aria-label="إغلاق"
                    >
                        ×
                    </button>
                </div>

                <div className="mt-5 space-y-2">
                    {CANCEL_REASONS.map((reason) => (
                        <label
                            key={reason}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${cancelReason === reason
                                    ? "border-red-400 bg-red-50"
                                    : "border-black/10"
                                }`}
                        >
                            <input
                                type="radio"
                                name="cancel-reason"
                                value={reason}
                                checked={cancelReason === reason}
                                onChange={(e) =>
                                    setCancelReason(e.target.value)
                                }
                                disabled={isCancelling}
                                className="h-4 w-4"
                            />

                            <span className="text-sm font-medium text-gray-800">
                                {reason}
                            </span>
                        </label>
                    ))}
                </div>

                {cancelReason === OTHER_CANCEL_REASON && (
                    <div className="mt-4">
                        <label className="mb-2 block text-sm font-semibold text-gray-800">
                            اكتب السبب
                        </label>

                        <textarea
                            value={cancelNote}
                            onChange={(e) => setCancelNote(e.target.value)}
                            disabled={isCancelling}
                            rows={3}
                            placeholder="اكتب سبب الإلغاء..."
                            className="w-full resize-none rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-red-400 disabled:bg-gray-100"
                        />
                    </div>
                )}

                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isCancelling}
                        className="flex-1 rounded-xl border border-black/10 px-4 py-3 text-sm font-bold text-gray-700 disabled:opacity-50"
                    >
                        رجوع
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={!canConfirm || isCancelling}
                        className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {isCancelling ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
                    </button>
                </div>
            </div>
        </div>
    )
}