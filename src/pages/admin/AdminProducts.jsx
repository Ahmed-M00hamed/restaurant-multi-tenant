import { useEffect, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { supabase } from "../../lib/supabase"

export default function AdminProducts() {
    const context = useOutletContext() || {}
    const authData = context.authData
    const restaurantId = authData?.restaurant_id

    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])

    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [price, setPrice] = useState("")
    const [category, setCategory] = useState("")

    // الصورة
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState("")

    const [loading, setLoading] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const [togglingId, setTogglingId] = useState(null)

    // المنتج الذي يتم تعديله حاليًا
    const [editingProduct, setEditingProduct] = useState(null)

    // =========================
    // Fetch Products
    // =========================

    const fetchProducts = async () => {
        if (!restaurantId) {
            setProducts([])
            return
        }

        const { data, error } = await supabase
            .from("products")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .order("created_at", { ascending: false })

        if (error) {
            console.error(
                "Error fetching products:",
                error
            )
            return
        }

        setProducts(data || [])
    }

    // =========================
    // Fetch Categories + Products
    // =========================

    useEffect(() => {
        let cancelled = false

        const loadData = async () => {
            if (!restaurantId) {
                if (!cancelled) {
                    setCategories([])
                    setProducts([])
                }

                return
            }

            const [
                { data: categoriesData, error: catError },
                { data: productsData, error: productsError },
            ] = await Promise.all([
                supabase
                    .from("categories")
                    .select("id, name")
                    .eq("restaurant_id", restaurantId)
                    .order("created_at", {
                        ascending: true,
                    }),

                supabase
                    .from("products")
                    .select("*")
                    .eq("restaurant_id", restaurantId)
                    .order("created_at", {
                        ascending: false,
                    }),
            ])

            if (cancelled) return

            if (catError) {
                console.error(
                    "Error fetching categories:",
                    catError
                )

                setCategories([])
            } else {
                setCategories(categoriesData || [])
            }

            if (productsError) {
                console.error(
                    "Error fetching products:",
                    productsError
                )

                setProducts([])
            } else {
                setProducts(productsData || [])
            }
        }

        loadData()

        return () => {
            cancelled = true
        }
    }, [restaurantId])

    // =========================
    // Cleanup Preview URL
    // =========================

    useEffect(() => {
        return () => {
            if (
                imagePreview &&
                imagePreview.startsWith("blob:")
            ) {
                URL.revokeObjectURL(imagePreview)
            }
        }
    }, [imagePreview])

    // =========================
    // اختيار صورة من الجهاز
    // =========================

    const handleImageChange = (e) => {
        const file = e.target.files?.[0]

        if (!file) return

        // التأكد أن الملف صورة
        if (!file.type.startsWith("image/")) {
            alert("من فضلك اختر ملف صورة فقط")
            e.target.value = ""
            return
        }

        // الحد الأقصى 5MB
        if (file.size > 5 * 1024 * 1024) {
            alert("حجم الصورة يجب ألا يتجاوز 5MB")
            e.target.value = ""
            return
        }

        setImageFile(file)

        // Preview
        const previewUrl = URL.createObjectURL(file)
        setImagePreview(previewUrl)

        // السماح باختيار نفس الصورة مرة أخرى
        e.target.value = ""
    }

    // =========================
    // فتح اختيار الصورة
    // =========================

    const openImagePicker = () => {
        document
            .getElementById("image-input")
            ?.click()
    }

    // =========================
    // رفع الصورة إلى Supabase Storage
    // =========================

    const uploadProductImage = async (file) => {
        if (!file || !restaurantId) {
            return null
        }

        const fileExt =
            file.name.split(".").pop()?.toLowerCase() ||
            "jpg"

        const fileName = `${crypto.randomUUID()}.${fileExt}`

        // كل مطعم له folder خاص به
        const filePath = `${restaurantId}/${fileName}`

        const { error: uploadError } =
            await supabase.storage
                .from("product-images")
                .upload(filePath, file, {
                    cacheControl: "3600",
                    upsert: false,
                })

        if (uploadError) {
            throw uploadError
        }

        const { data } = supabase.storage
            .from("product-images")
            .getPublicUrl(filePath)

        return data.publicUrl
    }

    // =========================
    // تنظيف الفورم
    // =========================

    const resetForm = () => {
        setName("")
        setDescription("")
        setPrice("")
        setCategory("")

        setImageFile(null)
        setImagePreview("")

        setEditingProduct(null)
    }

    // =========================
    // بدء تعديل منتج
    // =========================

    const handleEditProduct = (product) => {
        setEditingProduct(product)

        setName(product.name || "")
        setDescription(product.description || "")
        setPrice(product.price ?? "")
        setCategory(product.category || "")

        setImageFile(null)
        setImagePreview(product.image_url || "")

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        })
    }

    // =========================
    // إضافة / تعديل المنتج
    // =========================

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!restaurantId) {
            alert(
                "لا توجد صلاحية لإدارة المنتجات لعدم تحديد المطعم"
            )
            return
        }

        if (!category) {
            alert("يرجى اختيار القسم المخصص للمنتج")
            return
        }

        if (!name.trim()) {
            alert("يرجى كتابة اسم المنتج")
            return
        }

        if (price === "" || Number(price) < 0) {
            alert("يرجى إدخال سعر صحيح")
            return
        }

        setLoading(true)

        try {
            // لو في صورة جديدة نرفعها
            // لو مفيش صورة جديدة أثناء التعديل نحافظ على الصورة القديمة
            let uploadedImageUrl =
                editingProduct?.image_url || null

            if (imageFile) {
                uploadedImageUrl =
                    await uploadProductImage(imageFile)
            }

            const productData = {
                name: name.trim(),
                description:
                    description.trim() || null,
                price: parseFloat(price),
                image_url: uploadedImageUrl,
                category,
            }

            let error = null

            if (editingProduct) {
                // تعديل المنتج
                const result = await supabase
                    .from("products")
                    .update(productData)
                    .eq("id", editingProduct.id)
                    .eq(
                        "restaurant_id",
                        restaurantId
                    )

                error = result.error
            } else {
                // إضافة منتج جديد
                const result = await supabase
                    .from("products")
                    .insert([
                        {
                            ...productData,
                            restaurant_id:
                                restaurantId,
                            is_available: true,
                        },
                    ])

                error = result.error
            }

            if (error) {
                throw error
            }

            alert(
                editingProduct
                    ? "تم تعديل المنتج بنجاح ✅"
                    : "تم إضافة المنتج بنجاح ✅"
            )

            resetForm()

            await fetchProducts()
        } catch (error) {
            console.error(
                "Product save error:",
                error
            )

            alert(
                `حدث خطأ أثناء ${editingProduct
                    ? "تعديل"
                    : "إضافة"
                } المنتج:\n${error?.message ||
                "حدث خطأ غير معروف"
                }`
            )
        } finally {
            setLoading(false)
        }
    }

    // =========================
    // حذف المنتج
    // =========================

    const handleDeleteProduct = async (id) => {
        if (
            !window.confirm(
                "هل أنت متأكد من رغبتك في حذف هذا المنتج؟"
            )
        ) {
            return
        }

        setDeletingId(id)

        const { error } = await supabase
            .from("products")
            .delete()
            .eq("id", id)
            .eq("restaurant_id", restaurantId)

        setDeletingId(null)

        if (error) {
            alert(
                "حدث خطأ أثناء الحذف: " +
                error.message
            )

            return
        }

        setProducts((prev) =>
            prev.filter((p) => p.id !== id)
        )

        // لو المنتج المحذوف هو المنتج الذي يتم تعديله
        if (editingProduct?.id === id) {
            resetForm()
        }
    }

    // =========================
    // إخفاء / إظهار المنتج
    // =========================

    const handleToggleAvailable = async (
        product
    ) => {
        setTogglingId(product.id)

        const newAvailability =
            !(
                product.is_available !== false
            )

        const { error } = await supabase
            .from("products")
            .update({
                is_available:
                    newAvailability,
            })
            .eq("id", product.id)
            .eq(
                "restaurant_id",
                restaurantId
            )

        setTogglingId(null)

        if (error) {
            alert(
                "حدث خطأ أثناء تحديث حالة المنتج: " +
                error.message
            )

            return
        }

        setProducts((prev) =>
            prev.map((p) =>
                p.id === product.id
                    ? {
                        ...p,
                        is_available:
                            newAvailability,
                    }
                    : p
            )
        )
    }

    const isEditing = Boolean(
        editingProduct
    )

    return (
        <div
            className="p-4 md:p-6 max-w-5xl mx-auto"
            dir="rtl"
        >
            {/* Header */}

            <div className="mb-6">
                <h2 className="text-2xl font-bold">
                    إدارة المنتجات
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                    أضف منتجات المطعم أو عدّل
                    بيانات المنتجات الموجودة
                </p>
            </div>

            {/* No Categories Warning */}

            {categories.length === 0 && (
                <div className="mb-6 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                    لسه معملتش أي قسم. روح
                    لصفحة "الأقسام" وضيف قسم
                    الأول عشان تقدر تضيف
                    منتجات.
                </div>
            )}

            {/* Product Form */}

            <form
                onSubmit={handleSubmit}
                className={`bg-(--color-card) p-4 md:p-5 rounded-2xl border mb-8 shadow-sm ${isEditing
                        ? "border-(--color-primary)"
                        : ""
                    }`}
            >
                {/* Form Header */}

                <div className="flex items-center justify-between gap-3 mb-5">
                    <div>
                        <h3 className="text-lg font-bold">
                            {isEditing
                                ? "تعديل المنتج ✏️"
                                : "إضافة منتج جديد ➕"}
                        </h3>

                        {isEditing && (
                            <p className="text-sm text-gray-500 mt-1">
                                أنت تقوم بتعديل:{" "}
                                {
                                    editingProduct.name
                                }
                            </p>
                        )}
                    </div>

                    {isEditing && (
                        <button
                            type="button"
                            onClick={
                                resetForm
                            }
                            className="text-sm px-4 py-2 rounded-lg border hover:bg-(--color-background) transition"
                        >
                            إلغاء التعديل
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Product Name */}

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            اسم المنتج 
                        </label>

                        <input
                            type="text"
                            placeholder="اسم المنتج"
                            value={name}
                            onChange={(e) =>
                                setName(
                                    e.target
                                        .value
                                )
                            }
                            className="w-full border p-2.5 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-(--color-primary)"
                            required
                        />
                    </div>

                    {/* Price */}

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            السعر (ج.م) 
                        </label>

                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="السعر"
                            value={price}
                            onChange={(e) =>
                                setPrice(
                                    e.target
                                        .value
                                )
                            }
                            className="w-full border p-2.5 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-(--color-primary)"
                            required
                        />
                    </div>

                    {/* Category */}

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            القسم 
                        </label>

                        <select
                            value={category}
                            onChange={(e) =>
                                setCategory(
                                    e.target
                                        .value
                                )
                            }
                            className="w-full  border  border-white p-3 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-(--color-primary)"
                            required
                        >
                            <option
                                value=""
                                disabled
                                className="text-black"
                            >
                                اختر القسم...
                            </option>

                            {categories.map(
                                (cat) => (
                                    <option
                                        className="text-black"
                                        key={ cat.id }
                                        value={ cat.name }
                                    >
                                        {cat.name}
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    {/* Image */}

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            صورة المنتج
                        </label>

                        <button
                            type="button"
                            onClick={
                                openImagePicker
                            }
                            className="w-full bg-(--color-primary) text-white font-medium px-6 py-2.5 rounded-lg transition hover:opacity-90 cursor-pointer"
                        >
                            📷 اختيار الصورة
                        </button>

                        <input
                            id="image-input"
                            type="file"
                            accept="image/*"
                            onChange={
                                handleImageChange
                            }
                            className="hidden"
                        />

                        <p className="text-xs text-gray-500 mt-1">
                            JPG / PNG / WEBP —
                            الحد الأقصى 5MB
                        </p>
                    </div>

                    {/* Image Preview */}

                    {imagePreview && (
                        <div className="sm:col-span-2 lg:col-span-4">
                            <div className="flex items-center gap-4 p-3 rounded-xl border bg-(--color-background)">
                                <img
                                    src={
                                        imagePreview
                                    }
                                    alt="معاينة المنتج"
                                    className="w-24 h-24 rounded-xl object-cover border bg-gray-100"
                                />

                                <div>
                                    <p className="font-medium">
                                        معاينة
                                        الصورة
                                    </p>

                                    {imageFile && (
                                        <p className="text-sm text-gray-500 mt-1">
                                            {
                                                imageFile.name
                                            }
                                        </p>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImageFile(
                                                null
                                            )

                                            setImagePreview(
                                                editingProduct?.image_url ||
                                                ""
                                            )
                                        }}
                                        className="text-sm text-red-500 hover:text-red-700 mt-2"
                                    >
                                        إزالة الصورة
                                        الجديدة
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Description */}

                    <div className="sm:col-span-2 lg:col-span-4">
                        <label className="block text-sm font-medium mb-1">
                            وصف المنتج
                            (اختياري)
                        </label>

                        <input
                            type="text"
                            placeholder="مكونات، حجم، ملاحظات..."
                            value={
                                description
                            }
                            onChange={(e) =>
                                setDescription(
                                    e.target
                                        .value
                                )
                            }
                            className="w-full border p-2.5 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-(--color-primary)"
                        />
                    </div>
                </div>

                {/* Form Buttons */}

                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-(--color-primary) text-white font-medium px-6 py-2.5 rounded-lg transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    >
                        {loading
                            ? isEditing
                                ? "جاري حفظ التعديل..."
                                : "جاري الإضافة..."
                            : isEditing
                                ? "حفظ التعديل 💾"
                                : "إضافة منتج ➕"}
                    </button>

                    {isEditing && (
                        <button
                            type="button"
                            onClick={
                                resetForm
                            }
                            disabled={loading}
                            className="px-6 py-2.5 rounded-lg border font-medium hover:bg-(--color-background) transition disabled:opacity-50 cursor-pointer"
                        >
                            إلغاء
                        </button>
                    )}
                </div>
            </form>

            {/* Products List */}

            <div className="bg-(--color-card) rounded-2xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-lg">
                            قائمة المنتجات
                        </h3>

                        <p className="text-sm text-gray-500 mt-1">
                            {products.length}{" "}
                            منتج
                        </p>
                    </div>
                </div>

                {products.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        لا توجد منتجات مضافة
                        حتى الآن.
                    </div>
                ) : (
                    <ul className="divide-y">
                        {products.map((p) => {
                            const isAvailable =
                                p.is_available !==
                                false

                            const isCurrentlyEditing =
                                editingProduct?.id ===
                                p.id

                            return (
                                <li
                                    key={
                                        p.id
                                    }
                                    className={`p-4 transition ${isCurrentlyEditing
                                            ? "bg-(--color-background)"
                                            : ""
                                        }`}
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                        {/* Product Info */}

                                        <div className="flex items-center gap-3 min-w-0">
                                            {p.image_url ? (
                                                <img
                                                    src={
                                                        p.image_url
                                                    }
                                                    alt={
                                                        p.name
                                                    }
                                                    className="w-14 h-14 rounded-xl object-cover bg-gray-100 shrink-0"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-xl shrink-0">
                                                    🍔
                                                </div>
                                            )}

                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-base truncate">
                                                    {
                                                        p.name
                                                    }
                                                </h3>

                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    {p.category && (
                                                        <span className="inline-block text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                            {
                                                                p.category
                                                            }
                                                        </span>
                                                    )}

                                                    {isAvailable ? (
                                                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                            متاح
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                            غير متاح
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Price + Actions */}

                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-lg text-emerald-600 ml-2">
                                                {
                                                    p.price
                                                }{" "}
                                                ج.م
                                            </span>

                                            {/* Edit */}

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleEditProduct(
                                                        p
                                                    )
                                                }
                                                disabled={
                                                    loading
                                                }
                                                className=" cursor-pointer text-sm font-medium px-3 py-2 rounded-lg border border-(--color-primary) text-(--color-primary) hover:bg-(--color-primary) hover:text-white transition disabled:opacity-50"
                                            >
                                                ✏️ تعديل
                                            </button>

                                            {/* Availability */}

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleToggleAvailable(
                                                        p
                                                    )
                                                }
                                                disabled={
                                                    togglingId ===
                                                    p.id
                                                }
                                                className="cursor-pointer text-sm font-medium px-3 py-2 rounded-lg border hover:bg-(--color-background) transition disabled:opacity-50"
                                            >
                                                {togglingId ===
                                                    p.id
                                                    ? "جاري..."
                                                    : isAvailable
                                                        ? "إخفاء"
                                                        : "إظهار"}
                                            </button>

                                            {/* Delete */}

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDeleteProduct(
                                                        p.id
                                                    )
                                                }
                                                disabled={
                                                    deletingId ===
                                                    p.id
                                                }
                                                className="text-red-500 hover:text-red-500 px-3 py-2 rounded-lg hover:bg-red-50 transition disabled:opacity-50 text-sm font-medium cursor-pointer"
                                            >
                                                {deletingId ===
                                                    p.id
                                                    ? "جاري الحذف..."
                                                    : "حذف"}
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        </div>
    )
}