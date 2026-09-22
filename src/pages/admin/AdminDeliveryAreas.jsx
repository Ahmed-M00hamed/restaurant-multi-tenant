
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
        if (!restaurantId) return

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
            if (!restaurantId) {
                alert("تعذر تحديد المطعم.")
                setSaving(false)
                return
            }

            result = await supabase
                .from("delivery_areas")
                .insert({ ...payload, restaurant_id: restaurantId })
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
            {/* Header */}
            <div className="mb-6">
                {embedded ? (
                    <h2 className="text-xl font-bold">
                        مناطق التوصيل
                    </h2>
                ) : (
                    <h1 className="text-2xl md:text-3xl font-bold">
                        مناطق التوصيل
                    </h1>
                )}

                <p className="mt-2 text-sm opacity-60">
                    أضف وعدّل أسعار مناطق التوصيل التي تظهر للعملاء عند اختيار
                    التوصيل. تقدر توقف أي منطقة مؤقتًا من غير ما تمسحها.
                    التغييرات هنا بتتحفظ فورًا.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 p-5">
                    <p className="text-sm opacity-60">إجمالي المناطق</p>
                    <p className="text-3xl font-bold mt-2">{areas.length}</p>
                </div>

                <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 p-5">
                    <p className="text-sm opacity-60">المناطق النشطة</p>
                    <p className="text-3xl font-bold mt-2">{activeAreas.length}</p>
                </div>

                <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 p-5">
                    <p className="text-sm opacity-60">المناطق الموقوفة</p>
                    <p className="text-3xl font-bold mt-2">{inactiveAreas.length}</p>
                </div>
            </div>

            {/* Form */}
            <div ref={formRef} className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 p-5 md:p-6 mb-6">
                <div className="flex items-center justify-between gap-4 mb-5">
                    <div>
                        <h2 className="text-xl font-bold">
                            {editingId ? "تعديل منطقة" : "إضافة منطقة جديدة"}
                        </h2>

                        <p className="text-sm opacity-60 mt-1">
                            {editingId
                                ? "عدّل بيانات المنطقة ثم احفظ التغييرات."
                                : "أضف منطقة جديدة مع سعر التوصيل."}
                        </p>
                    </div>

                    {editingId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition"
                        >
                            إلغاء التعديل
                        </button>
                    )}
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
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
                            placeholder="مثال: المجاوره 1"
                            className="w-full rounded-xl border border-black bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
                        />
                    </div>

                    {/* Price */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            سعر التوصيل
                        </label>

                        <div className="relative">
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
                                placeholder="30"
                                className="w-full rounded-xl border border-black bg-transparent px-4 py-3 pl-16 outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
                            />

                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm opacity-50">
                                جنيه
                            </span>
                        </div>
                    </div>

                    {/* Active */}
                    <div className="flex items-end">
                        <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-black/10 dark:border-white/10 px-4 py-3 w-full">
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        is_active: e.target.checked,
                                    }))
                                }
                                className="w-4 h-4"
                            />

                            <span className="text-sm font-medium">
                                المنطقة متاحة للعملاء
                            </span>
                        </label>
                    </div>

                    {/* Submit */}
                    <div className="md:col-span-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full md:w-auto px-6 py-3 rounded-xl bg-black text-white  font-semibold disabled:opacity-50 transition"
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

            {/* Areas */}
            <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
                <div className="p-5 border-b border-black/10 dark:border-white/10">
                    <h2 className="text-xl font-bold">كل مناطق التوصيل</h2>
                </div>

                {loading ? (
                    <div className="p-10 text-center opacity-60">
                        جاري تحميل مناطق التوصيل...
                    </div>
                ) : areas.length === 0 ? (
                    <div className="p-10 text-center">
                        <p className="text-lg font-semibold">
                            لا توجد مناطق توصيل
                        </p>

                        <p className="text-sm opacity-60 mt-2">
                            أضف أول منطقة توصيل من النموذج بالأعلى.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-black/10 dark:divide-white/10">
                        {areas.map((area) => (
                            <div
                                key={area.id}
                                className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                {/* Info */}
                                <div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="font-bold text-lg">
                                            {area.name}
                                        </h3>

                                        <span
                                            className={`text-xs px-3 py-1 rounded-full ${area.is_active
                                                    ? "bg-green-500/10 text-green-600"
                                                    : "bg-red-500/10 text-red-600"
                                                }`}
                                        >
                                            {area.is_active ? "نشطة" : "موقوفة"}
                                        </span>
                                    </div>

                                    <p className="mt-1 text-sm opacity-60">
                                        سعر التوصيل:{" "}
                                        <span className="font-semibold opacity-100">
                                            {Number(area.price).toFixed(2)} جنيه
                                        </span>
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleEdit(area)}
                                        className="px-4 py-2 rounded-xl border border-black/10  hover:bg-black/5 transition"
                                    >
                                        تعديل
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleToggleActive(area)}
                                        className={`px-4 py-2 rounded-xl transition ${area.is_active
                                                ? "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
                                                : "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                                            }`}
                                    >
                                        {area.is_active ? "إيقاف" : "تفعيل"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleDelete(area)}
                                        className="px-4 py-2 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500/20 transition"
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
    )
}

export default AdminDeliveryAreas