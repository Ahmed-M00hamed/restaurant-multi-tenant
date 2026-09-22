import { useEffect, useState } from "react"
import {
    Navigate,
    NavLink,
    Outlet,
    useNavigate,
} from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { playOrderSound, unlockAudio } from "../../lib/orderSound"
import useNewOrderAlerts from "./useNewOrderAlerts"
import {
    applyBranding,
    SETTINGS_CHANGED_EVENT,
} from "../../lib/branding"

const SOUND_KEY = "menuflow_admin_sound"
const THEME_KEY = "menuflow_admin_theme"

const readSoundPreference = () => {
    try {
        return localStorage.getItem(SOUND_KEY) !== "off"
    } catch {
        return true
    }
}

const readThemePreference = () => {
    try {
        const saved = localStorage.getItem(THEME_KEY)
        if (saved === "dark") return true
        if (saved === "light") return false
        // مفيش تفضيل محفوظ: نتبع إعدادات النظام
        return window.matchMedia?.(
            "(prefers-color-scheme: dark)"
        ).matches ?? false
    } catch {
        return false
    }
}

const getOrderTypeText = (type) => {
    if (type === "delivery") return "توصيل"
    if (type === "pickup") return "استلام"
    if (type === "dine-in") return "داخل المطعم"

    return ""
}

const describeOrder = (order) => {
    const parts = [getOrderTypeText(order.order_type)]

    if (order.order_type === "dine-in" && order.table_number) {
        parts.push(`طاولة ${order.table_number}`)
    }

    if (order.total_price != null) {
        parts.push(`${order.total_price} جنيه`)
    }

    return parts.filter(Boolean).join(" — ")
}

// لوجو المطعم (أو أول حرف من اسمه لو مفيش لوجو)
function BrandMark({ logo, name, className }) {
    return (
        <div
            className={`${className} overflow-hidden bg-(--color-primary) text-white flex items-center justify-center font-bold shrink-0`}
        >
            {logo ? (
                <img
                    src={logo}
                    alt={name}
                    className="w-full h-full object-cover"
                />
            ) : (
                (name || "M").charAt(0)
            )}
        </div>
    )
}

function AdminLayout() {
    const navigate = useNavigate()

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    /* ---------- جلسة الأدمن ---------- */
    const [session, setSession] = useState(undefined)
    const [authData, setAuthData] = useState(null)

    useEffect(() => {
        let active = true

        const updateAuthAndSession = async (currentSession) => {
            setSession(currentSession ?? null)
            if (currentSession?.user) {
                // جلب الصلاحيات ومعرف المطعم التابع للمستخدم
                const { data: roleData } = await supabase
                    .from("user_roles")
                    .select("role, restaurant_id")
                    .eq("user_id", currentSession.user.id)
                    .maybeSingle()

                if (active) {
                    setAuthData({
                        user: currentSession.user,
                        role: roleData?.role || "admin",
                        restaurant_id: roleData?.restaurant_id || null,
                    })
                }
            } else if (active) {
                setAuthData(null)
            }
        }

        supabase.auth.getSession().then(({ data }) => {
            if (active) updateAuthAndSession(data.session)
        })

        const { data: listener } = supabase.auth.onAuthStateChange(
            (_event, newSession) => {
                if (active) updateAuthAndSession(newSession)
            }
        )

        return () => {
            active = false
            listener.subscription.unsubscribe()
        }
    }, [])

    /* ---------- بيانات المطعم + مفتوح/مغلق ---------- */
    const [restaurant, setRestaurant] = useState({
        id: null,
        slug: "",
        settingsId: null,
        name: "",
        logo: "",
        isOpen: true,
    })
    const [togglingOpen, setTogglingOpen] = useState(false)

    const restaurantId = authData?.restaurant_id || null

    useEffect(() => {
        if (!restaurantId) return

        let active = true

        const loadRestaurant = async () => {
            const [{ data: restRow }, { data: settingsRow }] = await Promise.all([
                supabase
                    .from("restaurants")
                    .select("id, slug, name")
                    .eq("id", restaurantId)
                    .maybeSingle(),
                supabase
                    .from("restaurant_settings")
                    .select("id, restaurant_name, logo_url, is_open")
                    .eq("restaurant_id", restaurantId)
                    .limit(1)
                    .maybeSingle(),
            ])

            if (active) {
                setRestaurant({
                    id: restaurantId,
                    slug: restRow?.slug || "",
                    settingsId: settingsRow?.id || null,
                    name: settingsRow?.restaurant_name || restRow?.name || "",
                    logo: settingsRow?.logo_url || "",
                    isOpen: settingsRow?.is_open ?? true,
                })
            }
        }

        loadRestaurant()

        // لما الإعدادات تتحفظ (اسم / لوجو جديد)
        window.addEventListener(SETTINGS_CHANGED_EVENT, loadRestaurant)

        return () => {
            active = false
            window.removeEventListener(
                SETTINGS_CHANGED_EVENT,
                loadRestaurant
            )
        }
    }, [restaurantId])

    const toggleOpen = async () => {
        if (!restaurant.settingsId || togglingOpen) return

        const next = !restaurant.isOpen

        if (
            !next &&
            !window.confirm(
                "هتقفل استقبال الطلبات من المنيو. متأكد؟"
            )
        ) {
            return
        }

        setTogglingOpen(true)

        const { data, error } = await supabase
            .from("restaurant_settings")
            .update({
                is_open: next,
                updated_at: new Date().toISOString(),
            })
            .eq("id", restaurant.settingsId)
            .select("id")

        if (error || !data || data.length === 0) {
            console.error("Toggle open error:", error)

            alert(
                error?.message ||
                "تعذر تغيير حالة المطعم. تأكد من صلاحيات التعديل في Supabase."
            )
        } else {
            setRestaurant((current) => ({
                ...current,
                isOpen: next,
            }))
        }

        setTogglingOpen(false)
    }

    const brandName = restaurant.name || "MenuFlow"

    /* ---------- تنبيهات الطلبات الجديدة ---------- */
    const [soundEnabled, setSoundEnabled] = useState(readSoundPreference)
    const [isDarkMode, setIsDarkMode] = useState(readThemePreference)

    useEffect(() => {
        document.documentElement.classList.toggle("dark", isDarkMode)
        try {
            localStorage.setItem(THEME_KEY, isDarkMode ? "dark" : "light")
        } catch {
            // ignore
        }
    }, [isDarkMode])

    // لو المستخدم خرج من لوحة الأدمن (مثلاً لصفحة تسجيل الدخول أو منيو
    // مطعم في نفس التبويب)، نشيل كلاس الوضع الليلي عشان ما يأثرش
    // على صفحات تانية مالهاش علاقة بالوضع الليلي
    useEffect(() => {
        return () => {
            document.documentElement.classList.remove("dark")
        }
    }, [])

    const toggleTheme = () => {
        setIsDarkMode((current) => !current)
    }
    const [audioReady, setAudioReady] = useState(false)
    const [toasts, setToasts] = useState([])

    const dismissToast = (id) => {
        setToasts((current) =>
            current.filter((toast) => toast.id !== id)
        )
    }

    const handleNewOrder = (order) => {
        setToasts((current) => [order, ...current].slice(0, 3))

        setTimeout(() => dismissToast(order.id), 20000)

        if (soundEnabled) {
            playOrderSound().then((played) => {
                if (!played) setAudioReady(false)
            })
        }

        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200])
        }

        if (
            document.hidden &&
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
        ) {
            new Notification("طلب جديد 🔔", {
                body: `${order.order_number || ""} — ${describeOrder(order)}`,
                tag: order.id,
            })
        }
    }

    // العميل ألغى طلبه: تنبيه عشان المطعم ما يجهّزوش
    const handleCustomerCancel = (order) => {
        const toastId = `cancel-${order.id}`

        setToasts((current) =>
            [
                { ...order, id: toastId, kind: "cancel" },
                ...current,
            ].slice(0, 3)
        )

        setTimeout(() => dismissToast(toastId), 30000)

        if (soundEnabled) {
            playOrderSound({ repeat: 2 })
        }

        if (navigator.vibrate) {
            navigator.vibrate([400, 150, 400])
        }

        if (
            document.hidden &&
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
        ) {
            new Notification("العميل ألغى الطلب ❌", {
                body: `${order.order_number || ""}${order.cancel_reason ? ` — ${order.cancel_reason}` : ""}`,
                tag: toastId,
            })
        }
    }

    const { pendingCount, realtimeStatus } = useNewOrderAlerts({
        restaurantId,
        enabled: Boolean(session) && Boolean(restaurantId),
        onNewOrder: handleNewOrder,
        onCustomerCancel: handleCustomerCancel,
    })

    // أول ضغطة في الصفحة تفعّل الصوت (شرط من المتصفحات)
    useEffect(() => {
        let active = true

        const unlock = () => {
            unlockAudio().then((ready) => {
                if (active && ready) setAudioReady(true)
            })
        }

        unlock()

        window.addEventListener("pointerdown", unlock)
        window.addEventListener("keydown", unlock)

        return () => {
            active = false
            window.removeEventListener("pointerdown", unlock)
            window.removeEventListener("keydown", unlock)
        }
    }, [])

    // عدد الطلبات الجديدة في عنوان التبويب
    useEffect(() => {
        const base = `${brandName} | لوحة التحكم`

        document.title =
            pendingCount > 0
                ? `(${pendingCount}) طلب جديد — ${base}`
                : base
    }, [pendingCount, brandName])

    // أيقونة التبويب = لوجو المطعم
    useEffect(() => {
        applyBranding({ iconUrl: restaurant.logo })
    }, [restaurant.logo])

    const enableSound = async () => {
        const ready = await unlockAudio()

        setAudioReady(ready)

        if (ready) {
            playOrderSound({ repeat: 1 })
        }

        if (
            typeof Notification !== "undefined" &&
            Notification.permission === "default"
        ) {
            Notification.requestPermission()
        }
    }

    const toggleSound = async () => {
        const next = !soundEnabled

        setSoundEnabled(next)

        try {
            localStorage.setItem(SOUND_KEY, next ? "on" : "off")
        } catch {
            // ignore
        }

        if (next) {
            await enableSound()
        }
    }

    const realtimeLabel =
        realtimeStatus === "SUBSCRIBED"
            ? "🟢 تنبيهات لحظية"
            : "🟡 فحص كل 15 ثانية"

    const handleLogout = async () => {
        await supabase.auth.signOut()
        navigate("/admin/login")
    }

    const navItems = [
        { label: "الرئيسية", path: "/admin", icon: "🏠" },
        { label: "الطلبات", path: "/admin/orders", icon: "📦" },
        { label: "المنتجات", path: "/admin/products", icon: "🍔" },
        { label: "التصنيفات", path: "/admin/categories", icon: "📂" },
        { label: "الطاولات", path: "/admin/tables", icon: "🪑" },
        {
            label: "إعدادات المطعم",
            path: "/admin/settings",
            icon: "⚙️",
        },
    ]

    const closeMobileMenu = () => {
        setMobileMenuOpen(false)
    }

    if (session === undefined) {
        return (
            <div
                dir="rtl"
                className="min-h-screen flex items-center justify-center bg-(--color-background)"
            >
                <p className="opacity-60">جاري التحميل...</p>
            </div>
        )
    }

    if (!session) {
        return <Navigate to="/admin/login" replace />
    }

    // لوحة تحكم المطاعم دي لأصحاب المطاعم بس؛ صاحب المنصة له لوحته الخاصة
    if (authData?.role === "super_admin") {
        return <Navigate to="/super-admin" replace />
    }

    const ordersBadge = pendingCount > 0 && (
        <span className="absolute -top-1.5 -right-2 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">
            {pendingCount > 99 ? "99+" : pendingCount}
        </span>
    )

    return (
        <div
            dir="rtl"
            className="min-h-screen bg-(--color-background)"
        >
            <div className="min-h-screen">

                {/* =====================================================
                    Desktop Sidebar
                    - ثابت يمين الشاشة
                    - مغلق: أيقونات فقط
                    - Hover: يفتح
                ===================================================== */}
                <aside
                    className="
                        hidden md:flex
                        fixed top-0 right-0
                        z-50
                        h-screen
                        w-18
                        hover:w-72
                        shrink-0
                        bg-(--color-card)
                        border-l
                        flex-col
                        overflow-hidden
                        transition-[width]
                        duration-300
                        ease-in-out
                        group
                    "
                >

                    {/* Logo */}
                    <div className="h-22 px-3 border-b flex items-center">

                        <div className="flex items-center gap-3 min-w-max">

                            <BrandMark
                                logo={restaurant.logo}
                                name={brandName}
                                className="w-11 h-11 rounded-xl"
                            />

                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                                <h1 className="font-bold text-lg">
                                    {brandName}
                                </h1>

                                <p className="text-xs opacity-50">
                                    لوحة التحكم
                                </p>
                            </div>

                        </div>

                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-3 space-y-2">

                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === "/admin"}
                                title={item.label}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 h-12 px-3 rounded-xl font-medium transition-colors duration-200 whitespace-nowrap ${isActive
                                        ? "bg-(--color-primary) text-white"
                                        : "hover:bg-(--color-background)"
                                    }`
                                }
                            >
                                <span className="relative w-6 shrink-0 text-lg text-center">
                                    {item.icon}
                                    {item.path === "/admin/orders" &&
                                        ordersBadge}
                                </span>

                                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    {item.label}
                                </span>
                            </NavLink>
                        ))}

                    </nav>

                    {/* Open / Closed toggle */}
                    <div className="px-3 pb-2">

                        <button
                            type="button"
                            onClick={toggleOpen}
                            disabled={togglingOpen || !restaurant.settingsId}
                            title={
                                restaurant.isOpen
                                    ? "المطعم مفتوح — اضغط للإغلاق"
                                    : "المطعم مغلق — اضغط للفتح"
                            }
                            className="w-full flex items-center gap-3 h-12 px-3 rounded-xl font-medium hover:bg-(--color-background) transition-colors duration-200 whitespace-nowrap disabled:opacity-50"
                        >
                            <span className="w-6 shrink-0 text-lg text-center">
                                {restaurant.isOpen ? "🟢" : "🔴"}
                            </span>

                            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-right">
                                <span className="block text-sm">
                                    {restaurant.isOpen
                                        ? "المطعم مفتوح"
                                        : "المطعم مغلق"}
                                </span>
                                <span className="block text-xs opacity-60">
                                    {restaurant.isOpen
                                        ? "اضغط للإغلاق"
                                        : "اضغط للفتح"}
                                </span>
                            </span>
                        </button>

                    </div>

                    {/* Sound toggle */}
                    <div className="px-3 pb-2">

                        <button
                            type="button"
                            onClick={toggleSound}
                            title={
                                soundEnabled
                                    ? "إيقاف صوت التنبيهات"
                                    : "تشغيل صوت التنبيهات"
                            }
                            className="w-full flex items-center gap-3 h-12 px-3 rounded-xl font-medium hover:bg-(--color-background) transition-colors duration-200 whitespace-nowrap"
                        >
                            <span className="w-6 shrink-0 text-lg text-center">
                                {soundEnabled ? "🔔" : "🔕"}
                            </span>

                            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-right">
                                <span className="block text-sm">
                                    {soundEnabled
                                        ? "صوت التنبيه: شغال"
                                        : "صوت التنبيه: مقفول"}
                                </span>
                                <span className="block text-xs opacity-60">
                                    {realtimeLabel}
                                </span>
                            </span>
                        </button>

                    </div>

                    {/* Dark mode toggle */}
                    <div className="px-3 pb-2">

                        <button
                            type="button"
                            onClick={toggleTheme}
                            title={
                                isDarkMode
                                    ? "الوضع الفاتح"
                                    : "الوضع الليلي"
                            }
                            className="w-full flex items-center gap-3 h-12 px-3 rounded-xl font-medium hover:bg-(--color-background) transition-colors duration-200 whitespace-nowrap"
                        >
                            <span className="w-6 shrink-0 text-lg text-center">
                                {isDarkMode ? "☀️" : "🌙"}
                            </span>

                            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-right">
                                <span className="block text-sm">
                                    {isDarkMode ? "الوضع الفاتح" : "الوضع الليلي"}
                                </span>
                            </span>
                        </button>

                    </div>

                    {/* Logout */}
                    <div className="p-3 border-t">

                        <button
                            type="button"
                            onClick={handleLogout}
                            title="تسجيل الخروج"
                            className="w-full flex items-center gap-3 h-12 px-3 rounded-xl font-medium text-red-600 hover:bg-red-50 transition-colors duration-200 whitespace-nowrap"
                        >
                            <span className="w-6 shrink-0 text-lg text-center">
                                🚪
                            </span>

                            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                تسجيل الخروج
                            </span>
                        </button>

                    </div>

                </aside>

                {/* =====================================================
                    Mobile Sidebar Overlay
                ===================================================== */}
                {mobileMenuOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/40 md:hidden"
                        onClick={closeMobileMenu}
                    />
                )}

                {/* =====================================================
                    Mobile Sidebar
                ===================================================== */}
                <aside
                    className={`
                        fixed top-0 right-0
                        z-50
                        h-full
                        w-72
                        bg-(--color-card)
                        shadow-2xl
                        flex flex-col
                        md:hidden
                        transition-transform
                        duration-300
                        ${mobileMenuOpen
                            ? "translate-x-0"
                            : "translate-x-full"
                        }
                    `}
                >

                    {/* Mobile Header */}
                    <div className="p-5 border-b">

                        <div className="flex items-center justify-between gap-3">

                            <div className="flex items-center gap-3">

                                <BrandMark
                                    logo={restaurant.logo}
                                    name={brandName}
                                    className="w-11 h-11 rounded-xl"
                                />

                                <div>
                                    <h1 className="font-bold text-lg">
                                        {brandName}
                                    </h1>

                                    <p className="text-xs opacity-50">
                                        لوحة التحكم
                                    </p>
                                </div>

                            </div>

                            <button
                                type="button"
                                onClick={closeMobileMenu}
                                className="w-10 h-10 rounded-xl hover:bg-(--color-background) transition text-xl"
                            >
                                ✕
                            </button>

                        </div>

                    </div>

                    {/* Mobile Navigation */}
                    <nav className="flex-1 p-4 space-y-2">

                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === "/admin"}
                                onClick={closeMobileMenu}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${isActive
                                        ? "bg-(--color-primary) text-white"
                                        : "hover:bg-(--color-background)"
                                    }`
                                }
                            >
                                <span className="text-lg">
                                    {item.icon}
                                </span>

                                <span className="flex-1">
                                    {item.label}
                                </span>

                                {item.path === "/admin/orders" &&
                                    pendingCount > 0 && (
                                        <span className="min-w-6 h-6 px-1.5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                                            {pendingCount > 99
                                                ? "99+"
                                                : pendingCount}
                                        </span>
                                    )}
                            </NavLink>
                        ))}

                    </nav>

                    {/* Mobile open / closed toggle */}
                    <div className="px-4 pb-2">

                        <button
                            type="button"
                            onClick={toggleOpen}
                            disabled={togglingOpen || !restaurant.settingsId}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium hover:bg-(--color-background) transition text-right disabled:opacity-50"
                        >
                            <span className="text-lg">
                                {restaurant.isOpen ? "🟢" : "🔴"}
                            </span>

                            <span>
                                <span className="block">
                                    {restaurant.isOpen
                                        ? "المطعم مفتوح"
                                        : "المطعم مغلق"}
                                </span>
                                <span className="block text-xs opacity-60">
                                    {restaurant.isOpen
                                        ? "اضغط للإغلاق"
                                        : "اضغط للفتح"}
                                </span>
                            </span>
                        </button>

                    </div>

                    {/* Mobile sound toggle */}
                    <div className="px-4 pb-2">

                        <button
                            type="button"
                            onClick={toggleSound}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium hover:bg-(--color-background) transition text-right"
                        >
                            <span className="text-lg">
                                {soundEnabled ? "🔔" : "🔕"}
                            </span>

                            <span>
                                <span className="block">
                                    {soundEnabled
                                        ? "صوت التنبيه: شغال"
                                        : "صوت التنبيه: مقفول"}
                                </span>
                                <span className="block text-xs opacity-60">
                                    {realtimeLabel}
                                </span>
                            </span>
                        </button>

                    </div>

                    {/* Mobile dark mode toggle */}
                    <div className="px-4 pb-2">

                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium hover:bg-(--color-background) transition text-right"
                        >
                            <span className="text-lg">
                                {isDarkMode ? "☀️" : "🌙"}
                            </span>

                            <span className="block">
                                {isDarkMode ? "الوضع الفاتح" : "الوضع الليلي"}
                            </span>
                        </button>

                    </div>

                    {/* Mobile Logout */}
                    <div className="p-4 border-t">

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-600 hover:bg-red-50 transition"
                        >
                            <span className="text-lg">
                                🚪
                            </span>

                            <span>
                                تسجيل الخروج
                            </span>
                        </button>

                    </div>

                </aside>

                {/* =====================================================
                    Main Content
                    Desktop:
                    72px مساحة للـSidebar
                ===================================================== */}
                <main className="md:mr-18 min-w-0">

                    {/* Mobile Header */}
                    <div className="md:hidden sticky top-0 z-30 h-16 bg-(--color-card) border-b flex items-center justify-between px-4">

                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(true)}
                            className="w-11 h-11 rounded-xl hover:bg-(--color-background) transition flex items-center justify-center text-2xl"
                            aria-label="فتح القائمة"
                        >
                            ☰
                        </button>

                        <div className="flex items-center gap-2">

                            <button
                                type="button"
                                onClick={toggleOpen}
                                disabled={togglingOpen || !restaurant.settingsId}
                                aria-label="فتح أو إغلاق المطعم"
                                className={`h-8 px-2.5 rounded-full text-xs font-bold text-white flex items-center gap-1 disabled:opacity-50 ${restaurant.isOpen
                                    ? "bg-green-600"
                                    : "bg-red-600"
                                    }`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                {restaurant.isOpen ? "مفتوح" : "مغلق"}
                            </button>

                            <button
                                type="button"
                                onClick={toggleSound}
                                aria-label="صوت التنبيهات"
                                className="relative w-10 h-10 rounded-xl hover:bg-(--color-background) transition flex items-center justify-center text-xl"
                            >
                                {soundEnabled ? "🔔" : "🔕"}
                                {pendingCount > 0 && (
                                    <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                                        {pendingCount > 99 ? "99+" : pendingCount}
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={toggleTheme}
                                aria-label="الوضع الليلي"
                                className="w-10 h-10 rounded-xl hover:bg-(--color-background) transition flex items-center justify-center text-xl"
                            >
                                {isDarkMode ? "☀️" : "🌙"}
                            </button>

                            <BrandMark
                                logo={restaurant.logo}
                                name={brandName}
                                className="w-9 h-9 rounded-lg text-sm"
                            />

                            <span className="font-bold max-w-24 truncate">
                                {brandName}
                            </span>

                        </div>

                    </div>

                    {/* 🔥 تمرير الـ context لجميع العناصر الابنة مثل AdminProducts */}
                    <Outlet context={{ authData, restaurant, session }} />

                </main>

            </div>

            {/* =====================================================
                إشعارات الطلبات الجديدة
            ===================================================== */}
            {toasts.length > 0 && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-80 w-[calc(100%-2rem)] max-w-sm space-y-3">

                    {toasts.map((toast) => (
                        <div
                            key={toast.id}
                            role="alert"
                            className={`bg-(--color-card) border-2 rounded-2xl shadow-2xl p-4 ${toast.kind === "cancel"
                                ? "border-red-600"
                                : "border-(--color-success)"
                                }`}
                        >

                            <div className="flex items-start justify-between gap-3">

                                <div>

                                    <p className="font-bold text-lg">
                                        {toast.kind === "cancel"
                                            ? "❌ العميل ألغى الطلب"
                                            : "🔔 طلب جديد!"}
                                    </p>

                                    <p className="font-semibold mt-1">
                                        {toast.order_number}
                                    </p>

                                    <p className="text-sm opacity-70 mt-1">
                                        {describeOrder(toast)}
                                    </p>

                                    {toast.kind === "cancel" &&
                                        toast.cancel_reason && (
                                            <p className="text-sm text-red-700 mt-2">
                                                السبب: {toast.cancel_reason}
                                            </p>
                                        )}

                                </div>

                                <button
                                    type="button"
                                    onClick={() => dismissToast(toast.id)}
                                    aria-label="إغلاق"
                                    className="w-8 h-8 rounded-full hover:bg-(--color-background) shrink-0"
                                >
                                    ✕
                                </button>

                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    dismissToast(toast.id)
                                    navigate("/admin/orders")
                                }}
                                className="w-full mt-3 bg-(--color-primary) text-white py-2.5 rounded-xl font-medium"
                            >
                                عرض الطلبات
                            </button>

                        </div>
                    ))}

                </div>
            )}

            {/* تفعيل الصوت (المتصفح بيطلب ضغطة واحدة) */}
            {soundEnabled && !audioReady && (
                <div className="fixed bottom-4 left-4 z-50">
                    <button
                        type="button"
                        onClick={enableSound}
                        className="bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-amber-600 transition"
                    >
                        اضغط هنا لتفعيل صوت الإشعارات 🔔
                    </button>
                </div>
            )}
        </div>
    )
}

export default AdminLayout