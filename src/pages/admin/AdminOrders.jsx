
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { buildWhatsAppLink } from "../../lib/whatsapp"
import { ORDERS_CHANGED_EVENT } from "./useNewOrderAlerts"

function AdminOrders() {
    const [orders, setOrders] = useState([])
    const [orderItems, setOrderItems] = useState({})
    const [loading, setLoading] = useState(true)
    const [updatingOrderId, setUpdatingOrderId] = useState(null)
    const [openOrderId, setOpenOrderId] = useState(null)

    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [dateFilter, setDateFilter] = useState("all")
    const [orderTypeFilter, setOrderTypeFilter] = useState("all")

    const [restaurantName, setRestaurantName] = useState("")

    // silent = تحديث في الخلفية من غير شاشة "جاري التحميل"
    const loadOrders = async (silent = false) => {
        if (!silent) {
            setLoading(true)
        }

        const { data: ordersData, error: ordersError } = await supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false })

        if (ordersError) {
            console.error("Orders fetch error:", ordersError)
            setLoading(false)
            return
        }

        setOrders(ordersData || [])

        if (!ordersData || ordersData.length === 0) {
            setOrderItems({})
            setLoading(false)
            return
        }

        const orderIds = ordersData.map((order) => order.id)

        const { data: itemsData, error: itemsError } = await supabase
            .from("order_items")
            .select("*")
            .in("order_id", orderIds)

        if (itemsError) {
            console.error("Order items fetch error:", itemsError)
            setLoading(false)
            return
        }

        const groupedItems = {}

        for (const item of itemsData || []) {
            if (!groupedItems[item.order_id]) {
                groupedItems[item.order_id] = []
            }

            groupedItems[item.order_id].push(item)
        }

        setOrderItems(groupedItems)
        setLoading(false)
    }

    useEffect(() => {
        loadOrders()
    }, [])

    // تحديث الطلبات تلقائيًا لما يوصل طلب جديد أو حالة طلب تتغير
    useEffect(() => {
        const refresh = () => loadOrders(true)

        window.addEventListener(ORDERS_CHANGED_EVENT, refresh)

        return () => {
            window.removeEventListener(ORDERS_CHANGED_EVENT, refresh)
        }
    }, [])

    // اسم المطعم لرسالة واتساب
    useEffect(() => {
        let active = true

        supabase
            .from("restaurant_settings")
            .select("restaurant_name")
            .limit(1)
            .maybeSingle()
            .then(({ data }) => {
                if (active && data?.restaurant_name) {
                    setRestaurantName(data.restaurant_name)
                }
            })

        return () => {
            active = false
        }
    }, [])

    /*
    |--------------------------------------------------------------------------
    | WhatsApp Confirmation
    |--------------------------------------------------------------------------
    */

    const buildConfirmationMessage = (order, items) => {
        const lines = []

        lines.push(
            `أهلاً ${order.customer_name || ""} 👋`.replace("  ", " ")
        )

        lines.push(
            `معاك ${restaurantName || "المطعم"}، بنأكد طلبك رقم ${order.order_number}:`
        )

        lines.push("")

        for (const item of items) {
            lines.push(
                `• ${item.product_name} × ${item.quantity} — ${item.total_price} جنيه`
            )
        }

        lines.push("")
        lines.push(`المنتجات: ${order.products_total} جنيه`)

        if (order.order_type === "delivery") {
            lines.push(`التوصيل: ${order.delivery_price} جنيه`)
        }

        lines.push(`*الإجمالي: ${order.total_price} جنيه*`)

        if (order.order_type === "delivery") {
            lines.push("")
            lines.push(`المنطقة: ${order.delivery_area || "-"}`)
            lines.push(`العنوان: ${order.address || "-"}`)
        }

        if (order.order_type === "pickup") {
            lines.push("")
            lines.push("الاستلام: من المطعم")
        }

        if (order.payment_method === "cash") {
            lines.push("الدفع: كاش عند الاستلام")
        } else if (order.payment_method === "online") {
            lines.push("الدفع: أونلاين")
        }

        lines.push("")
        lines.push(
            "لو البيانات صحيحة ردّ علينا بكلمة \"تأكيد\" وهنبدأ تجهيز طلبك ✅"
        )

        return lines.join("\n")
    }

    const updateOrderStatus = async (orderId, newStatus) => {
        setUpdatingOrderId(orderId)

        const { error } = await supabase
            .from("orders")
            .update({
                status: newStatus,
            })
            .eq("id", orderId)

        if (error) {
            console.error("Update order status error:", error)

            alert(
                `حصل خطأ أثناء تحديث حالة الطلب:\n${error.message}`
            )

            setUpdatingOrderId(null)
            return
        }

        setOrders((currentOrders) =>
            currentOrders.map((order) =>
                order.id === orderId
                    ? {
                        ...order,
                        status: newStatus,
                    }
                    : order
            )
        )

        setUpdatingOrderId(null)
    }

    const toggleOrder = (orderId) => {
        setOpenOrderId((currentId) =>
            currentId === orderId ? null : orderId
        )
    }

    /*
    |--------------------------------------------------------------------------
    | Order Type
    |--------------------------------------------------------------------------
    */

    const getOrderTypeLabel = (type) => {
        if (type === "delivery") return "توصيل"
        if (type === "pickup") return "استلام"
        if (type === "dine-in") return "داخل المطعم"

        return type || "-"
    }

    const getOrderTypeClass = (type) => {
        if (type === "delivery") {
            return "bg-purple-100 text-purple-800"
        }

        if (type === "pickup") {
            return "bg-blue-100 text-blue-800"
        }

        if (type === "dine-in") {
            return "bg-orange-100 text-orange-800"
        }

        return "bg-gray-100 text-gray-800"
    }

    /*
    |--------------------------------------------------------------------------
    | Status
    |--------------------------------------------------------------------------
    */

    const getStatusLabel = (status, orderType) => {
        if (status === "pending") {
            return "جديد"
        }

        if (status === "processing") {
            if (orderType === "dine-in") {
                return "جاري التحضير"
            }

            return "جاري التجهيز"
        }

        if (status === "shipped") {
            if (orderType === "pickup") {
                return "جاهز للاستلام"
            }

            if (orderType === "dine-in") {
                return "جاهز"
            }

            return "خرج للتوصيل"
        }

        if (status === "delivered") {
            if (orderType === "pickup") {
                return "تم الاستلام"
            }

            if (orderType === "dine-in") {
                return "تم التقديم"
            }

            return "تم التسليم"
        }

        if (status === "cancelled") {
            return "ملغي"
        }

        return status || "-"
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

    const getStatusOptions = (orderType) => {
        if (orderType === "delivery") {
            return [
                {
                    value: "pending",
                    label: "جديد",
                },
                {
                    value: "processing",
                    label: "جاري التجهيز",
                },
                {
                    value: "shipped",
                    label: "خرج للتوصيل",
                },
                {
                    value: "delivered",
                    label: "تم التسليم",
                },
                {
                    value: "cancelled",
                    label: "ملغي",
                },
            ]
        }

        if (orderType === "pickup") {
            return [
                {
                    value: "pending",
                    label: "جديد",
                },
                {
                    value: "processing",
                    label: "جاري التجهيز",
                },
                {
                    value: "shipped",
                    label: "جاهز للاستلام",
                },
                {
                    value: "delivered",
                    label: "تم الاستلام",
                },
                {
                    value: "cancelled",
                    label: "ملغي",
                },
            ]
        }

        if (orderType === "dine-in") {
            return [
                {
                    value: "pending",
                    label: "جديد",
                },
                {
                    value: "processing",
                    label: "جاري التحضير",
                },
                {
                    value: "shipped",
                    label: "جاهز",
                },
                {
                    value: "delivered",
                    label: "تم التقديم",
                },
                {
                    value: "cancelled",
                    label: "ملغي",
                },
            ]
        }

        return [
            {
                value: "pending",
                label: "جديد",
            },
            {
                value: "processing",
                label: "جاري التجهيز",
            },
            {
                value: "shipped",
                label: "خرج للتوصيل",
            },
            {
                value: "delivered",
                label: "تم التسليم",
            },
            {
                value: "cancelled",
                label: "ملغي",
            },
        ]
    }

    /*
    |--------------------------------------------------------------------------
    | Date Filter
    |--------------------------------------------------------------------------
    */

    const isOrderInDateRange = (order) => {
        if (dateFilter === "all") {
            return true
        }

        const orderDate = new Date(order.created_at)
        const now = new Date()

        if (dateFilter === "today") {
            return (
                orderDate.getFullYear() === now.getFullYear() &&
                orderDate.getMonth() === now.getMonth() &&
                orderDate.getDate() === now.getDate()
            )
        }

        if (dateFilter === "yesterday") {
            const yesterday = new Date(now)

            yesterday.setDate(now.getDate() - 1)

            return (
                orderDate.getFullYear() === yesterday.getFullYear() &&
                orderDate.getMonth() === yesterday.getMonth() &&
                orderDate.getDate() === yesterday.getDate()
            )
        }

        if (dateFilter === "7days") {
            const startDate = new Date(now)

            startDate.setDate(now.getDate() - 6)
            startDate.setHours(0, 0, 0, 0)

            return orderDate >= startDate
        }

        if (dateFilter === "30days") {
            const startDate = new Date(now)

            startDate.setDate(now.getDate() - 29)
            startDate.setHours(0, 0, 0, 0)

            return orderDate >= startDate
        }

        if (dateFilter === "year") {
            const startDate = new Date(now)

            startDate.setFullYear(now.getFullYear() - 1)

            return orderDate >= startDate
        }

        return true
    }

    /*
    |--------------------------------------------------------------------------
    | Filters
    |--------------------------------------------------------------------------
    */

    const normalizedSearch = searchTerm
        .trim()
        .toLowerCase()

    const filteredOrders = orders.filter((order) => {
        const matchesSearch =
            normalizedSearch === "" ||
            String(order.order_number || "")
                .toLowerCase()
                .includes(normalizedSearch) ||
            String(order.customer_name || "")
                .toLowerCase()
                .includes(normalizedSearch) ||
            String(order.customer_phone || "")
                .toLowerCase()
                .includes(normalizedSearch) ||
            String(order.table_number || "")
                .toLowerCase()
                .includes(normalizedSearch)

        const matchesStatus =
            statusFilter === "all" ||
            order.status === statusFilter

        const matchesDate =
            isOrderInDateRange(order)

        const matchesOrderType =
            orderTypeFilter === "all" ||
            order.order_type === orderTypeFilter

        return (
            matchesSearch &&
            matchesStatus &&
            matchesDate &&
            matchesOrderType
        )
    })

    const filterButtonClass = (isActive) =>
        `shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium border transition ${
            isActive
                ? "bg-(--color-primary) text-white border-(--color-primary) shadow-sm"
                : "bg-(--color-card) text-(--color-text) border-gray-200 hover:border-(--color-primary) hover:bg-(--color-background)"
        }`

    const clearFilters = () => {
        setSearchTerm("")
        setStatusFilter("all")
        setDateFilter("all")
        setOrderTypeFilter("all")
        setOpenOrderId(null)
    }

    const hasActiveFilters =
        searchTerm.trim() !== "" ||
        statusFilter !== "all" ||
        dateFilter !== "all" ||
        orderTypeFilter !== "all"

    /*
    |--------------------------------------------------------------------------
    | Loading
    |--------------------------------------------------------------------------
    */

    if (loading) {
        return (
            <div
                dir="rtl"
                className="min-h-screen flex items-center justify-center bg-(--color-background)"
            >
                <div className="text-center">

                    <div className="text-lg font-semibold">
                        جاري تحميل الطلبات...
                    </div>

                    <p className="text-sm opacity-60 mt-1">
                        لحظات من فضلك
                    </p>

                </div>
            </div>
        )
    }

    /*
    |--------------------------------------------------------------------------
    | UI
    |--------------------------------------------------------------------------
    */

    return (
        <div
            dir="rtl"
            className="min-h-screen bg-(--color-background) p-4 md:p-8"
        >
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-8">

                    <div>

                        <p className="text-sm opacity-60 mb-1">
                            MenuFlow Admin
                        </p>

                        <h1 className="text-3xl md:text-4xl font-bold">
                            الطلبات
                        </h1>

                        <p className="opacity-60 mt-2">
                            متابعة وإدارة طلبات المطعم
                        </p>

                    </div>

                    <div className="bg-(--color-card) rounded-2xl px-5 py-3 shadow-sm">

                        <p className="text-sm opacity-60">
                            إجمالي الطلبات
                        </p>

                        <p className="text-2xl font-bold">
                            {filteredOrders.length}
                        </p>

                    </div>

                </div>

                {/* Search & Filters */}
                <div className="bg-(--color-card) rounded-2xl p-4 md:p-5 shadow-sm mb-5">

                    {/* Search */}
                    <div className="mb-5">

                        <div className="flex items-center justify-between gap-3 mb-2">

                            <label
                                htmlFor="order-search"
                                className="text-sm font-medium"
                            >
                                البحث في الطلبات
                            </label>

                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm("")}
                                    className="text-xs text-red-600 hover:underline"
                                >
                                    مسح البحث
                                </button>
                            )}

                        </div>

                        <div className="relative">

                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg opacity-50">
                                🔎
                            </span>

                            <input
                                id="order-search"
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value)
                                    setOpenOrderId(null)
                                }}
                                placeholder="ابحث برقم الطلب أو اسم العميل أو الهاتف أو رقم الطاولة..."
                                className="w-full border border-gray-200 rounded-xl pr-12 pl-4 py-3.5 bg-(--color-background) outline-none focus:border-(--color-primary) transition"
                            />

                        </div>

                    </div>

                    <div className="border-t pt-5">

                        <div className="flex items-center justify-between gap-3 mb-5">

                            <div className="flex items-center gap-2">

                                <span className="text-lg">
                                    🔎
                                </span>

                                <h2 className="font-bold">
                                    فلترة الطلبات
                                </h2>

                            </div>

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="text-sm text-red-600 hover:underline whitespace-nowrap"
                                >
                                    مسح كل الفلاتر
                                </button>
                            )}

                        </div>

                        {/* Status */}
                        <div className="mb-5">

                            <p className="text-sm font-medium mb-2">
                                حالة الطلب
                            </p>

                            <div className="flex gap-2 overflow-x-auto pb-1">

                                <button
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter("all")
                                        setOpenOrderId(null)
                                    }}
                                    className={filterButtonClass(
                                        statusFilter === "all"
                                    )}
                                >
                                    الكل
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter("pending")
                                        setOpenOrderId(null)
                                    }}
                                    className={filterButtonClass(
                                        statusFilter === "pending"
                                    )}
                                >
                                    جديد
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter("processing")
                                        setOpenOrderId(null)
                                    }}
                                    className={filterButtonClass(
                                        statusFilter === "processing"
                                    )}
                                >
                                    جاري التجهيز
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter("shipped")
                                        setOpenOrderId(null)
                                    }}
                                    className={filterButtonClass(
                                        statusFilter === "shipped"
                                    )}
                                >
                                    جاهز / خرج للتوصيل
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter("delivered")
                                        setOpenOrderId(null)
                                    }}
                                    className={filterButtonClass(
                                        statusFilter === "delivered"
                                    )}
                                >
                                    مكتمل
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter("cancelled")
                                        setOpenOrderId(null)
                                    }}
                                    className={filterButtonClass(
                                        statusFilter === "cancelled"
                                    )}
                                >
                                    ملغي
                                </button>

                            </div>

                        </div>

                        {/* Date */}
                        <div className="mb-5">

                            <p className="text-sm font-medium mb-2">
                                الفترة
                            </p>

                            <div className="flex gap-2 overflow-x-auto pb-1">

                                <button
                                    type="button"
                                    onClick={() => {
                                        setDateFilter("all")
                                        setOpenOrderId(null)
                                    }}
                                    className={filterButtonClass(
                                        dateFilter === "all"
                                    )}
                                >
                                    كل الطلبات
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setDateFilter("today")
                                        setOpenOrderId(null)
                                    }}
                                    className={filterButtonClass(
                                        dateFilter === "today"
                                    )}
                                >
                                    اليوم
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setDateFilter("yesterday")
                                        setOpenOrderId(null)
                                    }}
                                    className={filterButtonClass(
                                        dateFilter === "yesterday"
                                    )}
                                >
                                    أمس
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setDateFilter("7days")
                                        setOpenOrderId(null)
                                    }}
                                    className={filterButtonClass(
                                        dateFilter === "7days"
                                    )}
                                >
                                    آخر 7 أيام
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setDateFilter("30days")
                                        setOpenOrderId(null)
                                    }}
                                    className={filterButtonClass(
                                        dateFilter === "30days"
                                    )}
                                >
                                    آخر 30 يوم
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setDateFilter("year")
                                        setOpenOrderId(null)
                                    }}
                                    className={filterButtonClass(
                                        dateFilter === "year"
                                    )}
                                >
                                    آخر سنة
                                </button>

                            </div>

                        </div>

                        {/* Order Type */}
                        <div>

                            <p className="text-sm font-medium mb-2">
                                نوع الطلب
                            </p>

                            <div className="flex gap-2 overflow-x-auto pb-1">

                                <button
                                    type="button"
                                    onClick={() => {
                                        setOrderTypeFilter("all")
                                        setOpenOrderId(null)
                                    }}
                                    className={filterButtonClass(
                                        orderTypeFilter === "all"
                                    )}
                                >
                                    الكل
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setOrderTypeFilter("delivery")
                                        setOpenOrderId(null)
                                    }}
                                    className={filterButtonClass(
                                        orderTypeFilter === "delivery"
                                    )}
                                >
                                    توصيل
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setOrderTypeFilter("pickup")
                                        setOpenOrderId(null)
                                    }}
                                    className={filterButtonClass(
                                        orderTypeFilter === "pickup"
                                    )}
                                >
                                    استلام
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setOrderTypeFilter("dine-in")
                                        setOpenOrderId(null)
                                    }}
                                    className={filterButtonClass(
                                        orderTypeFilter === "dine-in"
                                    )}
                                >
                                    داخل المطعم
                                </button>

                            </div>

                        </div>

                        {/* Results */}
                        <div className="mt-5 pt-4 border-t text-sm opacity-60">
                            عرض {filteredOrders.length} من أصل {orders.length} طلب
                        </div>

                    </div>

                </div>

                {/* Orders */}
                {filteredOrders.length === 0 ? (
                    <div className="bg-(--color-card) rounded-2xl p-8 shadow-sm text-center">

                        <div className="text-4xl mb-3">
                            📦
                        </div>

                        <h2 className="font-bold text-lg">
                            لا توجد طلبات
                        </h2>

                        <p className="opacity-60 mt-1">
                            لا توجد طلبات مطابقة للبحث والفلاتر الحالية.
                        </p>

                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-4 bg-(--color-primary) text-white px-5 py-2.5 rounded-xl font-medium"
                            >
                                مسح البحث والفلاتر
                            </button>
                        )}

                    </div>
                ) : (
                    <div className="space-y-3">

                        {filteredOrders.map((order) => {
                            const isOpen = openOrderId === order.id
                            const items = orderItems[order.id] || []
                            const isUpdating =
                                updatingOrderId === order.id

                            const isDelivery =
                                order.order_type === "delivery"

                            const isPickup =
                                order.order_type === "pickup"

                            const isDineIn =
                                order.order_type === "dine-in"

                            return (
                                <div
                                    key={order.id}
                                    className={`bg-(--color-card) rounded-2xl shadow-sm border transition-all ${
                                        isOpen
                                            ? "border-(--color-primary)"
                                            : "border-transparent"
                                    }`}
                                >

                                    {/* Order Summary */}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            toggleOrder(order.id)
                                        }
                                        className="w-full text-right p-4 md:p-5"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center gap-4">

                                            {/* Order Number */}
                                            <div className="md:w-40 shrink-0">

                                                <p className="text-xs opacity-50 mb-1">
                                                    رقم الطلب
                                                </p>

                                                <p className="font-bold text-lg">
                                                    {order.order_number}
                                                </p>

                                            </div>

                                            {/* Customer / Table */}
                                            <div className="flex-1">

                                                {isDineIn ? (
                                                    <>
                                                        <div className="flex items-center gap-2">

                                                            <span className="text-lg">
                                                                🪑
                                                            </span>

                                                            <p className="font-bold">
                                                                طاولة{" "}
                                                                {order.table_number ||
                                                                    "-"}
                                                            </p>

                                                        </div>

                                                        {order.customer_name && (
                                                            <p className="text-sm opacity-60 mt-1">
                                                                {order.customer_name}
                                                            </p>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="font-semibold">
                                                            {order.customer_name ||
                                                                "بدون اسم"}
                                                        </p>

                                                        <p className="text-sm opacity-60 mt-1">
                                                            {order.customer_phone ||
                                                                "بدون رقم"}
                                                        </p>
                                                    </>
                                                )}

                                            </div>

                                            {/* Order Type */}
                                            <div className="md:w-32">

                                                <p className="text-xs opacity-50 mb-1">
                                                    النوع
                                                </p>

                                                <span
                                                    className={`inline-flex px-3 py-1.5 rounded-full text-sm font-medium ${getOrderTypeClass(
                                                        order.order_type
                                                    )}`}
                                                >
                                                    {getOrderTypeLabel(
                                                        order.order_type
                                                    )}
                                                </span>

                                            </div>

                                            {/* Table for Dine In */}
                                            {isDineIn && (
                                                <div className="md:w-24">

                                                    <p className="text-xs opacity-50 mb-1">
                                                        الطاولة
                                                    </p>

                                                    <p className="font-bold">
                                                        #{order.table_number ||
                                                            "-"}
                                                    </p>

                                                </div>
                                            )}

                                            {/* Total */}
                                            <div className="md:w-28">

                                                <p className="text-xs opacity-50 mb-1">
                                                    الإجمالي
                                                </p>

                                                <p className="font-bold">
                                                    {order.total_price} ج
                                                </p>

                                            </div>

                                            {/* Status */}
                                            <div className="md:w-40">

                                                <span
                                                    className={`inline-flex px-3 py-1.5 rounded-full text-sm font-medium ${getStatusClass(
                                                        order.status
                                                    )}`}
                                                >
                                                    {getStatusLabel(
                                                        order.status,
                                                        order.order_type
                                                    )}
                                                </span>

                                            </div>

                                            {/* Arrow */}
                                            <div className="hidden md:flex w-8 justify-center">

                                                <span
                                                    className={`text-xl transition-transform ${
                                                        isOpen
                                                            ? "rotate-180"
                                                            : ""
                                                    }`}
                                                >
                                                    ⌄
                                                </span>

                                            </div>

                                        </div>

                                        {/* Mobile date */}
                                        <div className="mt-3 text-xs opacity-50 md:hidden">
                                            {new Date(
                                                order.created_at
                                            ).toLocaleString("ar-EG")}
                                        </div>

                                    </button>

                                    {/* Details */}
                                    {isOpen && (
                                        <div className="border-t px-4 md:px-5 pb-5">

                                            {/* Customer Information */}
                                            <div className="py-5">

                                                <h2 className="font-bold text-lg mb-4">
                                                    بيانات الطلب
                                                </h2>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                                                    {/* Customer */}
                                                    <div className="bg-(--color-background) rounded-xl p-4">

                                                        <p className="text-xs opacity-50 mb-1">
                                                            العميل
                                                        </p>

                                                        <p className="font-semibold">
                                                            {order.customer_name ||
                                                                "-"}
                                                        </p>

                                                    </div>

                                                    {/* Phone */}
                                                    {!isDineIn && (
                                                        <div className="bg-(--color-background) rounded-xl p-4">

                                                            <p className="text-xs opacity-50 mb-1">
                                                                الهاتف
                                                            </p>

                                                            <p className="font-semibold">
                                                                {order.customer_phone ||
                                                                    "-"}
                                                            </p>

                                                        </div>
                                                    )}

                                                    {/* Table */}
                                                    {isDineIn && (
                                                        <div className="bg-orange-50 rounded-xl p-4">

                                                            <p className="text-xs opacity-50 mb-1">
                                                                رقم الطاولة
                                                            </p>

                                                            <p className="font-bold text-xl">
                                                                🪑{" "}
                                                                {order.table_number ||
                                                                    "-"}
                                                            </p>

                                                        </div>
                                                    )}

                                                    {/* Delivery Area */}
                                                    {isDelivery && (
                                                        <div className="bg-(--color-background) rounded-xl p-4">

                                                            <p className="text-xs opacity-50 mb-1">
                                                                المنطقة
                                                            </p>

                                                            <p className="font-semibold">
                                                                {order.delivery_area ||
                                                                    "-"}
                                                            </p>

                                                        </div>
                                                    )}

                                                    {/* Payment */}
                                                    <div className="bg-(--color-background) rounded-xl p-4">

                                                        <p className="text-xs opacity-50 mb-1">
                                                            الدفع
                                                        </p>

                                                        <p className="font-semibold">
                                                            {order.payment_method ===
                                                            "cash"
                                                                ? "كاش"
                                                                : order.payment_method ===
                                                                    "online"
                                                                    ? "دفع أونلاين"
                                                                    : "-"}
                                                        </p>

                                                    </div>

                                                </div>

                                                {/* Delivery Address */}
                                                {isDelivery && (
                                                    <div className="grid grid-cols-1 gap-3 mt-3">

                                                        <div className="bg-(--color-background) rounded-xl p-4">

                                                            <p className="text-xs opacity-50 mb-1">
                                                                العنوان
                                                            </p>

                                                            <p className="font-semibold">
                                                                {order.address ||
                                                                    "-"}
                                                            </p>

                                                        </div>

                                                    </div>
                                                )}

                                                {/* Notes */}
                                                <div className="grid grid-cols-1 gap-3 mt-3">

                                                    <div className="bg-(--color-background) rounded-xl p-4">

                                                        <p className="text-xs opacity-50 mb-1">
                                                            الملاحظات
                                                        </p>

                                                        <p className="font-semibold">
                                                            {order.notes ||
                                                                "لا توجد ملاحظات"}
                                                        </p>

                                                    </div>

                                                </div>

                                            </div>

                                            {/* Products */}
                                            <div className="border-t pt-5">

                                                <div className="flex items-center justify-between mb-4">

                                                    <h2 className="font-bold text-lg">
                                                        المنتجات
                                                    </h2>

                                                    <span className="text-sm opacity-60">
                                                        {items.length} منتجات
                                                    </span>

                                                </div>

                                                {items.length === 0 ? (
                                                    <div className="bg-(--color-background) rounded-xl p-4 text-sm opacity-60">
                                                        لا توجد منتجات لهذا الطلب.
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">

                                                        {items.map((item) => (
                                                            <div
                                                                key={item.id}
                                                                className="bg-(--color-background) rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                                                            >

                                                                <div>

                                                                    <p className="font-semibold">
                                                                        {item.product_name}
                                                                    </p>

                                                                    <p className="text-sm opacity-60 mt-1">
                                                                        {item.unit_price}{" "}
                                                                        جنيه ×{" "}
                                                                        {
                                                                            item.quantity
                                                                        }
                                                                    </p>

                                                                </div>

                                                                <p className="font-bold text-lg">
                                                                    {
                                                                        item.total_price
                                                                    }{" "}
                                                                    جنيه
                                                                </p>

                                                            </div>
                                                        ))}

                                                    </div>
                                                )}

                                            </div>

                                            {/* Order Summary */}
                                            <div className="border-t mt-5 pt-5">

                                                <div className="max-w-md mr-auto space-y-3">

                                                    <div className="flex justify-between">

                                                        <span className="opacity-60">
                                                            المنتجات
                                                        </span>

                                                        <span className="font-medium">
                                                            {
                                                                order.products_total
                                                            }{" "}
                                                            جنيه
                                                        </span>

                                                    </div>

                                                    {/* Delivery only */}
                                                    {isDelivery && (
                                                        <div className="flex justify-between">

                                                            <span className="opacity-60">
                                                                التوصيل
                                                            </span>

                                                            <span className="font-medium">
                                                                {
                                                                    order.delivery_price
                                                                }{" "}
                                                                جنيه
                                                            </span>

                                                        </div>
                                                    )}

                                                    <div className="border-t pt-3 flex justify-between text-lg">

                                                        <span className="font-bold">
                                                            الإجمالي
                                                        </span>

                                                        <span className="font-bold">
                                                            {order.total_price}{" "}
                                                            جنيه
                                                        </span>

                                                    </div>

                                                </div>

                                            </div>

                                            {/* Cancel reason */}
                                            {order.status === "cancelled" &&
                                                order.cancel_reason && (
                                                    <div className="border-t mt-5 pt-5">

                                                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">

                                                            <p className="text-xs opacity-70 mb-1">
                                                                {order.cancelled_by === "customer"
                                                                    ? "سبب الإلغاء (من العميل)"
                                                                    : "سبب الإلغاء"}
                                                            </p>

                                                            <p className="font-semibold">
                                                                {order.cancel_reason}
                                                            </p>

                                                        </div>

                                                    </div>
                                                )}

                                            {/* WhatsApp Confirmation */}
                                            {!isDineIn &&
                                                order.status !== "cancelled" &&
                                                order.customer_phone && (
                                                    <div className="border-t mt-5 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                                                        <div>

                                                            <p className="font-bold">
                                                                التواصل مع العميل
                                                            </p>

                                                            <p className="text-sm opacity-60 mt-1">
                                                                ابعت للعميل تفاصيل الطلب على واتساب لتأكيده
                                                            </p>

                                                        </div>

                                                        <div className="flex gap-2">

                                                            <a
                                                                href={`tel:${order.customer_phone}`}
                                                                className="border rounded-xl px-4 py-3 font-medium hover:bg-(--color-background) transition text-center"
                                                            >
                                                                📞 اتصال
                                                            </a>

                                                            <a
                                                                href={buildWhatsAppLink(
                                                                    order.customer_phone,
                                                                    buildConfirmationMessage(
                                                                        order,
                                                                        items
                                                                    )
                                                                )}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-3 font-medium transition text-center"
                                                            >
                                                                💬 تأكيد عبر واتساب
                                                            </a>

                                                        </div>

                                                    </div>
                                                )}

                                            {/* Status Control */}
                                            <div className="border-t mt-5 pt-5">

                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                                                    <div>

                                                        <p className="font-bold">
                                                            حالة الطلب
                                                        </p>

                                                        <p className="text-sm opacity-60 mt-1">
                                                            غيّر حالة الطلب من هنا
                                                        </p>

                                                    </div>

                                                    <select
                                                        value={order.status}
                                                        disabled={isUpdating}
                                                        onChange={(e) =>
                                                            updateOrderStatus(
                                                                order.id,
                                                                e.target.value
                                                            )
                                                        }
                                                        className="border rounded-xl px-4 py-3 bg-(--color-card) outline-none font-medium disabled:opacity-50"
                                                    >
                                                        {getStatusOptions(
                                                            order.order_type
                                                        ).map(
                                                            (option) => (
                                                                <option
                                                                    key={
                                                                        option.value
                                                                    }
                                                                    value={
                                                                        option.value
                                                                    }
                                                                >
                                                                    {
                                                                        option.label
                                                                    }
                                                                </option>
                                                            )
                                                        )}
                                                    </select>

                                                </div>

                                                {isUpdating && (
                                                    <p className="text-sm opacity-60 mt-2">
                                                        جاري تحديث الحالة...
                                                    </p>
                                                )}

                                            </div>

                                            {/* Date */}
                                            <div className="border-t mt-5 pt-4 text-sm opacity-50">
                                                تاريخ الطلب:{" "}
                                                {new Date(
                                                    order.created_at
                                                ).toLocaleString(
                                                    "ar-EG"
                                                )}
                                            </div>

                                        </div>
                                    )}

                                </div>
                            )
                        })}

                    </div>
                )}

            </div>
        </div>
    )
}

export default AdminOrders
