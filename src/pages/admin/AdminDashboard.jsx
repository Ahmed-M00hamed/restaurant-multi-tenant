import { useEffect, useState } from "react"
import { useOutletContext } from "react-router-dom"
import QRCode from "react-qr-code"
import { supabase } from "../../lib/supabase"
import { ORDERS_CHANGED_EVENT } from "./useNewOrderAlerts"

/* =========================================================
   فلتر المبيعات
========================================================= */

const RANGE_OPTIONS = [
    { value: "today", label: "اليوم" },
    { value: "week", label: "الأسبوع" },
    { value: "month", label: "الشهر" },
    { value: "year", label: "السنة" },
    { value: "custom", label: "مخصص" },
]

const DAY_MS = 24 * 60 * 60 * 1000

const startOfDay = (date) => {
    const result = new Date(date)
    result.setHours(0, 0, 0, 0)
    return result
}

const endOfDay = (date) => {
    const result = new Date(date)
    result.setHours(23, 59, 59, 999)
    return result
}

const toInputDate = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")

    return `${y}-${m}-${d}`
}

const parseInputDate = (value) => {
    if (!value) return null

    const [y, m, d] = value.split("-").map(Number)

    if (!y || !m || !d) return null

    return new Date(y, m - 1, d)
}

const getRangeDates = (range, customFrom, customTo) => {
    const now = new Date()

    if (range === "today") {
        return {
            start: startOfDay(now),
            end: endOfDay(now),
        }
    }

    if (range === "week") {
        const start = startOfDay(now)
        start.setDate(start.getDate() - 6)

        return {
            start,
            end: endOfDay(now),
        }
    }

    if (range === "month") {
        return {
            start: new Date(now.getFullYear(), now.getMonth(), 1),
            end: endOfDay(now),
        }
    }

    if (range === "year") {
        return {
            start: new Date(now.getFullYear(), 0, 1),
            end: endOfDay(now),
        }
    }

    if (!customFrom || !customTo) return null

    const fromDate = parseInputDate(customFrom)
    const toDate = parseInputDate(customTo)

    if (!fromDate || !toDate) return null

    const from = startOfDay(fromDate)
    const to = endOfDay(toDate)

    return from <= to
        ? { start: from, end: to }
        : { start: startOfDay(to), end: endOfDay(from) }
}

const formatDate = (date) =>
    date.toLocaleDateString("ar-EG", {
        day: "numeric",
        month: "long",
        year: "numeric",
    })

const formatMoney = (value) =>
    Number(value || 0).toLocaleString("ar-EG", {
        maximumFractionDigits: 2,
    })

/* =========================================================
   بناء أعمدة الرسم البياني
========================================================= */

const buildBuckets = (start, end) => {
    const days =
        Math.round(
            (startOfDay(end) - startOfDay(start)) / DAY_MS
        ) + 1

    // يوم واحد = 24 ساعة
    if (days <= 1) {
        return {
            buckets: Array.from({ length: 24 }, (_, hour) => ({
                label:
                    hour === 0
                        ? "12ص"
                        : hour < 12
                            ? `${hour}ص`
                            : hour === 12
                                ? "12م"
                                : `${hour - 12}م`,
                total: 0,
            })),
            indexOf: (date) => date.getHours(),
            labelEvery: 3,
        }
    }

    // حتى 62 يوم = أيام
    if (days <= 62) {
        return {
            buckets: Array.from({ length: days }, (_, i) => {
                const day = new Date(start)
                day.setDate(start.getDate() + i)

                return {
                    label: `${day.getDate()}/${day.getMonth() + 1}`,
                    total: 0,
                }
            }),

            indexOf: (date) =>
                Math.round(
                    (startOfDay(date) - startOfDay(start)) / DAY_MS
                ),

            labelEvery:
                days <= 10
                    ? 1
                    : days <= 31
                        ? 4
                        : 8,
        }
    }

    // أكثر من 62 يوم = شهور
    const months =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth()) +
        1

    return {
        buckets: Array.from({ length: months }, (_, i) => {
            const month = new Date(
                start.getFullYear(),
                start.getMonth() + i,
                1
            )

            return {
                label: month.toLocaleDateString("ar-EG", {
                    month: "short",
                }),
                total: 0,
            }
        }),

        indexOf: (date) =>
            (date.getFullYear() - start.getFullYear()) * 12 +
            (date.getMonth() - start.getMonth()),

        labelEvery: 1,
    }
}

/* =========================================================
   Dashboard
========================================================= */

function AdminDashboard() {
    const { authData, restaurant } = useOutletContext() || {}

    const restaurantId = authData?.restaurant_id || null
    const restaurantSlug = restaurant?.slug || ""

    const menuUrl = restaurantSlug
        ? new URL(
            `/${encodeURIComponent(restaurantSlug)}`,
            window.location.origin
        ).toString()
        : ""

    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [linkCopied, setLinkCopied] = useState(false)

    const [range, setRange] = useState("today")

    const [customFrom, setCustomFrom] = useState(() =>
        toInputDate(new Date())
    )

    const [customTo, setCustomTo] = useState(() =>
        toInputDate(new Date())
    )

    /* =====================================================
       تحميل الطلبات
    ===================================================== */

    useEffect(() => {
        if (!restaurantId) {
            return
        }

        let cancelled = false

        const load = async () => {
            const { data, error } = await supabase
                .from("orders")
                .select("*")
                .eq("restaurant_id", restaurantId)
                .order("created_at", {
                    ascending: false,
                })

            if (cancelled) return

            if (error) {
                console.error(
                    "Dashboard orders error:",
                    error
                )

                setLoading(false)
                return
            }

            setOrders(data || [])
            setLoading(false)
        }

        load()

        return () => {
            cancelled = true
        }
    }, [restaurantId])

    /* =====================================================
       تحديث الطلبات عند وصول طلب جديد
    ===================================================== */

    useEffect(() => {
        if (!restaurantId) return

        let cancelled = false

        const refresh = async () => {
            const { data, error } = await supabase
                .from("orders")
                .select("*")
                .eq("restaurant_id", restaurantId)
                .order("created_at", {
                    ascending: false,
                })

            if (cancelled) return

            if (error) {
                console.error(
                    "Dashboard refresh error:",
                    error
                )

                return
            }

            setOrders(data || [])
        }

        window.addEventListener(
            ORDERS_CHANGED_EVENT,
            refresh
        )

        return () => {
            cancelled = true

            window.removeEventListener(
                ORDERS_CHANGED_EVENT,
                refresh
            )
        }
    }, [restaurantId])

    /* =====================================================
       نسخ رابط المنيو
    ===================================================== */

    const copyMenuLink = () => {
        if (!menuUrl) return

        navigator.clipboard
            .writeText(menuUrl)
            .then(() => {
                setLinkCopied(true)

                window.setTimeout(() => {
                    setLinkCopied(false)
                }, 2000)
            })
            .catch((error) => {
                console.error(
                    "Copy menu link error:",
                    error
                )
            })
    }

    /* =====================================================
       بيانات الطلبات
    ===================================================== */

    const totalOrders = orders.length

    const newOrders = orders.filter(
        (order) => order.status === "pending"
    ).length

    const processingOrders = orders.filter(
        (order) =>
            order.status === "processing" ||
            order.status === "shipped"
    ).length

    const completedOrders = orders.filter(
        (order) => order.status === "delivered"
    ).length

    /* =====================================================
       المبيعات
    ===================================================== */

    const rangeDates = getRangeDates(
        range,
        customFrom,
        customTo
    )

    const rangeOrders = rangeDates
        ? orders.filter((order) => {
            const date = new Date(order.created_at)

            return (
                date >= rangeDates.start &&
                date <= rangeDates.end
            )
        })
        : []

    const soldOrders = rangeOrders.filter(
        (order) => order.status !== "cancelled"
    )

    const cancelledInRange =
        rangeOrders.length - soldOrders.length

    const totalSales = soldOrders.reduce(
        (total, order) =>
            total + Number(order.total_price || 0),
        0
    )

    const deliveryOrders = soldOrders.filter(
        (order) => order.order_type === "delivery"
    )

    const deliveryFees = deliveryOrders.reduce(
        (total, order) =>
            total + Number(order.delivery_price || 0),
        0
    )

    const averageOrder =
        soldOrders.length > 0
            ? totalSales / soldOrders.length
            : 0

    /* =====================================================
       المبيعات حسب نوع الطلب
    ===================================================== */

    const salesByType = [
        "delivery",
        "pickup",
        "dine-in",
    ].map((type) => {
        const typeOrders = soldOrders.filter(
            (order) => order.order_type === type
        )

        return {
            type,

            label:
                type === "delivery"
                    ? "🛵 توصيل"
                    : type === "pickup"
                        ? "🛍️ استلام"
                        : "🍽️ داخل المطعم",

            count: typeOrders.length,

            total: typeOrders.reduce(
                (sum, order) =>
                    sum + Number(order.total_price || 0),
                0
            ),
        }
    })

    /* =====================================================
       الرسم البياني
    ===================================================== */

    let chart = null

    if (rangeDates) {
        const {
            buckets,
            indexOf,
            labelEvery,
        } = buildBuckets(
            rangeDates.start,
            rangeDates.end
        )

        for (const order of soldOrders) {
            const index = indexOf(
                new Date(order.created_at)
            )

            if (buckets[index]) {
                buckets[index].total += Number(
                    order.total_price || 0
                )
            }
        }

        chart = {
            buckets,
            labelEvery,
            max: Math.max(
                ...buckets.map(
                    (bucket) => bucket.total
                ),
                0
            ),
        }
    }

    /* =====================================================
       الإحصائيات
    ===================================================== */

    const stats = [
        {
            title: "إجمالي الطلبات",
            value: totalOrders,
            icon: "📦",
        },
        {
            title: "طلبات جديدة",
            value: newOrders,
            icon: "🆕",
        },
        {
            title: "قيد التجهيز",
            value: processingOrders,
            icon: "🚚",
        },
        {
            title: "طلبات مكتملة",
            value: completedOrders,
            icon: "✅",
        },
    ]

    /* =====================================================
       حالات الطلب
    ===================================================== */

    const getStatusLabel = (status) => {
        const labels = {
            pending: "جديد",
            processing: "جاري التجهيز",
            shipped: "خرج للتوصيل",
            delivered: "تم التسليم",
            cancelled: "ملغي",
        }

        return labels[status] || status
    }

    const getStatusClass = (status) => {
        const classes = {
            pending:
                "bg-yellow-100 text-yellow-800",

            processing:
                "bg-blue-100 text-blue-800",

            shipped:
                "bg-purple-100 text-purple-800",

            delivered:
                "bg-green-100 text-green-800",

            cancelled:
                "bg-red-100 text-red-800",
        }

        return (
            classes[status] ||
            "bg-gray-100 text-gray-800"
        )
    }

    /* =====================================================
       طباعة التقرير
    ===================================================== */

    const printSalesReport = () => {
        if (!rangeDates) {
            alert("اختر فترة صحيحة الأول.")
            return
        }

        const periodLabel =
            range === "today"
                ? formatDate(rangeDates.start)
                : `من ${formatDate(
                    rangeDates.start
                )} إلى ${formatDate(
                    rangeDates.end
                )}`

        const rangeLabel =
            RANGE_OPTIONS.find(
                (option) =>
                    option.value === range
            )?.label || ""

        const salesByTypeRows = salesByType
            .map(
                (item) => `
                    <tr>
                        <td>${item.label}</td>
                        <td>${item.count.toLocaleString(
                            "ar-EG"
                        )}</td>
                        <td>${formatMoney(
                            item.total
                        )} جنيه</td>
                    </tr>
                `
            )
            .join("")

        const printWindow = window.open(
            "",
            "_blank"
        )

        if (!printWindow) {
            alert(
                "المتصفح منع فتح نافذة الطباعة، من فضلك اسمح بالنوافذ المنبثقة."
            )

            return
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8" />
                <title>
                    تقرير المبيعات - ${restaurant?.name || ""}
                </title>

                <style>
                    * {
                        box-sizing: border-box;
                    }

                    body {
                        font-family:
                            "Segoe UI",
                            Tahoma,
                            Arial,
                            sans-serif;

                        padding: 32px;
                        color: #111;
                    }

                    h1 {
                        margin: 0 0 4px;
                        font-size: 22px;
                    }

                    .subtitle {
                        color: #666;
                        margin: 0 0 24px;
                        font-size: 14px;
                    }

                    .cards {
                        display: grid;
                        grid-template-columns:
                            repeat(2, 1fr);

                        gap: 12px;
                        margin-bottom: 24px;
                    }

                    .card {
                        border: 1px solid #ddd;
                        border-radius: 12px;
                        padding: 14px 16px;
                    }

                    .card p {
                        margin: 0;
                    }

                    .card .label {
                        font-size: 12px;
                        color: #666;
                        margin-bottom: 6px;
                    }

                    .card .value {
                        font-size: 20px;
                        font-weight: bold;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 8px;
                    }

                    th,
                    td {
                        border: 1px solid #ddd;
                        padding: 10px 12px;
                        text-align: right;
                        font-size: 14px;
                    }

                    th {
                        background: #f5f5f5;
                    }

                    .footer {
                        margin-top: 32px;
                        font-size: 12px;
                        color: #999;
                        text-align: center;
                    }

                    @media print {
                        body {
                            padding: 0;
                        }
                    }
                </style>
            </head>

            <body>
                <h1>
                    تقرير المبيعات —
                    ${restaurant?.name || ""}
                </h1>

                <p class="subtitle">
                    الفترة:
                    ${rangeLabel}
                    (${periodLabel})
                </p>

                <div class="cards">
                    <div class="card">
                        <p class="label">
                            إجمالي المبيعات
                        </p>

                        <p class="value">
                            ${formatMoney(
                                totalSales
                            )}
                            جنيه
                        </p>
                    </div>

                    <div class="card">
                        <p class="label">
                            عدد الطلبات المكتملة
                        </p>

                        <p class="value">
                            ${soldOrders.length.toLocaleString(
                                "ar-EG"
                            )}
                        </p>
                    </div>

                    <div class="card">
                        <p class="label">
                            متوسط قيمة الطلب
                        </p>

                        <p class="value">
                            ${formatMoney(
                                averageOrder
                            )}
                            جنيه
                        </p>
                    </div>

                    <div class="card">
                        <p class="label">
                            رسوم التوصيل
                        </p>

                        <p class="value">
                            ${formatMoney(
                                deliveryFees
                            )}
                            جنيه
                        </p>
                    </div>

                    <div class="card">
                        <p class="label">
                            طلبات ملغاة في الفترة
                        </p>

                        <p class="value">
                            ${cancelledInRange.toLocaleString(
                                "ar-EG"
                            )}
                        </p>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>نوع الطلب</th>
                            <th>عدد الطلبات</th>
                            <th>الإجمالي</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${salesByTypeRows}
                    </tbody>
                </table>

                <p class="footer">
                    تم إنشاء هذا التقرير بتاريخ
                    ${new Date().toLocaleString(
                        "ar-EG"
                    )}
                </p>
            </body>
            </html>
        `)

        printWindow.document.close()

        printWindow.onload = () => {
            printWindow.focus()
            printWindow.print()
        }
    }

    /* =====================================================
       Loading
    ===================================================== */

    if (loading) {
        return (
            <div
                dir="rtl"
                className="min-h-screen flex items-center justify-center"
            >
                <div className="text-center">
                    <div className="text-lg font-semibold">
                        جاري تحميل لوحة التحكم...
                    </div>

                    <p className="text-sm opacity-60 mt-1">
                        لحظات من فضلك
                    </p>
                </div>
            </div>
        )
    }

    /* =====================================================
       UI
    ===================================================== */

    return (
        <div
            dir="rtl"
            className="min-h-screen p-4 md:p-8"
        >
            <div className="max-w-7xl mx-auto">

                {/* Header */}

                <div className="mb-8">
                    <p className="text-sm opacity-50 mb-1">
                        MenuFlow Admin
                    </p>

                    <h1 className="text-3xl md:text-4xl font-bold">
                        الرئيسية
                    </h1>

                    <p className="opacity-60 mt-2">
                        نظرة سريعة على نشاط المطعم
                    </p>
                </div>

                {/* رابط المنيو + QR */}

                <div className="mb-6 bg-(--color-card) rounded-2xl p-5 md:p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">

                        {menuUrl ? (
                            <div className="bg-white p-3 rounded-xl shrink-0">
                                <QRCode
                                    value={menuUrl}
                                    size={104}
                                />
                            </div>
                        ) : (
                            <div className="w-28 h-28 rounded-xl bg-(--color-background) flex items-center justify-center text-3xl shrink-0">
                                🔗
                            </div>
                        )}

                        <div className="flex-1 min-w-0 text-center sm:text-right w-full">

                            <h2 className="font-bold text-lg">
                                رابط المنيو بتاعك
                            </h2>

                            <p className="text-sm opacity-60 mt-1">
                                شارك اللينك ده أو اطبع الـ QR وحطه في المطعم عشان العملاء يوصلوا للمنيو بسهولة
                            </p>

                            {menuUrl ? (
                                <>
                                    <div className="mt-3 flex items-center gap-2 bg-(--color-background) rounded-xl px-3 py-2.5 overflow-hidden">

                                        <input
                                            readOnly
                                            value={menuUrl}
                                            onFocus={(e) =>
                                                e.target.select()
                                            }
                                            className="flex-1 min-w-0 bg-transparent outline-none text-sm truncate"
                                            dir="ltr"
                                        />

                                    </div>

                                    <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">

                                        <button
                                            type="button"
                                            onClick={copyMenuLink}
                                            className="px-4 py-2 rounded-xl text-sm font-bold bg-(--color-primary) text-white transition hover:opacity-90"
                                        >
                                            {linkCopied
                                                ? "✅ تم النسخ"
                                                : "📋 نسخ الرابط"}
                                        </button>

                                        <a
                                            href={menuUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-4 py-2 rounded-xl text-sm font-bold border transition hover:bg-(--color-background)"
                                        >
                                            🔗 فتح المنيو
                                        </a>

                                    </div>
                                </>
                            ) : (
                                <p className="mt-3 text-sm text-red-500">
                                    تعذّر إنشاء الرابط، تأكد إن بيانات المطعم محمّلة صح.
                                </p>
                            )}

                        </div>
                    </div>
                </div>

                {/* Stats */}

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

                    {stats.map((stat) => (
                        <div
                            key={stat.title}
                            className="bg-(--color-card) rounded-2xl p-5 shadow-sm"
                        >
                            <div className="flex items-center justify-between">

                                <div>
                                    <p className="text-sm opacity-60">
                                        {stat.title}
                                    </p>

                                    <p className="text-3xl font-bold mt-2">
                                        {stat.value}
                                    </p>
                                </div>

                                <div className="w-12 h-12 rounded-xl bg-(--color-background) flex items-center justify-center text-2xl">
                                    {stat.icon}
                                </div>

                            </div>
                        </div>
                    ))}

                </div>

                {/* Sales */}

                <div className="mt-6">

                    <div className="bg-(--color-card) rounded-2xl p-5 md:p-6 shadow-sm">

                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                            <div>
                                <h2 className="font-bold text-lg">
                                    المبيعات
                                </h2>

                                <p className="text-sm opacity-60 mt-1">
                                    {rangeDates
                                        ? range === "today"
                                            ? formatDate(
                                                rangeDates.start
                                            )
                                            : `من ${formatDate(
                                                rangeDates.start
                                            )} إلى ${formatDate(
                                                rangeDates.end
                                            )}`
                                        : "اختر تاريخ البداية والنهاية"}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">

                                {RANGE_OPTIONS.map(
                                    (option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() =>
                                                setRange(
                                                    option.value
                                                )
                                            }
                                            className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                                                range ===
                                                option.value
                                                    ? "bg-(--color-primary) text-white border-(--color-primary)"
                                                    : "bg-(--color-card) hover:bg-(--color-background)"
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    )
                                )}

                                <button
                                    type="button"
                                    onClick={
                                        printSalesReport
                                    }
                                    disabled={!rangeDates}
                                    className="px-4 py-2 rounded-xl text-sm font-bold border-2 border-(--color-primary) text-(--color-primary) transition hover:bg-(--color-primary) hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    🖨️ طباعة التقرير
                                </button>

                            </div>
                        </div>

                        {/* Custom range */}

                        {range === "custom" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 max-w-lg">

                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        من
                                    </label>

                                    <input
                                        type="date"
                                        value={customFrom}
                                        max={
                                            customTo ||
                                            undefined
                                        }
                                        onChange={(e) =>
                                            setCustomFrom(
                                                e.target.value
                                            )
                                        }
                                        className="w-full px-4 py-2.5 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-(--color-primary)"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        إلى
                                    </label>

                                    <input
                                        type="date"
                                        value={customTo}
                                        min={
                                            customFrom ||
                                            undefined
                                        }
                                        onChange={(e) =>
                                            setCustomTo(
                                                e.target.value
                                            )
                                        }
                                        className="w-full px-4 py-2.5 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-(--color-primary)"
                                    />
                                </div>

                            </div>
                        )}

                        {/* Totals */}

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">

                            <div className="bg-(--color-background) rounded-xl p-4">
                                <p className="text-sm opacity-60">
                                    إجمالي المبيعات
                                </p>

                                <p className="text-3xl font-bold mt-2">
                                    {formatMoney(
                                        totalSales
                                    )}{" "}
                                    <span className="text-base font-medium opacity-60">
                                        جنيه
                                    </span>
                                </p>

                                <p className="text-xs opacity-50 mt-1">
                                    شامل رسوم التوصيل
                                </p>
                            </div>

                            <div className="bg-(--color-background) rounded-xl p-4">
                                <p className="text-sm opacity-60">
                                    🛵 حساب التوصيل
                                </p>

                                <p className="text-3xl font-bold mt-2">
                                    {formatMoney(
                                        deliveryFees
                                    )}{" "}
                                    <span className="text-base font-medium opacity-60">
                                        جنيه
                                    </span>
                                </p>

                                <p className="text-xs opacity-50 mt-1">
                                    من{" "}
                                    {deliveryOrders.length.toLocaleString(
                                        "ar-EG"
                                    )}{" "}
                                    طلب توصيل
                                </p>
                            </div>

                            <div className="bg-(--color-background) rounded-xl p-4">
                                <p className="text-sm opacity-60">
                                    عدد الطلبات
                                </p>

                                <p className="text-3xl font-bold mt-2">
                                    {soldOrders.length.toLocaleString(
                                        "ar-EG"
                                    )}
                                </p>
                            </div>

                            <div className="bg-(--color-background) rounded-xl p-4">
                                <p className="text-sm opacity-60">
                                    متوسط قيمة الطلب
                                </p>

                                <p className="text-3xl font-bold mt-2">
                                    {formatMoney(
                                        averageOrder
                                    )}{" "}
                                    <span className="text-base font-medium opacity-60">
                                        جنيه
                                    </span>
                                </p>
                            </div>

                        </div>

                        <p className="text-sm opacity-50 mt-3">
                            لا تشمل الطلبات الملغاة
                            {cancelledInRange > 0 &&
                                ` (${cancelledInRange.toLocaleString(
                                    "ar-EG"
                                )} طلب ملغي في هذه الفترة)`}
                        </p>

                        {/* Chart */}

                        {chart && (
                            <div className="mt-6">

                                {chart.max === 0 ? (
                                    <div className="h-40 flex items-center justify-center text-sm opacity-50 bg-(--color-background) rounded-xl">
                                        لا توجد مبيعات في هذه الفترة.
                                    </div>
                                ) : (
                                    <div className="flex items-end gap-1 h-44 pt-4">

                                        {chart.buckets.map(
                                            (
                                                bucket,
                                                index
                                            ) => (
                                                <div
                                                    key={
                                                        index
                                                    }
                                                    className="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1"
                                                    title={`${bucket.label}: ${formatMoney(
                                                        bucket.total
                                                    )} جنيه`}
                                                >

                                                    <div
                                                        className="w-full rounded-t-md bg-(--color-primary) min-h-px"
                                                        style={{
                                                            height: `${
                                                                (bucket.total /
                                                                    chart.max) *
                                                                85
                                                            }%`,
                                                            opacity:
                                                                bucket.total ===
                                                                    0
                                                                    ? 0.15
                                                                    : 1,
                                                        }}
                                                    />

                                                    <span className="text-[10px] opacity-50 h-3 whitespace-nowrap">
                                                        {index %
                                                            chart.labelEvery ===
                                                            0
                                                            ? bucket.label
                                                            : ""}
                                                    </span>

                                                </div>
                                            )
                                        )}

                                    </div>
                                )}

                            </div>
                        )}

                        {/* By order type */}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">

                            {salesByType.map(
                                (item) => (
                                    <div
                                        key={item.type}
                                        className="border rounded-xl p-4"
                                    >
                                        <p className="font-semibold">
                                            {
                                                item.label
                                            }
                                        </p>

                                        <p className="text-xl font-bold mt-2">
                                            {formatMoney(
                                                item.total
                                            )}{" "}
                                            جنيه
                                        </p>

                                        <p className="text-xs opacity-50 mt-1">
                                            {item.count.toLocaleString(
                                                "ar-EG"
                                            )}{" "}
                                            طلب
                                        </p>
                                    </div>
                                )
                            )}

                        </div>
                    </div>
                </div>

                {/* Recent Orders */}

                <div className="mt-6">

                    <div className="bg-(--color-card) rounded-2xl shadow-sm overflow-hidden">

                        <div className="p-5 border-b">
                            <h2 className="font-bold text-lg">
                                آخر الطلبات
                            </h2>

                            <p className="text-sm opacity-60 mt-1">
                                أحدث الطلبات التي وصلت للمطعم
                            </p>
                        </div>

                        {orders.length === 0 ? (
                            <div className="p-8 text-center opacity-60">
                                لا توجد طلبات حاليًا.
                            </div>
                        ) : (
                            <div className="divide-y">

                                {orders
                                    .slice(0, 5)
                                    .map(
                                        (order) => (
                                            <div
                                                key={
                                                    order.id
                                                }
                                                className="p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6"
                                            >

                                                <div className="md:w-32">
                                                    <p className="text-xs opacity-50">
                                                        رقم الطلب
                                                    </p>

                                                    <p className="font-bold mt-1">
                                                        {
                                                            order.order_number
                                                        }
                                                    </p>
                                                </div>

                                                <div className="flex-1">
                                                    <p className="font-semibold">
                                                        {
                                                            order.customer_name ||
                                                            "بدون اسم"
                                                        }
                                                    </p>

                                                    <p className="text-sm opacity-50 mt-1">
                                                        {
                                                            order.customer_phone ||
                                                            "بدون رقم"
                                                        }
                                                    </p>
                                                </div>

                                                <div>
                                                    <span
                                                        className={`inline-flex px-3 py-1.5 rounded-full text-sm font-medium ${getStatusClass(
                                                            order.status
                                                        )}`}
                                                    >
                                                        {getStatusLabel(
                                                            order.status
                                                        )}
                                                    </span>
                                                </div>

                                                <div className="md:w-28">
                                                    <p className="font-bold">
                                                        {
                                                            order.total_price
                                                        }{" "}
                                                        جنيه
                                                    </p>
                                                </div>

                                                <div className="text-xs opacity-50">
                                                    {new Date(
                                                        order.created_at
                                                    ).toLocaleString(
                                                        "ar-EG"
                                                    )}
                                                </div>

                                            </div>
                                        )
                                    )}

                            </div>
                        )}

                    </div>
                </div>

            </div>
        </div>
    )
}

export default AdminDashboard
