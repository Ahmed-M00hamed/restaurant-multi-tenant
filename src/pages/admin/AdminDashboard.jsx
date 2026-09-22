import { useEffect, useState } from "react"
import { useOutletContext } from "react-router-dom"
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

// yyyy-mm-dd بالتوقيت المحلي (مناسب لـ <input type="date">)
const toInputDate = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")

    return `${y}-${m}-${d}`
}

const parseInputDate = (value) => {
    const [y, m, d] = value.split("-").map(Number)

    return new Date(y, m - 1, d)
}

const getRangeDates = (range, customFrom, customTo) => {
    const now = new Date()

    if (range === "today") {
        return { start: startOfDay(now), end: endOfDay(now) }
    }

    if (range === "week") {
        const start = startOfDay(now)
        start.setDate(start.getDate() - 6)

        return { start, end: endOfDay(now) }
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

    const from = startOfDay(parseInputDate(customFrom))
    const to = endOfDay(parseInputDate(customTo))

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

// بيقسم الفترة لأعمدة: ساعات (يوم) / أيام / شهور
const buildBuckets = (start, end) => {
    const days = Math.round(
        (startOfDay(end) - startOfDay(start)) / DAY_MS
    ) + 1

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
            labelEvery: days <= 10 ? 1 : days <= 31 ? 4 : 8,
        }
    }

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

function AdminDashboard() {
    const { authData } = useOutletContext() || {}
    const restaurantId = authData?.restaurant_id || null

    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)

    const [range, setRange] = useState("today")
    const [customFrom, setCustomFrom] = useState(() =>
        toInputDate(new Date())
    )
    const [customTo, setCustomTo] = useState(() =>
        toInputDate(new Date())
    )

    // silent = تحديث في الخلفية من غير شاشة "جاري التحميل"
    const loadDashboard = async (silent = false) => {
        if (!restaurantId) return

        if (!silent) {
            setLoading(true)
        }

        const { data, error } = await supabase
            .from("orders")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .order("created_at", { ascending: false })

        if (error) {
            console.error("Dashboard orders error:", error)
            setLoading(false)
            return
        }

        setOrders(data || [])
        setLoading(false)
    }

    useEffect(() => {
        loadDashboard()
    }, [restaurantId])

    // تحديث تلقائي لما يوصل طلب جديد أو حالة طلب تتغير
    useEffect(() => {
        const refresh = () => loadDashboard(true)

        window.addEventListener(ORDERS_CHANGED_EVENT, refresh)

        return () => {
            window.removeEventListener(ORDERS_CHANGED_EVENT, refresh)
        }
    }, [])

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

    /* ---------- مبيعات الفترة المختارة ---------- */

    const rangeDates = getRangeDates(range, customFrom, customTo)

    const rangeOrders = rangeDates
        ? orders.filter((order) => {
            const date = new Date(order.created_at)

            return date >= rangeDates.start && date <= rangeDates.end
        })
        : []

    const soldOrders = rangeOrders.filter(
        (order) => order.status !== "cancelled"
    )

    const cancelledInRange = rangeOrders.length - soldOrders.length

    const totalSales = soldOrders.reduce(
        (total, order) => total + Number(order.total_price || 0),
        0
    )

    // رسوم التوصيل لوحدها (طلبات التوصيل غير الملغاة في الفترة)
    const deliveryOrders = soldOrders.filter(
        (order) => order.order_type === "delivery"
    )

    const deliveryFees = deliveryOrders.reduce(
        (total, order) => total + Number(order.delivery_price || 0),
        0
    )

    const averageOrder =
        soldOrders.length > 0 ? totalSales / soldOrders.length : 0

    const salesByType = ["delivery", "pickup", "dine-in"].map(
        (type) => {
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
                    (sum, order) => sum + Number(order.total_price || 0),
                    0
                ),
            }
        }
    )

    let chart = null

    if (rangeDates) {
        const { buckets, indexOf, labelEvery } = buildBuckets(
            rangeDates.start,
            rangeDates.end
        )

        for (const order of soldOrders) {
            const index = indexOf(new Date(order.created_at))

            if (buckets[index]) {
                buckets[index].total += Number(order.total_price || 0)
            }
        }

        chart = {
            buckets,
            labelEvery,
            max: Math.max(...buckets.map((bucket) => bucket.total), 0),
        }
    }

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
            pending: "bg-yellow-100 text-yellow-800",
            processing: "bg-blue-100 text-blue-800",
            shipped: "bg-purple-100 text-purple-800",
            delivered: "bg-green-100 text-green-800",
            cancelled: "bg-red-100 text-red-800",
        }

        return classes[status] || "bg-gray-100 text-gray-800"
    }

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
                                            ? formatDate(rangeDates.start)
                                            : `من ${formatDate(rangeDates.start)} إلى ${formatDate(rangeDates.end)}`
                                        : "اختر تاريخ البداية والنهاية"}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">

                                {RANGE_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setRange(option.value)}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${range === option.value
                                                ? "bg-(--color-primary) text-white border-(--color-primary)"
                                                : "bg-(--color-card) hover:bg-(--color-background)"
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}

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
                                        max={customTo || undefined}
                                        onChange={(e) =>
                                            setCustomFrom(e.target.value)
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
                                        min={customFrom || undefined}
                                        onChange={(e) =>
                                            setCustomTo(e.target.value)
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
                                    {formatMoney(totalSales)}{" "}
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
                                    {formatMoney(deliveryFees)}{" "}
                                    <span className="text-base font-medium opacity-60">
                                        جنيه
                                    </span>
                                </p>

                                <p className="text-xs opacity-50 mt-1">
                                    من {deliveryOrders.length.toLocaleString("ar-EG")} طلب توصيل
                                </p>
                            </div>

                            <div className="bg-(--color-background) rounded-xl p-4">
                                <p className="text-sm opacity-60">
                                    عدد الطلبات
                                </p>

                                <p className="text-3xl font-bold mt-2">
                                    {soldOrders.length.toLocaleString("ar-EG")}
                                </p>
                            </div>

                            <div className="bg-(--color-background) rounded-xl p-4">
                                <p className="text-sm opacity-60">
                                    متوسط قيمة الطلب
                                </p>

                                <p className="text-3xl font-bold mt-2">
                                    {formatMoney(averageOrder)}{" "}
                                    <span className="text-base font-medium opacity-60">
                                        جنيه
                                    </span>
                                </p>
                            </div>

                        </div>

                        <p className="text-sm opacity-50 mt-3">
                            لا تشمل الطلبات الملغاة
                            {cancelledInRange > 0 &&
                                ` (${cancelledInRange.toLocaleString("ar-EG")} طلب ملغي في هذه الفترة)`}
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

                                        {chart.buckets.map((bucket, index) => (
                                            <div
                                                key={index}
                                                className="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1"
                                                title={`${bucket.label}: ${formatMoney(bucket.total)} جنيه`}
                                            >

                                                <div
                                                    className="w-full rounded-t-md bg-(--color-primary) min-h-px"
                                                    style={{
                                                        height: `${(bucket.total / chart.max) * 85}%`,
                                                        opacity: bucket.total === 0 ? 0.15 : 1,
                                                    }}
                                                />

                                                <span className="text-[10px] opacity-50 h-3 whitespace-nowrap">
                                                    {index % chart.labelEvery === 0
                                                        ? bucket.label
                                                        : ""}
                                                </span>

                                            </div>
                                        ))}

                                    </div>
                                )}

                            </div>
                        )}

                        {/* By order type */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">

                            {salesByType.map((item) => (
                                <div
                                    key={item.type}
                                    className="border rounded-xl p-4"
                                >
                                    <p className="font-semibold">
                                        {item.label}
                                    </p>

                                    <p className="text-xl font-bold mt-2">
                                        {formatMoney(item.total)} جنيه
                                    </p>

                                    <p className="text-xs opacity-50 mt-1">
                                        {item.count.toLocaleString("ar-EG")} طلب
                                    </p>
                                </div>
                            ))}

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

                                {orders.slice(0, 5).map((order) => (
                                    <div
                                        key={order.id}
                                        className="p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6"
                                    >

                                        <div className="md:w-32">
                                            <p className="text-xs opacity-50">
                                                رقم الطلب
                                            </p>

                                            <p className="font-bold mt-1">
                                                {order.order_number}
                                            </p>
                                        </div>

                                        <div className="flex-1">
                                            <p className="font-semibold">
                                                {order.customer_name || "بدون اسم"}
                                            </p>

                                            <p className="text-sm opacity-50 mt-1">
                                                {order.customer_phone || "بدون رقم"}
                                            </p>
                                        </div>

                                        <div>
                                            <span
                                                className={`inline-flex px-3 py-1.5 rounded-full text-sm font-medium ${getStatusClass(
                                                    order.status
                                                )}`}
                                            >
                                                {getStatusLabel(order.status)}
                                            </span>
                                        </div>

                                        <div className="md:w-28">
                                            <p className="font-bold">
                                                {order.total_price} جنيه
                                            </p>
                                        </div>

                                        <div className="text-xs opacity-50">
                                            {new Date(
                                                order.created_at
                                            ).toLocaleString("ar-EG")}
                                        </div>

                                    </div>
                                ))}

                            </div>
                        )}

                    </div>

                </div>

            </div>
        </div>
    )
}

export default AdminDashboard