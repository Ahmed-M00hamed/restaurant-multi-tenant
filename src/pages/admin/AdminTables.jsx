import { useEffect, useState } from "react"
import { useOutletContext } from "react-router-dom"
import QRCode from "react-qr-code"
import { supabase } from "../../lib/supabase"

function AdminTables() {
    const { authData, restaurant } = useOutletContext() || {}

    const restaurantId = authData?.restaurant_id || null
    const restaurantSlug = restaurant?.slug || ""

    const [tables, setTables] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [deletingId, setDeletingId] = useState(null)

    const [searchTerm, setSearchTerm] = useState("")

    const [showForm, setShowForm] = useState(false)
    const [editingTable, setEditingTable] = useState(null)
    const [selectedTable, setSelectedTable] = useState(null)

    const [form, setForm] = useState({
        table_number: "",
        name: "",
        capacity: 4,
        is_active: true,
    })

    // =========================
    // Fetch Tables
    // =========================

    const fetchTables = async () => {
        if (!restaurantId) {
            setTables([])
            setLoading(false)
            return
        }

        setLoading(true)

        const { data, error } = await supabase
            .from("tables")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .order("table_number", { ascending: true })

        if (error) {
            console.error("Fetch tables error:", error)
            alert("حدث خطأ أثناء تحميل الطاولات")
            setTables([])
        } else {
            setTables(data || [])
        }

        setLoading(false)
    }

    useEffect(() => {
        fetchTables()
    }, [restaurantId])

    // =========================
    // QR URL
    // =========================

    const getTableUrl = (tableNumber) => {
        if (!restaurantSlug) {
            return ""
        }

        const url = new URL(
            `/${encodeURIComponent(restaurantSlug)}`,
            window.location.origin
        )

        url.searchParams.set("table", tableNumber)

        return url.toString()
    }

    // =========================
    // Open Add Form
    // =========================

    const openAddForm = () => {
        setEditingTable(null)

        setForm({
            table_number: "",
            name: "",
            capacity: 4,
            is_active: true,
        })

        setShowForm(true)
    }

    // =========================
    // Open Edit Form
    // =========================

    const openEditForm = (table) => {
        setEditingTable(table)

        setForm({
            table_number: table.table_number,
            name: table.name || "",
            capacity: table.capacity || 4,
            is_active: table.is_active,
        })

        setShowForm(true)
    }

    // =========================
    // Close Form
    // =========================

    const closeForm = () => {
        if (saving) return

        setShowForm(false)
        setEditingTable(null)
    }

    // =========================
    // Save Table
    // =========================

    const handleSave = async (e) => {
        e.preventDefault()

        const tableNumber = Number(form.table_number)
        const capacity = Number(form.capacity)

        if (!tableNumber || tableNumber <= 0) {
            alert("من فضلك أدخل رقم ترابيزة صحيح")
            return
        }

        if (!capacity || capacity <= 0) {
            alert("من فضلك أدخل عدد مقاعد صحيح")
            return
        }

        if (!restaurantId) {
            alert("تعذر تحديد المطعم.")
            return
        }

        if (!restaurantSlug) {
            alert("تعذر إنشاء QR لأن رابط المطعم غير متاح.")
            return
        }

        setSaving(true)

        const payload = {
            table_number: tableNumber,
            name: form.name.trim() || null,
            capacity,
            is_active: form.is_active,
        }

        let error = null

        if (editingTable) {
            const result = await supabase
                .from("tables")
                .update(payload)
                .eq("id", editingTable.id)
                .eq("restaurant_id", restaurantId)

            error = result.error
        } else {
            const result = await supabase
                .from("tables")
                .insert({
                    ...payload,
                    restaurant_id: restaurantId,
                })

            error = result.error
        }

        if (error) {
            console.error("Save table error:", error)

            if (error.code === "23505") {
                alert("رقم الترابيزة موجود بالفعل")
            } else {
                alert("حدث خطأ أثناء حفظ الترابيزة")
            }

            setSaving(false)
            return
        }

        setSaving(false)
        setShowForm(false)
        setEditingTable(null)

        await fetchTables()
    }

    // =========================
    // Delete Table
    // =========================

    const handleDelete = async (table) => {
        const confirmed = window.confirm(
            `هل أنت متأكد من حذف ترابيزة رقم ${table.table_number}؟`
        )

        if (!confirmed) return

        setDeletingId(table.id)

        const { error } = await supabase
            .from("tables")
            .delete()
            .eq("id", table.id)
            .eq("restaurant_id", restaurantId)

        if (error) {
            console.error("Delete table error:", error)
            alert("حدث خطأ أثناء حذف الترابيزة")
        } else {
            await fetchTables()
        }

        setDeletingId(null)
    }

    // =========================
    // Toggle Active
    // =========================

    const toggleActive = async (table) => {
        const { error } = await supabase
            .from("tables")
            .update({
                is_active: !table.is_active,
            })
            .eq("id", table.id)
            .eq("restaurant_id", restaurantId)

        if (error) {
            console.error("Toggle table error:", error)
            alert("حدث خطأ أثناء تغيير حالة الترابيزة")
            return
        }

        await fetchTables()
    }

    // =========================
    // Copy QR URL
    // =========================

    const copyTableUrl = async (tableNumber) => {
        const url = getTableUrl(tableNumber)

        if (!url) {
            alert("تعذر إنشاء رابط الترابيزة لأن رابط المطعم غير متاح.")
            return
        }

        try {
            await navigator.clipboard.writeText(url)
            alert("تم نسخ رابط الترابيزة")
        } catch (error) {
            console.error("Copy URL error:", error)
            alert("لم نتمكن من نسخ الرابط")
        }
    }

    // =========================
    // Print QR
    // =========================

    const printQRCode = (table) => {
        const qrSvg = document.querySelector(
            `[data-table-qr="${table.id}"]`
        )

        if (!qrSvg) {
            alert("لم يتم العثور على QR")
            return
        }

        const tableUrl = getTableUrl(table.table_number)

        if (!tableUrl) {
            alert("تعذر إنشاء رابط الترابيزة لأن رابط المطعم غير متاح.")
            return
        }

        const printWindow = window.open(
            "",
            "_blank",
            "width=700,height=800"
        )

        if (!printWindow) {
            alert("المتصفح منع فتح نافذة الطباعة")
            return
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8" />
                <title>QR - ترابيزة ${table.table_number}</title>

                <style>
                    * {
                        box-sizing: border-box;
                    }

                    body {
                        margin: 0;
                        padding: 40px;
                        font-family: Arial, sans-serif;
                        text-align: center;
                        background: white;
                        color: #111;
                    }

                    .card {
                        max-width: 500px;
                        margin: 0 auto;
                        border: 2px solid #ddd;
                        border-radius: 24px;
                        padding: 40px;
                    }

                    h1 {
                        margin: 0 0 10px;
                        font-size: 32px;
                    }

                    h2 {
                        margin: 0 0 30px;
                        font-size: 24px;
                    }

                    .qr {
                        display: flex;
                        justify-content: center;
                        margin: 20px 0 30px;
                    }

                    .text {
                        font-size: 20px;
                        line-height: 1.7;
                    }

                    .url {
                        margin-top: 20px;
                        font-size: 12px;
                        color: #666;
                        word-break: break-all;
                    }

                    @media print {
                        body {
                            padding: 0;
                        }

                        .card {
                            border: none;
                        }
                    }
                </style>
            </head>

            <body>

                <div class="card">

                    <h1>MenuFlow</h1>

                    <h2>
                        ترابيزة رقم ${table.table_number}
                    </h2>

                    <div class="qr">
                        ${qrSvg.outerHTML}
                    </div>

                    <div class="text">
                        امسح الكود لفتح المنيو
                        <br />
                        وطلب الطعام من داخل المطعم
                    </div>

                    <div class="url">
                        ${tableUrl}
                    </div>

                </div>

                <script>
                    window.onload = function () {
                        window.print()
                    }
                </script>

            </body>
            </html>
        `)

        printWindow.document.close()
    }

    // =========================
    // Filter
    // =========================

    const filteredTables = tables.filter((table) => {
        const search = searchTerm.trim().toLowerCase()

        if (!search) return true

        return (
            String(table.table_number)
                .toLowerCase()
                .includes(search) ||
            (table.name || "")
                .toLowerCase()
                .includes(search)
        )
    })

    // =========================
    // Stats
    // =========================

    const totalTables = tables.length

    const activeTables = tables.filter(
        (table) => table.is_active
    ).length

    const inactiveTables = tables.filter(
        (table) => !table.is_active
    ).length

    // =========================
    // Loading
    // =========================

    if (loading) {
        return (
            <div className="p-6 md:p-8">

                <div className="animate-pulse space-y-6">

                    <div className="h-10 bg-black/5 rounded-xl w-48" />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                        <div className="h-28 bg-black/5 rounded-2xl" />
                        <div className="h-28 bg-black/5 rounded-2xl" />
                        <div className="h-28 bg-black/5 rounded-2xl" />

                    </div>

                    <div className="h-20 bg-black/5 rounded-2xl" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

                        {Array.from({ length: 6 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-80 bg-black/5 rounded-2xl"
                            />
                        ))}

                    </div>

                </div>

            </div>
        )
    }

    return (
        <div
            dir="rtl"
            className="p-4 md:p-6 lg:p-8"
        >

            {/* Header */}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

                <div>

                    <h1 className="text-2xl md:text-3xl font-bold">
                        الطاولات
                    </h1>

                    <p className="opacity-60 mt-1">
                        إدارة طاولات المطعم وروابط QR
                    </p>

                </div>

                <button
                    type="button"
                    onClick={openAddForm}
                    className="bg-(--color-primary) text-white px-5 py-3 rounded-xl font-bold hover:opacity-90 transition"
                >
                    + إضافة ترابيزة
                </button>

            </div>

            {/* Restaurant Slug Warning */}

            {!restaurantSlug && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 text-red-700 p-4">
                    <p className="font-bold">
                        تنبيه
                    </p>

                    <p className="text-sm mt-1">
                        لم يتم العثور على رابط المطعم (Slug)،
                        لذلك لن يمكن إنشاء روابط QR للطاولات.
                    </p>
                </div>
            )}

            {/* Stats */}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">

                <div className="bg-(--color-card) rounded-2xl p-5 border">

                    <div className="flex items-center justify-between">

                        <div>
                            <p className="text-sm opacity-60">
                                إجمالي الطاولات
                            </p>

                            <p className="text-3xl font-bold mt-2">
                                {totalTables}
                            </p>
                        </div>

                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">
                            🪑
                        </div>

                    </div>

                </div>

                <div className="bg-(--color-card) rounded-2xl p-5 border">

                    <div className="flex items-center justify-between">

                        <div>
                            <p className="text-sm opacity-60">
                                الطاولات النشطة
                            </p>

                            <p className="text-3xl font-bold mt-2 text-green-600">
                                {activeTables}
                            </p>
                        </div>

                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-2xl">
                            ✅
                        </div>

                    </div>

                </div>

                <div className="bg-(--color-card) rounded-2xl p-5 border">

                    <div className="flex items-center justify-between">

                        <div>
                            <p className="text-sm opacity-60">
                                الطاولات المتوقفة
                            </p>

                            <p className="text-3xl font-bold mt-2 text-red-600">
                                {inactiveTables}
                            </p>
                        </div>

                        <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-2xl">
                            ⛔
                        </div>

                    </div>

                </div>

            </div>

            {/* Search */}

            <div className="bg-(--color-card) border rounded-2xl p-4 mb-6">

                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ابحث برقم الترابيزة أو اسمها..."
                    className="w-full px-4 py-3 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-(--color-primary)"
                />

            </div>

            {/* Empty */}

            {filteredTables.length === 0 ? (
                <div className="bg-(--color-card) border rounded-2xl p-10 text-center">

                    <div className="text-5xl mb-4">
                        🪑
                    </div>

                    <h2 className="text-xl font-bold">
                        لا توجد طاولات
                    </h2>

                    <p className="opacity-60 mt-2">
                        أضف أول ترابيزة للمطعم
                    </p>

                    <button
                        type="button"
                        onClick={openAddForm}
                        className="mt-5 bg-(--color-primary) text-white px-5 py-3 rounded-xl font-bold"
                    >
                        إضافة ترابيزة
                    </button>

                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">

                    {filteredTables.map((table) => {

                        const tableUrl = getTableUrl(
                            table.table_number
                        )

                        return (
                            <div
                                key={table.id}
                                className="bg-(--color-card) border rounded-2xl overflow-hidden"
                            >

                                {/* Card Header */}

                                <div className="p-5 border-b">

                                    <div className="flex items-start justify-between gap-3">

                                        <div>

                                            <div className="flex items-center gap-2">

                                                <h2 className="text-xl font-bold">
                                                    ترابيزة {table.table_number}
                                                </h2>

                                                <span
                                                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                                        table.is_active
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-red-100 text-red-700"
                                                    }`}
                                                >
                                                    {table.is_active
                                                        ? "نشطة"
                                                        : "متوقفة"}
                                                </span>

                                            </div>

                                            {table.name && (
                                                <p className="text-sm opacity-60 mt-1">
                                                    {table.name}
                                                </p>
                                            )}

                                        </div>

                                        <div className="text-3xl">
                                            🪑
                                        </div>

                                    </div>

                                    <p className="text-sm opacity-60 mt-3">
                                        السعة: {table.capacity} أفراد
                                    </p>

                                </div>

                                {/* QR */}

                                <div className="p-5 flex flex-col items-center">

                                    <div className="bg-white p-4 rounded-2xl border">

                                        {tableUrl ? (
                                            <QRCode
                                                data-table-qr={table.id}
                                                value={tableUrl}
                                                size={170}
                                                level="H"
                                            />
                                        ) : (
                                            <div className="w-[170px] h-[170px] flex items-center justify-center text-center text-sm text-red-500">
                                                تعذر إنشاء رابط QR
                                            </div>
                                        )}

                                    </div>

                                    <p className="text-xs opacity-50 mt-3 text-center break-all">
                                        {tableUrl || "رابط المطعم غير متاح"}
                                    </p>

                                </div>

                                {/* Actions */}

                                <div className="p-4 border-t grid grid-cols-2 gap-2">

                                    <button
                                        type="button"
                                        onClick={() => setSelectedTable(table)}
                                        className="px-3 py-2.5 rounded-xl border font-medium hover:bg-(--color-background) transition"
                                    >
                                        👁️ عرض
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => printQRCode(table)}
                                        className="px-3 py-2.5 rounded-xl border font-medium hover:bg-(--color-background) transition"
                                    >
                                        🖨️ طباعة
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => openEditForm(table)}
                                        className="px-3 py-2.5 rounded-xl border font-medium hover:bg-(--color-background) transition"
                                    >
                                        ✏️ تعديل
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => toggleActive(table)}
                                        className={`px-3 py-2.5 rounded-xl border font-medium transition ${
                                            table.is_active
                                                ? "text-orange-600 hover:bg-orange-50"
                                                : "text-green-600 hover:bg-green-50"
                                        }`}
                                    >
                                        {table.is_active
                                            ? "⏸️ إيقاف"
                                            : "▶️ تفعيل"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            copyTableUrl(
                                                table.table_number
                                            )
                                        }
                                        className="px-3 py-2.5 rounded-xl border font-medium hover:bg-(--color-background) transition"
                                    >
                                        🔗 نسخ الرابط
                                    </button>

                                    <button
                                        type="button"
                                        disabled={
                                            deletingId === table.id
                                        }
                                        onClick={() =>
                                            handleDelete(table)
                                        }
                                        className="px-3 py-2.5 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 transition disabled:opacity-50"
                                    >
                                        {deletingId === table.id
                                            ? "جاري الحذف..."
                                            : "🗑️ حذف"}
                                    </button>

                                </div>

                            </div>
                        )
                    })}

                </div>
            )}

            {/* Add / Edit Modal */}

            {showForm && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

                    <div className="w-full max-w-lg bg-(--color-card) rounded-2xl shadow-2xl">

                        <div className="p-5 border-b flex items-center justify-between">

                            <div>

                                <h2 className="text-xl font-bold">
                                    {editingTable
                                        ? "تعديل الترابيزة"
                                        : "إضافة ترابيزة"}
                                </h2>

                                <p className="text-sm opacity-60 mt-1">
                                    أدخل بيانات الترابيزة
                                </p>

                            </div>

                            <button
                                type="button"
                                onClick={closeForm}
                                className="w-10 h-10 rounded-xl hover:bg-(--color-background) transition"
                            >
                                ✕
                            </button>

                        </div>

                        <form
                            onSubmit={handleSave}
                            className="p-5 space-y-5"
                        >

                            <div>

                                <label className="block text-sm font-medium mb-2">
                                    رقم الترابيزة
                                </label>

                                <input
                                    type="number"
                                    min="1"
                                    value={form.table_number}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            table_number:
                                                e.target.value,
                                        })
                                    }
                                    className="w-full px-4 py-3 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-(--color-primary)"
                                    placeholder="مثال: 1"
                                    required
                                />

                            </div>

                            <div>

                                <label className="block text-sm font-medium mb-2">
                                    اسم الترابيزة
                                    <span className="opacity-50">
                                        {" "}
                                        (اختياري)
                                    </span>
                                </label>

                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            name: e.target.value,
                                        })
                                    }
                                    className="w-full px-4 py-3 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-(--color-primary)"
                                    placeholder="مثال: الترابيزة الكبيرة"
                                />

                            </div>

                            <div>

                                <label className="block text-sm font-medium mb-2">
                                    عدد المقاعد
                                </label>

                                <input
                                    type="number"
                                    min="1"
                                    value={form.capacity}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            capacity:
                                                e.target.value,
                                        })
                                    }
                                    className="w-full px-4 py-3 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-(--color-primary)"
                                    required
                                />

                            </div>

                            <label className="flex items-center justify-between gap-4 p-4 rounded-xl border cursor-pointer">

                                <div>

                                    <p className="font-medium">
                                        الترابيزة نشطة
                                    </p>

                                    <p className="text-sm opacity-60 mt-1">
                                        السماح باستخدام QR الخاص بها
                                    </p>

                                </div>

                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            is_active:
                                                e.target.checked,
                                        })
                                    }
                                    className="w-5 h-5"
                                />

                            </label>

                            <div className="flex gap-3 pt-2">

                                <button
                                    type="button"
                                    onClick={closeForm}
                                    disabled={saving}
                                    className="flex-1 px-4 py-3 rounded-xl border font-medium hover:bg-(--color-background) transition disabled:opacity-50"
                                >
                                    إلغاء
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-3 rounded-xl bg-(--color-primary) text-white font-bold hover:opacity-90 transition disabled:opacity-50"
                                >
                                    {saving
                                        ? "جاري الحفظ..."
                                        : editingTable
                                            ? "حفظ التعديلات"
                                            : "إضافة الترابيزة"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

            {/* QR Preview Modal */}

            {selectedTable && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

                    <div className="w-full max-w-md bg-(--color-card) rounded-2xl shadow-2xl overflow-hidden">

                        <div className="p-5 border-b flex items-center justify-between">

                            <div>

                                <h2 className="text-xl font-bold">
                                    QR ترابيزة{" "}
                                    {selectedTable.table_number}
                                </h2>

                                <p className="text-sm opacity-60 mt-1">
                                    امسح الكود لفتح المنيو
                                </p>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedTable(null)
                                }
                                className="w-10 h-10 rounded-xl hover:bg-(--color-background) transition"
                            >
                                ✕
                            </button>

                        </div>

                        <div className="p-6 flex flex-col items-center">

                            <div className="bg-white p-5 rounded-2xl border">

                                {getTableUrl(
                                    selectedTable.table_number
                                ) ? (
                                    <QRCode
                                        value={getTableUrl(
                                            selectedTable.table_number
                                        )}
                                        size={260}
                                        level="H"
                                    />
                                ) : (
                                    <div className="w-[260px] h-[260px] flex items-center justify-center text-center text-red-500">
                                        رابط المطعم غير متاح
                                    </div>
                                )}

                            </div>

                            <div className="mt-5 text-center">

                                <p className="font-bold text-lg">
                                    ترابيزة رقم{" "}
                                    {selectedTable.table_number}
                                </p>

                                {selectedTable.name && (
                                    <p className="text-sm opacity-60 mt-1">
                                        {selectedTable.name}
                                    </p>
                                )}

                                <p className="text-sm opacity-60 mt-3">
                                    السعة:{" "}
                                    {selectedTable.capacity} أفراد
                                </p>

                            </div>

                            <div className="w-full mt-5">

                                <div className="bg-(--color-background) rounded-xl p-3">

                                    <p className="text-xs opacity-60 mb-1">
                                        رابط الترابيزة
                                    </p>

                                    <p className="text-sm break-all">
                                        {getTableUrl(
                                            selectedTable.table_number
                                        ) || "رابط غير متاح"}
                                    </p>

                                </div>

                            </div>

                        </div>

                        <div className="p-4 border-t grid grid-cols-2 gap-3">

                            <button
                                type="button"
                                onClick={() =>
                                    copyTableUrl(
                                        selectedTable.table_number
                                    )
                                }
                                className="px-4 py-3 rounded-xl border font-medium hover:bg-(--color-background) transition"
                            >
                                🔗 نسخ الرابط
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    printQRCode(selectedTable)
                                }}
                                className="px-4 py-3 rounded-xl bg-(--color-primary) text-white font-bold hover:opacity-90 transition"
                            >
                                🖨️ طباعة QR
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    )
}

export default AdminTables