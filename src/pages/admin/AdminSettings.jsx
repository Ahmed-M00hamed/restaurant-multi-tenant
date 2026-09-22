import { useEffect, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { uploadBrandingImage } from "../../lib/image"
import {
    DEFAULT_OVERLAY_COLOR,
    DEFAULT_OVERLAY_OPACITY,
    getHeaderOverlay,
    hexToRgb,
    SETTINGS_CHANGED_EVENT,
} from "../../lib/branding"

const OVERLAY_PRESETS = [
    { name: "بني", color: "#54341e" },
    { name: "أسود", color: "#111827" },
    { name: "أحمر غامق", color: "#7f1d1d" },
    { name: "أخضر غامق", color: "#14532d" },
    { name: "أزرق غامق", color: "#1e3a8a" },
    { name: "ذهبي", color: "#b45309" },
    { name: "أبيض", color: "#ffffff" },
]
import AdminDeliveryAreas from "./AdminDeliveryAreas"

function AdminSettings() {
    const { authData, restaurant } = useOutletContext() || {}
    const restaurantId = authData?.restaurant_id || null

    const [settings, setSettings] = useState(null)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(null)

    const loadSettings = async () => {
        if (!restaurantId) return

        setLoading(true)

        const { data, error } = await supabase
            .from("restaurant_settings")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .limit(1)
            .maybeSingle()

        if (error) {
            console.error("Settings load error:", error)
            alert(error.message)
            setLoading(false)
            return
        }

        if (!data) {
            // مطعم جديد لسه مفيهوش صف إعدادات — بننشئ واحد بقيم افتراضية
            const { data: created, error: createError } = await supabase
                .from("restaurant_settings")
                .insert({
                    restaurant_id: restaurantId,
                    restaurant_name: restaurant?.name || "",
                    description: "",
                    phone: "",
                    address: "",
                    logo_url: "",
                    cover_url: null,
                    header_color: null,
                    header_opacity: null,
                    is_open: true,
                    closed_message: "المطعم مغلق حاليًا",
                    delivery_enabled: true,
                    pickup_enabled: true,
                    dine_in_enabled: true,
                    cash_payment_enabled: true,
                    online_payment_enabled: false,
                    primary_color: "#000000",
                    background_color: "#f8f8f8",
                    card_color: "#ffffff",
                })
                .select()
                .single()

            if (createError) {
                console.error("Settings create error:", createError)
                alert(createError.message)
                setLoading(false)
                return
            }

            setSettings(created)
            setLoading(false)
            return
        }

        setSettings(data)
        setLoading(false)
    }

    useEffect(() => {
        loadSettings()
    }, [restaurantId])

    const updateField = (field, value) => {
        setSettings((current) => ({
            ...current,
            [field]: value,
        }))
    }

    const handleSave = async () => {
        if (!settings) return

        setSaving(true)

        const { error } = await supabase
            .from("restaurant_settings")
            .update({
                restaurant_name: settings.restaurant_name,
                description: settings.description,
                phone: settings.phone,
                address: settings.address,

                logo_url: settings.logo_url,
                cover_url: settings.cover_url || null,
                header_color: settings.header_color || null,
                header_opacity:
                    settings.header_opacity === "" ||
                    settings.header_opacity === undefined
                        ? null
                        : settings.header_opacity,

                // is_open بيتغيّر من الزرار اللي جنب الجرس، مش من هنا
                closed_message: settings.closed_message,

                delivery_enabled: settings.delivery_enabled,
                pickup_enabled: settings.pickup_enabled,
                dine_in_enabled: settings.dine_in_enabled,

                cash_payment_enabled: settings.cash_payment_enabled,
                online_payment_enabled: settings.online_payment_enabled,

                primary_color: settings.primary_color,
                background_color: settings.background_color,
                card_color: settings.card_color,

                updated_at: new Date().toISOString(),
            })
            .eq("id", settings.id)
            .eq("restaurant_id", restaurantId)

        if (error) {
            console.error("Settings save error:", error)
            alert(error.message)
            setSaving(false)
            return
        }

        window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT))

        alert("تم حفظ إعدادات المطعم بنجاح ✅")

        setSaving(false)

        await loadSettings()
    }

    const handleImageUpload = async (kind, e) => {
        const file = e.target.files?.[0]

        e.target.value = ""

        if (!file) return

        setUploading(kind)

        try {
            const url = await uploadBrandingImage(
                file,
                kind,
                kind === "logo"
                    ? { maxSize: 512 }
                    : { maxSize: 1600 }
            )

            updateField(
                kind === "logo" ? "logo_url" : "cover_url",
                url
            )
        } catch (error) {
            console.error("Image upload error:", error)
            alert(error.message || "تعذر رفع الصورة.")
        }

        setUploading(null)
    }

    const overlay = getHeaderOverlay(
        settings?.header_color,
        settings?.header_opacity
    )

    const pickerColor = hexToRgb(settings?.header_color)
        ? settings.header_color.length === 4
            ? "#" +
              settings.header_color
                  .slice(1)
                  .split("")
                  .map((c) => c + c)
                  .join("")
            : settings.header_color
        : DEFAULT_OVERLAY_COLOR

    if (loading) {
        return (
            <div
                dir="rtl"
                className="min-h-screen flex items-center justify-center p-6"
            >
                <div className="text-center">
                    <div className="text-lg font-semibold">
                        جاري تحميل الإعدادات...
                    </div>

                    <p className="text-sm opacity-60 mt-1">
                        لحظات من فضلك
                    </p>
                </div>
            </div>
        )
    }

    if (!settings) {
        return (
            <div
                dir="rtl"
                className="min-h-screen flex items-center justify-center p-6"
            >
                <div className="text-center">
                    <h1 className="text-xl font-bold">
                        لا توجد إعدادات للمطعم
                    </h1>

                    <button
                        type="button"
                        onClick={loadSettings}
                        className="mt-4 px-5 py-3 rounded-xl bg-(--color-primary) text-white"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div
            dir="rtl"
            className="min-h-screen p-4 md:p-8"
        >
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <div className="mb-8">

                    <p className="text-sm opacity-50 mb-1">
                        MenuFlow Admin
                    </p>

                    <h1 className="text-3xl md:text-4xl font-bold">
                        إعدادات المطعم
                    </h1>

                    <p className="opacity-60 mt-2">
                        تحكم في بيانات المطعم وطريقة ظهور المنيو والطلبات.
                    </p>

                </div>

                <div className="space-y-6">

                    {/* =================================================
                        Restaurant Information
                    ================================================= */}
                    <section className="bg-(--color-card) rounded-2xl shadow-sm p-5 md:p-6">

                        <div className="mb-6">
                            <h2 className="text-xl font-bold">
                                بيانات المطعم
                            </h2>

                            <p className="text-sm opacity-60 mt-1">
                                المعلومات الأساسية التي تظهر للعملاء.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                            {/* Restaurant Name */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    اسم المطعم
                                </label>

                                <input
                                    type="text"
                                    value={settings.restaurant_name || ""}
                                    onChange={(e) =>
                                        updateField(
                                            "restaurant_name",
                                            e.target.value
                                        )
                                    }
                                    className="w-full px-4 py-3 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-(--color-primary)"
                                    placeholder="اسم المطعم"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    رقم الهاتف
                                </label>

                                <input
                                    type="text"
                                    value={settings.phone || ""}
                                    onChange={(e) =>
                                        updateField(
                                            "phone",
                                            e.target.value
                                        )
                                    }
                                    className="w-full px-4 py-3 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-(--color-primary)"
                                    placeholder="01xxxxxxxxx"
                                    dir="ltr"
                                />
                            </div>

                            {/* Description */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-2">
                                    وصف المطعم
                                </label>

                                <textarea
                                    rows="3"
                                    value={settings.description || ""}
                                    onChange={(e) =>
                                        updateField(
                                            "description",
                                            e.target.value
                                        )
                                    }
                                    className="w-full px-4 py-3 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-(--color-primary) resize-none"
                                    placeholder="وصف قصير يظهر للعملاء"
                                />
                            </div>

                            {/* Address */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-2">
                                    العنوان
                                </label>

                                <input
                                    type="text"
                                    value={settings.address || ""}
                                    onChange={(e) =>
                                        updateField(
                                            "address",
                                            e.target.value
                                        )
                                    }
                                    className="w-full px-4 py-3 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-(--color-primary)"
                                    placeholder="عنوان المطعم"
                                />
                            </div>

                            {/* Logo */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-2">
                                    لوجو المطعم
                                </label>

                                <div className="flex items-center gap-4">

                                    <div className="w-20 h-20 rounded-full overflow-hidden border bg-(--color-background) flex items-center justify-center shrink-0">
                                        {settings.logo_url ? (
                                            <img
                                                src={settings.logo_url}
                                                alt="لوجو المطعم"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-2xl opacity-40">
                                                🍽️
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-start gap-2">

                                        <label className="px-4 py-2.5 rounded-xl border cursor-pointer text-sm font-medium hover:bg-(--color-background) transition">
                                            {uploading === "logo"
                                                ? "جاري الرفع..."
                                                : settings.logo_url
                                                    ? "تغيير اللوجو"
                                                    : "رفع لوجو"}

                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                disabled={Boolean(uploading)}
                                                onChange={(e) =>
                                                    handleImageUpload("logo", e)
                                                }
                                            />
                                        </label>

                                        {settings.logo_url && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    updateField("logo_url", "")
                                                }
                                                className="text-sm text-red-600"
                                            >
                                                إزالة اللوجو
                                            </button>
                                        )}

                                    </div>

                                </div>

                                <p className="text-xs opacity-60 mt-2">
                                    بيظهر في هيدر المنيو، وكأيقونة للموقع في تبويب المتصفح.
                                </p>
                            </div>

                            {/* Cover */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-2">
                                    صورة خلفية الهيدر
                                </label>

                                {/* Live preview */}
                                <div className="relative h-44 rounded-2xl overflow-hidden border bg-(--color-background)">

                                    {settings.cover_url ? (
                                        <img
                                            src={settings.cover_url}
                                            alt="خلفية الهيدر"
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-sm opacity-50">
                                            لم يتم رفع صورة بعد
                                        </div>
                                    )}

                                    <div
                                        className="absolute inset-x-3 bottom-3 rounded-2xl p-3 flex items-center gap-3 backdrop-blur-sm"
                                        style={{
                                            backgroundColor:
                                                overlay.backgroundColor,
                                            color: overlay.textColor,
                                        }}
                                    >

                                        <div className="w-12 h-12 rounded-full bg-white/20 overflow-hidden flex items-center justify-center font-bold shrink-0">
                                            {settings.logo_url ? (
                                                <img
                                                    src={settings.logo_url}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                (settings.restaurant_name || "M").charAt(0)
                                            )}
                                        </div>

                                        <div>
                                            <p className="font-bold">
                                                {settings.restaurant_name || "اسم المطعم"}
                                            </p>

                                            <p
                                                className={`text-xs ${overlay.isLightText
                                                        ? "text-green-300"
                                                        : "text-green-700"
                                                    }`}
                                            >
                                                ● مفتوح الآن
                                            </p>
                                        </div>

                                    </div>

                                </div>

                                <div className="flex flex-wrap items-center gap-3 mt-3">

                                    <label className="px-4 py-2.5 rounded-xl border cursor-pointer text-sm font-medium hover:bg-(--color-background) transition">
                                        {uploading === "cover"
                                            ? "جاري الرفع..."
                                            : settings.cover_url
                                                ? "تغيير الصورة"
                                                : "رفع صورة"}

                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            disabled={Boolean(uploading)}
                                            onChange={(e) =>
                                                handleImageUpload("cover", e)
                                            }
                                        />
                                    </label>

                                    {settings.cover_url && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateField("cover_url", "")
                                            }
                                            className="text-sm text-red-600"
                                        >
                                            إزالة الصورة
                                        </button>
                                    )}

                                </div>

                                {/* Header color */}
                                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">

                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            لون خلفية الاسم واللوجو
                                        </label>

                                        <div className="flex items-center gap-3">

                                            <input
                                                type="color"
                                                value={pickerColor}
                                                onChange={(e) =>
                                                    updateField(
                                                        "header_color",
                                                        e.target.value
                                                    )
                                                }
                                                className="w-14 h-12 rounded-xl cursor-pointer border-0"
                                            />

                                            <input
                                                type="text"
                                                value={settings.header_color || ""}
                                                onChange={(e) =>
                                                    updateField(
                                                        "header_color",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder={DEFAULT_OVERLAY_COLOR}
                                                className="flex-1 min-w-0 px-3 py-3 rounded-xl border bg-transparent outline-none"
                                                dir="ltr"
                                            />

                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 mt-3">

                                            {OVERLAY_PRESETS.map((preset) => (
                                                <button
                                                    key={preset.color}
                                                    type="button"
                                                    title={preset.name}
                                                    aria-label={preset.name}
                                                    onClick={() =>
                                                        updateField(
                                                            "header_color",
                                                            preset.color
                                                        )
                                                    }
                                                    className={`w-8 h-8 rounded-full border-2 ${pickerColor.toLowerCase() === preset.color
                                                            ? "border-(--color-primary) scale-110"
                                                            : "border-gray-300"
                                                        }`}
                                                    style={{
                                                        backgroundColor: preset.color,
                                                    }}
                                                />
                                            ))}

                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            الشفافية: {overlay.percent}%
                                        </label>

                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="5"
                                            value={overlay.percent}
                                            onChange={(e) =>
                                                updateField(
                                                    "header_opacity",
                                                    Number(e.target.value)
                                                )
                                            }
                                            className="w-full accent-(--color-primary)"
                                        />

                                        <p className="text-xs opacity-60 mt-1">
                                            كل ما الرقم يزيد اللون بيبقى أغمق وأوضح.
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                updateField("header_color", "")
                                                updateField("header_opacity", null)
                                            }}
                                            className="text-sm text-red-600 mt-3"
                                        >
                                            استرجاع الافتراضي (بني {DEFAULT_OVERLAY_OPACITY}%)
                                        </button>
                                    </div>

                                </div>

                                <p className="text-xs opacity-60 mt-2">
                                    الأفضل صورة عرضية (مثلًا 1600×600). اسم المطعم واللوجو بيظهروا فوقها على خلفية شفافة بلون من اختيارك، ولون الكلام بيتظبط لوحده (أبيض على الألوان الغامقة وأسود على الفاتحة). لو ماعندكش صورة، اللون ده بيبقى خلفية الهيدر نفسها. اضغط "حفظ التعديلات" بعد أي تغيير.
                                </p>
                            </div>

                        </div>

                    </section>

                    {/* =================================================
                        Closed Message
                    ================================================= */}
                    <section className="bg-(--color-card) rounded-2xl shadow-sm p-5 md:p-6">

                        <div className="mb-6">
                            <h2 className="text-xl font-bold">
                                رسالة الإغلاق
                            </h2>

                            <p className="text-sm opacity-60 mt-1">
                                بتظهر للعملاء لما المطعم يكون مغلق. فتح وإغلاق المطعم بقى من الزرار اللي جنب الجرس 🔔 في القائمة.
                            </p>
                        </div>

                        <input
                            type="text"
                            value={settings.closed_message || ""}
                            onChange={(e) =>
                                updateField(
                                    "closed_message",
                                    e.target.value
                                )
                            }
                            className="w-full px-4 py-3 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-(--color-primary)"
                            placeholder="المطعم مغلق حاليًا"
                        />

                    </section>

                    {/* =================================================
                        Order Types
                    ================================================= */}
                    <section className="bg-(--color-card) rounded-2xl shadow-sm p-5 md:p-6">

                        <div className="mb-6">
                            <h2 className="text-xl font-bold">
                                طرق استلام الطلب
                            </h2>

                            <p className="text-sm opacity-60 mt-1">
                                اختر طرق الطلب التي تريد إتاحتها للعملاء.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                            {/* Delivery */}
                            <label className="flex items-center justify-between gap-4 p-4 rounded-xl bg-(--color-background) cursor-pointer">

                                <div>
                                    <p className="font-semibold">
                                        🛵 التوصيل
                                    </p>

                                    <p className="text-xs opacity-60 mt-1">
                                        طلب وتوصيل للعميل
                                    </p>
                                </div>

                                <input
                                    type="checkbox"
                                    checked={settings.delivery_enabled}
                                    onChange={(e) =>
                                        updateField(
                                            "delivery_enabled",
                                            e.target.checked
                                        )
                                    }
                                    className="w-5 h-5 accent-(--color-primary)"
                                />

                            </label>

                            {/* Pickup */}
                            <label className="flex items-center justify-between gap-4 p-4 rounded-xl bg-(--color-background) cursor-pointer">

                                <div>
                                    <p className="font-semibold">
                                        🛍️ الاستلام
                                    </p>

                                    <p className="text-xs opacity-60 mt-1">
                                        العميل يستلم الطلب
                                    </p>
                                </div>

                                <input
                                    type="checkbox"
                                    checked={settings.pickup_enabled}
                                    onChange={(e) =>
                                        updateField(
                                            "pickup_enabled",
                                            e.target.checked
                                        )
                                    }
                                    className="w-5 h-5 accent-(--color-primary)"
                                />

                            </label>

                            {/* Dine In */}
                            <label className="flex items-center justify-between gap-4 p-4 rounded-xl bg-(--color-background) cursor-pointer">

                                <div>
                                    <p className="font-semibold">
                                        🍽️ داخل المطعم
                                    </p>

                                    <p className="text-xs opacity-60 mt-1">
                                        الطلب من داخل المطعم
                                    </p>
                                </div>

                                <input
                                    type="checkbox"
                                    checked={settings.dine_in_enabled}
                                    onChange={(e) =>
                                        updateField(
                                            "dine_in_enabled",
                                            e.target.checked
                                        )
                                    }
                                    className="w-5 h-5 accent-(--color-primary)"
                                />

                            </label>

                        </div>

                    </section>

                    {/* =================================================
                        Payment Methods
                    ================================================= */}
                    <section className="bg-(--color-card) rounded-2xl shadow-sm p-5 md:p-6">

                        <div className="mb-6">
                            <h2 className="text-xl font-bold">
                                طرق الدفع
                            </h2>

                            <p className="text-sm opacity-60 mt-1">
                                حدد طرق الدفع المتاحة للعملاء.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Cash */}
                            <label className="flex items-center justify-between gap-4 p-4 rounded-xl bg-(--color-background) cursor-pointer">

                                <div>
                                    <p className="font-semibold">
                                        💵 الدفع نقدًا
                                    </p>

                                    <p className="text-xs opacity-60 mt-1">
                                        الدفع عند استلام الطلب
                                    </p>
                                </div>

                                <input
                                    type="checkbox"
                                    checked={
                                        settings.cash_payment_enabled
                                    }
                                    onChange={(e) =>
                                        updateField(
                                            "cash_payment_enabled",
                                            e.target.checked
                                        )
                                    }
                                    className="w-5 h-5 accent-(--color-primary)"
                                />

                            </label>

                            {/* Online */}
                            <label className="flex items-center justify-between gap-4 p-4 rounded-xl bg-(--color-background) cursor-pointer">

                                <div>
                                    <p className="font-semibold">
                                        💳 الدفع أونلاين
                                    </p>

                                    <p className="text-xs opacity-60 mt-1">
                                        الدفع الإلكتروني
                                    </p>
                                </div>

                                <input
                                    type="checkbox"
                                    checked={
                                        settings.online_payment_enabled
                                    }
                                    onChange={(e) =>
                                        updateField(
                                            "online_payment_enabled",
                                            e.target.checked
                                        )
                                    }
                                    className="w-5 h-5 accent-(--color-primary)"
                                />

                            </label>

                        </div>

                    </section>

                    {/* =================================================
                        Delivery Areas
                    ================================================= */}
                    <section className="bg-(--color-card) rounded-2xl shadow-sm p-5 md:p-6">

                        <AdminDeliveryAreas embedded />

                    </section>

                    {/* =================================================
                        Theme
                    ================================================= */}
                    <section className="bg-(--color-card) rounded-2xl shadow-sm p-5 md:p-6">

                        <div className="mb-6">
                            <h2 className="text-xl font-bold">
                                ألوان المنيو
                            </h2>

                            <p className="text-sm opacity-60 mt-1">
                                اختر الألوان الأساسية لواجهة المنيو.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

                            {/* Primary */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    اللون الأساسي
                                </label>

                                <div className="flex items-center gap-3">

                                    <input
                                        type="color"
                                        value={
                                            settings.primary_color ||
                                            "#000000"
                                        }
                                        onChange={(e) =>
                                            updateField(
                                                "primary_color",
                                                e.target.value
                                            )
                                        }
                                        className="w-14 h-12 rounded-xl cursor-pointer border-0"
                                    />

                                    <input
                                        type="text"
                                        value={
                                            settings.primary_color ||
                                            ""
                                        }
                                        onChange={(e) =>
                                            updateField(
                                                "primary_color",
                                                e.target.value
                                            )
                                        }
                                        className="flex-1 min-w-0 px-3 py-3 rounded-xl border bg-transparent outline-none"
                                        dir="ltr"
                                    />

                                </div>
                            </div>

                            {/* Background */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    لون الخلفية
                                </label>

                                <div className="flex items-center gap-3">

                                    <input
                                        type="color"
                                        value={
                                            settings.background_color ||
                                            "#f8f8f8"
                                        }
                                        onChange={(e) =>
                                            updateField(
                                                "background_color",
                                                e.target.value
                                            )
                                        }
                                        className="w-14 h-12 rounded-xl cursor-pointer border-0"
                                    />

                                    <input
                                        type="text"
                                        value={
                                            settings.background_color ||
                                            ""
                                        }
                                        onChange={(e) =>
                                            updateField(
                                                "background_color",
                                                e.target.value
                                            )
                                        }
                                        className="flex-1 min-w-0 px-3 py-3 rounded-xl border bg-transparent outline-none"
                                        dir="ltr"
                                    />

                                </div>
                            </div>

                            {/* Card */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    لون البطاقات
                                </label>

                                <div className="flex items-center gap-3">

                                    <input
                                        type="color"
                                        value={
                                            settings.card_color ||
                                            "#ffffff"
                                        }
                                        onChange={(e) =>
                                            updateField(
                                                "card_color",
                                                e.target.value
                                            )
                                        }
                                        className="w-14 h-12 rounded-xl cursor-pointer border-0"
                                    />

                                    <input
                                        type="text"
                                        value={
                                            settings.card_color ||
                                            ""
                                        }
                                        onChange={(e) =>
                                            updateField(
                                                "card_color",
                                                e.target.value
                                            )
                                        }
                                        className="flex-1 min-w-0 px-3 py-3 rounded-xl border bg-transparent outline-none"
                                        dir="ltr"
                                    />

                                </div>
                            </div>

                        </div>

                    </section>

                    {/* Save */}
                    <div className="sticky bottom-4 z-20">

                        <div className="bg-(--color-card) rounded-2xl shadow-lg border p-4 flex items-center justify-between gap-4">

                            <div className="hidden sm:block">
                                <p className="font-semibold">
                                    حفظ إعدادات المطعم
                                </p>

                                <p className="text-xs opacity-60 mt-1">
                                    تأكد من حفظ التعديلات قبل مغادرة الصفحة.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-(--color-primary) text-white font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving
                                    ? "جاري الحفظ..."
                                    : "💾 حفظ التعديلات"}
                            </button>

                        </div>

                    </div>

                </div>

            </div>
        </div>
    )
}

export default AdminSettings
