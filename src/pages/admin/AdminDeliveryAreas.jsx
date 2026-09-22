
import { useEffect, useRef, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { supabase } from "../../lib/supabase"

function AdminDeliveryAreas({ embedded = false }) {
    const { authData } = useOutletContext() || {}
    const restaurantId = authData?.restaurant_id || null

    const formRef = useRef(null)

    const [areas, setAreas] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState(null)

    const [form, setForm] = useState({
        name: "",
        price: "",
        is_active: true,
    })

    const fetchAreas = async () => {
        if (!restaurantId) {
            setAreas([])
            setLoading(false)
            return
        }

        setLoading(true)

        const { data, error } = await supabase
            .from("delivery_areas")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .order("created_at", { ascending: false })

        if (error) {
            console.error("Fetch delivery areas error:", error)
            alert(error.message)
        } else {
            setAreas(data || [])
        }

        setLoading(false)
    }

    useEffect(() => {
        fetchAreas()
    }, [restaurantId])

    const resetForm = () => {
        setEditingId(null)

        setForm({
            name: "",
            price: "",
            is_active: true,
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        const name = form.name.trim()
        const price = Number(form.price)

        if (!name) {
            alert("اكتب اسم المنطقة.")
            return
        }

        if (Number.isNaN(price) || price < 0) {
            alert("اكتب سعر توصيل صحيح.")
            return
        }

        if (!restaurantId) {
            alert("تعذر تحديد المطعم.")
            return
        }

        setSaving(true)

        const payload = {
            name,
            price,
            is_active: form.is_active,
        }

        let result

        if (editingId) {
            result = await supabase
                .from("delivery_areas")
                .update(payload)
                .eq("id", editingId)
                .eq("restaurant_id", restaurantId)
        } else {
            result = await supabase
                .from("delivery_areas")
                .insert({
                    ...payload,
                    restaurant_id: restaurantId,
                })
        }

        if (result.error) {
            console.error("Save delivery area error:", result.error)
            alert(result.error.message)
        } else {
            resetForm()
            await fetchAreas()
        }

        setSaving(false)
    }

    const handleEdit = (area) => {
        setEditingId(area.id)

        setForm({
            name: area.name,
            price: area.price,
            is_active: area.is_active,
        })

        formRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
        })
    }

    const handleToggleActive = async (area) => {
        if (!restaurantId) {
            alert("تعذر تحديد المطعم.")
            return
        }

        const { error } = await supabase
            .from("delivery_areas")
            .update({
                is_active: !area.is_active,
            })
            .eq("id", area.id)
            .eq("restaurant_id", restaurantId)

        if (error) {
            console.error("Toggle delivery area error:", error)
            alert(error.message)
            return
        }

        await fetchAreas()
    }

    const handleDelete = async (area) => {
        const confirmed = window.confirm(
            `هل أنت متأكد من حذف منطقة "${area.name}"؟`,
        )

        if (!confirmed) return

        if (!restaurantId) {
            alert("تعذر تحديد المطعم.")
            return
        }

        const { error } = await supabase
            .from("delivery_areas")
            .delete()
            .eq("id", area.id)
            .eq("restaurant_id", restaurantId)

        if (error) {
            console.error("Delete delivery area error:", error)
            alert(error.message)
            return
        }

        if (editingId === area.id) {
            resetForm()
        }

        await fetchAreas()
    }

    const activeAreas = areas.filter((area) => area.is_active)
    const inactiveAreas = areas.filter((area) => !area.is_active)

    return (
        <div
            className={embedded ? "" : "min-h-full p-4 md:p-8"}
            dir="rtl"
        >
            <div className="mx-auto max-w-6xl space-y-6">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        مناطق التوصيل
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        أضف وعدّل مناطق التوصيل وأسعارها.
                    </p>
                </div>

                {/* Form */}
                <div
                    ref={formRef}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                {editingId
                                    ? "تعديل منطقة"
                                    : "إضافة منطقة جديدة"}
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                اسم المنطقة وسعر التوصيل.
                            </p>
                        </div>

                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                            >
                                إلغاء التعديل
                            </button>
                        )}
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="grid grid-cols-1 gap-4 md:grid-cols-3"
                    >
                        {/* Name */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                اسم المنطقة
                            </label>

                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        name: e.target.value,
                                    }))
                                }
                                placeholder="مثال: العاشر من رمضان"
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-400"
                            />
                        </div>

                        {/* Price */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                سعر التوصيل
                            </label>

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.price}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        price: e.target.value,
                                    }))
                                }
                                placeholder="مثال: 30"
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-400"
                            />
                        </div>

                        {/* Active */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                الحالة
                            </label>

                            <label className="flex h-[46px] cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-4">
                                <span className="text-sm text-gray-700">
                                    المنطقة متاحة للطلب
                                </span>

                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            is_active: e.target.checked,
                                        }))
                                    }
                                    className="h-4 w-4"
                                />
                            </label>
                        </div>

                        {/* Submit */}
                        <div className="md:col-span-3">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {saving
                                    ? "جاري الحفظ..."
                                    : editingId
                                        ? "حفظ التعديلات"
                                        : "إضافة المنطقة"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <p className="text-sm text-gray-500">
                            إجمالي المناطق
                        </p>

                        <p className="mt-2 text-2xl font-bold text-gray-900">
                            {areas.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <p className="text-sm text-gray-500">
                            المناطق النشطة
                        </p>

                        <p className="mt-2 text-2xl font-bold text-green-600">
                            {activeAreas.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <p className="text-sm text-gray-500">
                            المناطق غير النشطة
                        </p>

                        <p className="mt-2 text-2xl font-bold text-gray-500">
                            {inactiveAreas.length}
                        </p>
                    </div>
                </div>

                {/* Areas List */}
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-5 py-4">
                        <h2 className="font-bold text-gray-900">
                            المناطق
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-sm text-gray-500">
                            جاري تحميل المناطق...
                        </div>
                    ) : areas.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="font-medium text-gray-700">
                                لا توجد مناطق توصيل حتى الآن.
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                                أضف أول منطقة من النموذج بالأعلى.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {areas.map((area) => (
                                <div
                                    key={area.id}
                                    className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-semibold text-gray-900">
                                                {area.name}
                                            </h3>

                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${area.is_active
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-gray-100 text-gray-600"
                                                    }`}
                                            >
                                                {area.is_active
                                                    ? "نشطة"
                                                    : "غير نشطة"}
                                            </span>
                                        </div>

                                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                                            <span>
                                                سعر التوصيل:{" "}
                                                <strong className="text-gray-900">
                                                    {area.price} جنيه
                                                </strong>
                                            </span>

                                            <span>
                                                ID: {area.id}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleToggleActive(area)
                                            }
                                            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                                        >
                                            {area.is_active
                                                ? "إيقاف"
                                                : "تفعيل"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleEdit(area)}
                                            className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-200"
                                        >
                                            تعديل
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleDelete(area)
                                            }
                                            className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                                        >
                                            حذف
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AdminDeliveryAreas
