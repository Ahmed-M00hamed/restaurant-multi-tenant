
import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"

function AdminCategories() {
    const [categories, setCategories] = useState([])
    const [products, setProducts] = useState([])

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [deletingId, setDeletingId] = useState(null)

    const [search, setSearch] = useState("")
    const [showForm, setShowForm] = useState(false)

    const [editingCategory, setEditingCategory] = useState(null)
    const [name, setName] = useState("")

    const fetchData = async () => {
        setLoading(true)

        const [categoriesResult, productsResult] = await Promise.all([
            supabase
                .from("categories")
                .select("*")
                .order("created_at", { ascending: false }),

            supabase
                .from("products")
                .select("id, category"),
        ])

        if (categoriesResult.error) {
            console.error("Categories fetch error:", categoriesResult.error)
            alert("حدث خطأ أثناء تحميل التصنيفات.")
        }

        if (productsResult.error) {
            console.error("Products fetch error:", productsResult.error)
        }

        setCategories(categoriesResult.data || [])
        setProducts(productsResult.data || [])

        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [])

    const productCountByCategory = useMemo(() => {
        const counts = {}

        products.forEach((product) => {
            if (!product.category) return

            counts[product.category] = (counts[product.category] || 0) + 1
        })

        return counts
    }, [products])

    const filteredCategories = useMemo(() => {
        const value = search.trim().toLowerCase()

        if (!value) return categories

        return categories.filter((category) =>
            category.name.toLowerCase().includes(value)
        )
    }, [categories, search])

    const openAddForm = () => {
        setEditingCategory(null)
        setName("")
        setShowForm(true)
    }

    const openEditForm = (category) => {
        setEditingCategory(category)
        setName(category.name)
        setShowForm(true)
    }

    const closeForm = () => {
        if (saving) return

        setShowForm(false)
        setEditingCategory(null)
        setName("")
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        const trimmedName = name.trim()

        if (!trimmedName) {
            alert("من فضلك اكتب اسم التصنيف.")
            return
        }

        const duplicate = categories.some(
            (category) =>
                category.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
                category.id !== editingCategory?.id
        )

        if (duplicate) {
            alert("التصنيف ده موجود بالفعل.")
            return
        }

        setSaving(true)

        if (editingCategory) {
            const { data, error } = await supabase
                .from("categories")
                .update({
                    name: trimmedName,
                })
                .eq("id", editingCategory.id)
                .select()
                .single()

            if (error) {
                console.error("Category update error:", error)
                alert("حدث خطأ أثناء تعديل التصنيف.")
                setSaving(false)
                return
            }

            setCategories((current) =>
                current.map((category) =>
                    category.id === editingCategory.id ? data : category
                )
            )
        } else {
            const { data, error } = await supabase
                .from("categories")
                .insert({
                    name: trimmedName,
                })
                .select()
                .single()

            if (error) {
                console.error("Category insert error:", error)
                alert("حدث خطأ أثناء إضافة التصنيف.")
                setSaving(false)
                return
            }

            setCategories((current) => [data, ...current])
        }

        setSaving(false)
        closeForm()
    }

    const handleDelete = async (category) => {
        const count = productCountByCategory[category.name] || 0

        if (count > 0) {
            alert(
                `لا يمكن حذف التصنيف "${category.name}" لأنه مستخدم في ${count} منتج.`
            )
            return
        }

        const confirmed = window.confirm(
            `هل أنت متأكد من حذف التصنيف "${category.name}"؟`
        )

        if (!confirmed) return

        setDeletingId(category.id)

        const { error } = await supabase
            .from("categories")
            .delete()
            .eq("id", category.id)

        if (error) {
            console.error("Category delete error:", error)
            alert("حدث خطأ أثناء حذف التصنيف.")
            setDeletingId(null)
            return
        }

        setCategories((current) =>
            current.filter((item) => item.id !== category.id)
        )

        setDeletingId(null)
    }

    return (
        <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold">التصنيفات</h1>
                    <p className="opacity-60 mt-2">
                        إدارة تصنيفات المنتجات في المنيو
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openAddForm}
                    className="bg-(--color-primary) text-white px-5 py-3 rounded-xl font-semibold hover:opacity-90 transition"
                >
                    + إضافة تصنيف
                </button>
            </div>

            {showForm && (
                <div className="bg-(--color-card) border rounded-2xl p-5 md:p-6 mb-6">
                    <div className="flex items-center justify-between gap-4 mb-5">
                        <div>
                            <h2 className="text-xl font-bold">
                                {editingCategory ? "تعديل التصنيف" : "إضافة تصنيف جديد"}
                            </h2>

                            <p className="text-sm opacity-60 mt-1">
                                اكتب اسم التصنيف كما سيظهر في المنيو
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={closeForm}
                            disabled={saving}
                            className="w-10 h-10 rounded-xl hover:bg-(--color-background) transition disabled:opacity-50"
                        >
                            ✕
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="flex flex-col md:flex-row gap-3">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="مثال: برجر"
                                autoFocus
                                className="flex-1 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-(--color-primary)"
                            />

                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-(--color-primary) text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
                            >
                                {saving
                                    ? "جاري الحفظ..."
                                    : editingCategory
                                        ? "حفظ التعديل"
                                        : "إضافة التصنيف"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-(--color-card) border rounded-2xl p-4 mb-6">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="🔎 البحث عن تصنيف..."
                    className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-(--color-primary)"
                />
            </div>

            {loading ? (
                <div className="bg-(--color-card) border rounded-2xl p-10 text-center">
                    <p className="opacity-60">جاري تحميل التصنيفات...</p>
                </div>
            ) : filteredCategories.length === 0 ? (
                <div className="bg-(--color-card) border rounded-2xl p-10 text-center">
                    <div className="text-5xl mb-4">📂</div>

                    <h2 className="text-xl font-bold">
                        لا توجد تصنيفات
                    </h2>

                    <p className="opacity-60 mt-2">
                        أضف أول تصنيف للمنيو.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                    {filteredCategories.map((category) => {
                        const productCount =
                            productCountByCategory[category.name] || 0

                        return (
                            <div
                                key={category.id}
                                className="bg-(--color-card) border rounded-2xl p-5"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-12 h-12 rounded-xl bg-(--color-background) flex items-center justify-center text-2xl shrink-0">
                                            📂
                                        </div>

                                        <div className="min-w-0">
                                            <h2 className="font-bold text-lg truncate">
                                                {category.name}
                                            </h2>

                                            <p className="text-sm opacity-60 mt-1">
                                                {productCount} منتج
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-5 pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={() => openEditForm(category)}
                                        className="flex-1 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition"
                                    >
                                        ✏️ تعديل
                                    </button>

                                    <button
                                        type="button"
                                        disabled={deletingId === category.id}
                                        onClick={() => handleDelete(category)}
                                        className="flex-1 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
                                    >
                                        {deletingId === category.id ? "..." : "🗑️ حذف"}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default AdminCategories
