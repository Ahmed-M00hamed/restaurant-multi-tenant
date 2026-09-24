import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const CREATE_ADMIN_FUNCTION_URL =
    'https://fsadggnaxuycqzamyejl.supabase.co/functions/v1/create-admin'

const DELETE_ADMIN_FUNCTION_URL =
    'https://fsadggnaxuycqzamyejl.supabase.co/functions/v1/delete-admin'

export default function SuperAdminDashboard() {
    const navigate = useNavigate()

    // =========================
    // Data
    // =========================

    const [restaurants, setRestaurants] = useState([])
    const [admins, setAdmins] = useState([])

    // =========================
    // Loading
    // =========================

    const [loading, setLoading] = useState(true)
    const [addingRestaurant, setAddingRestaurant] = useState(false)
    const [addingAdmin, setAddingAdmin] = useState(false)
    const [deletingAdmin, setDeletingAdmin] = useState(null)
    const [deletingRestaurant, setDeletingRestaurant] = useState(null)
    const [deletingOrdersId, setDeletingOrdersId] = useState(null)
    const [loggingOut, setLoggingOut] = useState(false)

    // =========================
    // Copy menu link
    // =========================

    const [copiedRestaurantId, setCopiedRestaurantId] =
        useState(null)

    // =========================
    // Messages
    // =========================

    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // =========================
    // Restaurant form
    // =========================

    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [phone, setPhone] = useState('')

    // =========================
    // Admin form
    // =========================

    const [adminEmail, setAdminEmail] = useState('')
    const [adminPassword, setAdminPassword] = useState('')
    const [adminRestaurantId, setAdminRestaurantId] = useState('')

    // =========================
    // Load restaurants
    // =========================

    const loadRestaurants = async () => {
        const { data, error } = await supabase
            .from('restaurants')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error(
                'LOAD RESTAURANTS ERROR:',
                error
            )

            setError(
                'حدث خطأ أثناء تحميل المطاعم.'
            )

            return
        }

        setRestaurants(data || [])

        if (
            !adminRestaurantId &&
            data?.length > 0
        ) {
            setAdminRestaurantId(data[0].id)
        }
    }

    // =========================
    // Load admins
    // =========================

    const loadAdmins = async () => {
        const { data, error } = await supabase.rpc(
            'get_all_admin_users'
        )

        if (error) {
            console.error(
                'LOAD ADMINS ERROR:',
                error
            )

            setError(
                'تعذر تحميل الأدمنز. تأكد من وجود get_all_admin_users.'
            )

            return
        }

        setAdmins(data || [])
    }

    // =========================
    // Load all
    // =========================

    const loadData = async () => {
        setLoading(true)
        setError('')

        await Promise.all([
            loadRestaurants(),
            loadAdmins(),
        ])

        setLoading(false)
    }

    useEffect(() => {
        loadData()
    }, [])

    // =========================
    // Add restaurant
    // =========================

    const handleAddRestaurant = async (e) => {
        e.preventDefault()

        setError('')
        setSuccess('')

        const cleanName = name.trim()

        const cleanSlug = slug
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')

        const cleanPhone = phone.trim()

        if (!cleanName) {
            setError(
                'من فضلك اكتب اسم المطعم.'
            )

            return
        }

        if (!cleanSlug) {
            setError(
                'من فضلك اكتب رابط صالح بالإنجليزي، مثل: my-restaurant'
            )

            return
        }

        setAddingRestaurant(true)

        try {
            const {
                data: restaurant,
                error: restaurantError,
            } = await supabase
                .from('restaurants')
                .insert([
                    {
                        name: cleanName,
                        slug: cleanSlug,
                        phone: cleanPhone,
                        is_active: true,
                    },
                ])
                .select()
                .single()

            if (restaurantError) {
                throw restaurantError
            }

            const { error: settingsError } =
                await supabase
                    .from('restaurant_settings')
                    .insert({
                        restaurant_id:
                            restaurant.id,
                        restaurant_name:
                            cleanName,
                        is_open: true,
                        delivery_enabled: true,
                        pickup_enabled: true,
                        dine_in_enabled: true,
                        cash_payment_enabled: true,
                        online_payment_enabled: false,
                        primary_color:
                            '#000000',
                        background_color:
                            '#f8f8f8',
                        card_color:
                            '#ffffff',
                    })

            if (settingsError) {
                console.error(
                    'RESTAURANT SETTINGS ERROR:',
                    settingsError
                )

                setSuccess(
                    `تم إنشاء المطعم "${cleanName}" لكن حدث خطأ أثناء إنشاء إعداداته.`
                )
            } else {
                setSuccess(
                    `تم إنشاء المطعم "${cleanName}" بنجاح.`
                )
            }

            setName('')
            setSlug('')
            setPhone('')

            await loadRestaurants()
        } catch (err) {
            console.error(
                'ADD RESTAURANT ERROR:',
                err
            )

            setError(
                err?.message ||
                'حدث خطأ أثناء إنشاء المطعم.'
            )
        } finally {
            setAddingRestaurant(false)
        }
    }

    // =========================
    // Add admin
    // =========================

    const handleAddAdmin = async (e) => {
        e.preventDefault()

        setError('')
        setSuccess('')

        const email = adminEmail
            .trim()
            .toLowerCase()

        const password = adminPassword.trim()

        if (!email) {
            setError(
                'من فضلك اكتب إيميل الأدمن.'
            )

            return
        }

        if (
            !password ||
            password.length < 6
        ) {
            setError(
                'كلمة المرور يجب أن تكون 6 أحرف على الأقل.'
            )

            return
        }

        if (!adminRestaurantId) {
            setError(
                'من فضلك اختر المطعم الذي سيتبعه الأدمن.'
            )

            return
        }

        setAddingAdmin(true)

        try {
            const {
                data: { session },
            } =
                await supabase.auth.getSession()

            if (!session?.access_token) {
                throw new Error(
                    'انتهت جلسة تسجيل الدخول. سجل الدخول مرة أخرى.'
                )
            }

            const response = await fetch(
                CREATE_ADMIN_FUNCTION_URL,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json',
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        email,
                        password,
                        restaurant_id:
                            adminRestaurantId,
                    }),
                }
            )

            const result =
                await response.json()

            if (!response.ok) {
                throw new Error(
                    result?.error ||
                    result?.message ||
                    'حدث خطأ أثناء إنشاء الأدمن.'
                )
            }

            setSuccess(
                `تم إنشاء حساب الأدمن ${email} وربطه بالمطعم بنجاح.`
            )

            setAdminEmail('')
            setAdminPassword('')

            await loadAdmins()
        } catch (err) {
            console.error(
                'ADD ADMIN ERROR:',
                err
            )

            setError(
                err?.message ||
                'حدث خطأ أثناء إنشاء حساب الأدمن.'
            )
        } finally {
            setAddingAdmin(false)
        }
    }

    // =========================
    // Delete admin
    // =========================

    const handleDeleteAdmin = async (
        admin
    ) => {
        const confirmed =
            window.confirm(
                `هل أنت متأكد من حذف حساب الأدمن:\n\n${admin.email}\n\nسيتم حذف حساب تسجيل الدخول نهائيًا.`
            )

        if (!confirmed) return

        setError('')
        setSuccess('')
        setDeletingAdmin(admin.user_id)

        try {
            const {
                data: { session },
            } =
                await supabase.auth.getSession()

            if (!session?.access_token) {
                throw new Error(
                    'انتهت جلسة تسجيل الدخول.'
                )
            }

            const response = await fetch(
                DELETE_ADMIN_FUNCTION_URL,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json',
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        user_id:
                            admin.user_id,
                    }),
                }
            )

            const result =
                await response.json()

            if (!response.ok) {
                throw new Error(
                    result?.error ||
                    result?.message ||
                    'حدث خطأ أثناء حذف الأدمن.'
                )
            }

            setSuccess(
                `تم حذف حساب ${admin.email} بنجاح.`
            )

            await loadAdmins()
        } catch (err) {
            console.error(
                'DELETE ADMIN ERROR:',
                err
            )

            setError(
                err?.message ||
                'حدث خطأ أثناء حذف الأدمن.'
            )
        } finally {
            setDeletingAdmin(null)
        }
    }

    // =========================
    // Delete restaurant
    // =========================

    const handleDeleteRestaurant =
        async (restaurant) => {
            const confirmed =
                window.confirm(
                    `⚠️ تحذير\n\nهل أنت متأكد من حذف المطعم "${restaurant.name}"؟\n\nسيتم حذف جميع البيانات المرتبطة به، مثل المنتجات والطلبات والطاولات ومناطق التوصيل والإعدادات.\n\nهذا الإجراء لا يمكن التراجع عنه.`
                )

            if (!confirmed) return

            const secondConfirm =
                window.confirm(
                    `تأكيد نهائي:\n\nاكتب في ذهنك أن "${restaurant.name}" سيتم حذفه بالكامل.\n\nهل تريد المتابعة؟`
                )

            if (!secondConfirm) return

            setError('')
            setSuccess('')
            setDeletingRestaurant(
                restaurant.id
            )

            try {
                const {
                    data,
                    error,
                } = await supabase.rpc(
                    'delete_restaurant',
                    {
                        p_restaurant_id:
                            restaurant.id,
                    }
                )

                if (error) {
                    throw error
                }

                if (!data?.success) {
                    throw new Error(
                        'لم يتم حذف المطعم.'
                    )
                }

                setSuccess(
                    `تم حذف المطعم "${restaurant.name}" وجميع بياناته المرتبطة.`
                )

                await Promise.all([
                    loadRestaurants(),
                    loadAdmins(),
                ])

                if (
                    adminRestaurantId ===
                    restaurant.id
                ) {
                    setAdminRestaurantId('')
                }
            } catch (err) {
                console.error(
                    'DELETE RESTAURANT ERROR:',
                    err
                )

                setError(
                    err?.message ||
                    'حدث خطأ أثناء حذف المطعم.'
                )
            } finally {
                setDeletingRestaurant(null)
            }
        }

    // =========================
    // Delete ALL orders of a restaurant (keep menu/settings)
    // =========================

    const handleDeleteAllOrders =
        async (restaurant) => {
            const confirmed =
                window.confirm(
                    `⚠️ تحذير\n\nهل أنت متأكد من مسح جميع طلبات مطعم "${restaurant.name}"؟\n\nهيتم حذف كل الطلبات نهائيًا، لكن المنيو والمنتجات والإعدادات هتفضل زي ما هي من غير أي تغيير.\n\nهذا الإجراء لا يمكن التراجع عنه.`
                )

            if (!confirmed) return

            setError('')
            setSuccess('')
            setDeletingOrdersId(restaurant.id)

            try {
                const { data, error } =
                    await supabase.rpc(
                        'delete_restaurant_orders',
                        {
                            p_restaurant_id:
                                restaurant.id,
                        }
                    )

                if (error) {
                    throw error
                }

                setSuccess(
                    `تم مسح جميع طلبات مطعم "${restaurant.name}" (${data?.deleted_count ?? 0} طلب).`
                )
            } catch (err) {
                console.error(
                    'DELETE RESTAURANT ORDERS ERROR:',
                    err
                )

                setError(
                    err?.message ||
                    'حدث خطأ أثناء مسح طلبات المطعم.'
                )
            } finally {
                setDeletingOrdersId(null)
            }
        }

    // =========================
    // Toggle restaurant
    // =========================

    const toggleActive = async (
        id,
        currentStatus
    ) => {
        setError('')
        setSuccess('')

        const { error } =
            await supabase
                .from('restaurants')
                .update({
                    is_active:
                        !currentStatus,
                })
                .eq('id', id)

        if (error) {
            console.error(
                'TOGGLE RESTAURANT ERROR:',
                error
            )

            setError(
                'حدث خطأ أثناء تغيير حالة المطعم.'
            )

            return
        }

        setSuccess(
            currentStatus
                ? 'تم إيقاف المطعم.'
                : 'تم تفعيل المطعم.'
        )

        await loadRestaurants()
    }

    // =========================
    // Get restaurant menu URL
    // =========================

    const getRestaurantMenuUrl = (
        restaurant
    ) => {
        return new URL(
            `/${restaurant.slug}`,
            window.location.origin
        ).toString()
    }

    // =========================
    // Copy restaurant menu URL
    // =========================

    const handleCopyMenuLink = async (
        restaurant
    ) => {
        const menuUrl =
            getRestaurantMenuUrl(
                restaurant
            )

        try {
            await navigator.clipboard.writeText(
                menuUrl
            )

            setCopiedRestaurantId(
                restaurant.id
            )

            setTimeout(() => {
                setCopiedRestaurantId(null)
            }, 2000)
        } catch (err) {
            console.error(
                'COPY MENU LINK ERROR:',
                err
            )

            setError(
                'تعذر نسخ رابط المنيو. يمكنك نسخه يدويًا.'
            )
        }
    }

    // =========================
    // Logout
    // =========================

    const handleLogout = async () => {
        setLoggingOut(true)

        const { error } =
            await supabase.auth.signOut()

        if (error) {
            console.error(
                'LOGOUT ERROR:',
                error
            )

            setError(
                'حدث خطأ أثناء تسجيل الخروج.'
            )

            setLoggingOut(false)

            return
        }

        navigate('/admin/login', {
            replace: true,
        })
    }

    // =========================
    // Loading
    // =========================

    if (loading) {
        return (
            <div
                className="min-h-screen bg-gray-100 flex items-center justify-center"
                dir="rtl"
            >
                <div className="text-center">

                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />

                    <p className="text-gray-600">
                        جاري تحميل لوحة التحكم...
                    </p>

                </div>
            </div>
        )
    }

    // =========================
    // UI
    // =========================

    return (
        <div
            className="min-h-screen bg-gray-100"
            dir="rtl"
        >

            {/* HEADER */}

            <header className="bg-white border-b shadow-sm">

                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

                    <div>

                        <h1 className="text-2xl font-bold text-gray-900">
                            لوحة تحكم Super Admin
                        </h1>

                        <p className="text-sm text-gray-500 mt-1">
                            إدارة المطاعم وحسابات الأدمن
                        </p>

                    </div>

                    <button
                        type="button"
                        onClick={
                            handleLogout
                        }
                        disabled={
                            loggingOut
                        }
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-semibold transition"
                    >
                        {loggingOut
                            ? 'جاري تسجيل الخروج...'
                            : 'تسجيل الخروج'}
                    </button>

                </div>

            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

                {/* MESSAGES */}

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 bg-green-50 border border-green-200 text-green-700 rounded-lg p-4">
                        {success}
                    </div>
                )}

                {/* STATS */}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">

                    <div className="bg-white rounded-xl border p-5 shadow-sm">

                        <p className="text-sm text-gray-500">
                            إجمالي المطاعم
                        </p>

                        <p className="text-3xl font-bold text-gray-900 mt-2">
                            {
                                restaurants.length
                            }
                        </p>

                    </div>

                    <div className="bg-white rounded-xl border p-5 shadow-sm">

                        <p className="text-sm text-gray-500">
                            المطاعم النشطة
                        </p>

                        <p className="text-3xl font-bold text-green-600 mt-2">
                            {
                                restaurants.filter(
                                    (
                                        restaurant
                                    ) =>
                                        restaurant.is_active
                                ).length
                            }
                        </p>

                    </div>

                    <div className="bg-white rounded-xl border p-5 shadow-sm">

                        <p className="text-sm text-gray-500">
                            إجمالي الأدمن
                        </p>

                        <p className="text-3xl font-bold text-blue-600 mt-2">
                            {
                                admins.length
                            }
                        </p>

                    </div>

                </div>

                {/* ADD ADMIN */}

                <section className="bg-white border rounded-xl shadow-sm p-5 mb-8">

                    <div className="mb-5">

                        <h2 className="text-xl font-bold text-gray-900">
                            إضافة Admin جديد
                        </h2>

                        <p className="text-sm text-gray-500 mt-1">
                            سيتم إنشاء حساب تسجيل الدخول وربطه بالمطعم المختار تلقائيًا.
                        </p>

                    </div>

                    <form
                        onSubmit={
                            handleAddAdmin
                        }
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                    >

                        <input
                            type="email"
                            placeholder="إيميل الأدمن"
                            value={
                                adminEmail
                            }
                            onChange={(e) =>
                                setAdminEmail(
                                    e.target
                                        .value
                                )
                            }
                            className="border border-gray-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />

                        <input
                            type="password"
                            placeholder="كلمة المرور"
                            value={
                                adminPassword
                            }
                            onChange={(e) =>
                                setAdminPassword(
                                    e.target
                                        .value
                                )
                            }
                            className="border border-gray-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            minLength={6}
                        />

                        <select
                            value={
                                adminRestaurantId
                            }
                            onChange={(e) =>
                                setAdminRestaurantId(
                                    e.target
                                        .value
                                )
                            }
                            className="border border-gray-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            required
                        >

                            <option value="">
                                اختر المطعم
                            </option>

                            {restaurants.map(
                                (
                                    restaurant
                                ) => (
                                    <option
                                        key={
                                            restaurant.id
                                        }
                                        value={
                                            restaurant.id
                                        }
                                    >
                                        {
                                            restaurant.name
                                        }
                                    </option>
                                )
                            )}

                        </select>

                        <button
                            type="submit"
                            disabled={
                                addingAdmin ||
                                restaurants.length ===
                                    0
                            }
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-3 rounded-lg font-bold transition"
                        >
                            {addingAdmin
                                ? 'جاري إنشاء الأدمن...'
                                : 'إضافة Admin'}
                        </button>

                    </form>

                </section>

                {/* ADMINS */}

                <section className="bg-white border rounded-xl shadow-sm overflow-hidden mb-8">

                    <div className="p-5 border-b">

                        <h2 className="text-xl font-bold text-gray-900">
                            الأدمن
                        </h2>

                        <p className="text-sm text-gray-500 mt-1">
                            جميع حسابات الأدمن المرتبطة بالمطاعم
                        </p>

                    </div>

                    {admins.length ===
                    0 ? (
                        <div className="p-8 text-center text-gray-500">
                            لا يوجد Admins حتى الآن.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">

                            <table className="w-full text-right">

                                <thead className="bg-gray-50 border-b">

                                    <tr>

                                        <th className="p-4 whitespace-nowrap">
                                            الإيميل
                                        </th>

                                        <th className="p-4 whitespace-nowrap">
                                            المطعم
                                        </th>

                                        <th className="p-4 whitespace-nowrap">
                                            الرابط
                                        </th>

                                        <th className="p-4 whitespace-nowrap">
                                            الحالة
                                        </th>

                                        <th className="p-4 whitespace-nowrap">
                                            الإجراءات
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {admins.map(
                                        (
                                            admin
                                        ) => {

                                            const restaurant =
                                                restaurants.find(
                                                    (
                                                        rest
                                                    ) =>
                                                        rest.id ===
                                                        admin.restaurant_id
                                                )

                                            const isDeleting =
                                                deletingAdmin ===
                                                admin.user_id

                                            return (
                                                <tr
                                                    key={
                                                        admin.user_id
                                                    }
                                                    className="border-b last:border-b-0 hover:bg-gray-50"
                                                >

                                                    <td className="p-4">

                                                        <div className="font-semibold text-gray-900">
                                                            {
                                                                admin.email ||
                                                                'بدون إيميل'
                                                            }
                                                        </div>

                                                        <div className="text-xs text-gray-400 mt-1">
                                                            {
                                                                admin.user_id
                                                            }
                                                        </div>

                                                    </td>

                                                    <td className="p-4 font-semibold">

                                                        {
                                                            admin.restaurant_name ||
                                                            restaurant?.name ||
                                                            'غير مرتبط'
                                                        }

                                                    </td>

                                                    <td className="p-4">

                                                        {admin.restaurant_slug ? (
                                                            <a
                                                                href={`/${admin.restaurant_slug}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-blue-600 hover:underline"
                                                            >
                                                                /
                                                                {
                                                                    admin.restaurant_slug
                                                                }
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-400">
                                                                -
                                                            </span>
                                                        )}

                                                    </td>

                                                    <td className="p-4">

                                                        {restaurant ? (
                                                            <span
                                                                className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                                                                    restaurant.is_active
                                                                        ? 'bg-green-100 text-green-700'
                                                                        : 'bg-red-100 text-red-700'
                                                                }`}
                                                            >
                                                                {
                                                                    restaurant.is_active
                                                                        ? 'نشط'
                                                                        : 'متوقف'
                                                                }
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">
                                                                -
                                                            </span>
                                                        )}

                                                    </td>

                                                    <td className="p-4">

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleDeleteAdmin(
                                                                    admin
                                                                )
                                                            }
                                                            disabled={
                                                                isDeleting
                                                            }
                                                            className="bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 px-3 py-2 rounded-lg text-sm font-semibold"
                                                        >
                                                            {isDeleting
                                                                ? 'جاري الحذف...'
                                                                : 'حذف Admin'}
                                                        </button>

                                                    </td>

                                                </tr>
                                            )
                                        }
                                    )}

                                </tbody>

                            </table>

                        </div>
                    )}

                </section>

                {/* ADD RESTAURANT */}

                <section className="bg-white border rounded-xl shadow-sm p-5 mb-8">

                    <div className="mb-5">

                        <h2 className="text-xl font-bold text-gray-900">
                            إضافة مطعم جديد
                        </h2>

                        <p className="text-sm text-gray-500 mt-1">
                            إنشاء مطعم جديد وتجهيز إعداداته الأساسية.
                        </p>

                    </div>

                    <form
                        onSubmit={
                            handleAddRestaurant
                        }
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                    >

                        <input
                            type="text"
                            placeholder="اسم المطعم"
                            value={name}
                            onChange={(e) =>
                                setName(
                                    e.target
                                        .value
                                )
                            }
                            className="border border-gray-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />

                        <input
                            type="text"
                            placeholder="الرابط مثال: my-restaurant"
                            value={slug}
                            onChange={(e) =>
                                setSlug(
                                    e.target
                                        .value
                                )
                            }
                            className="border border-gray-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />

                        <input
                            type="text"
                            placeholder="رقم الهاتف"
                            value={phone}
                            onChange={(e) =>
                                setPhone(
                                    e.target
                                        .value
                                )
                            }
                            className="border border-gray-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <button
                            type="submit"
                            disabled={
                                addingRestaurant
                            }
                            className="bg-gray-900 hover:bg-black disabled:opacity-50 text-white p-3 rounded-lg font-bold transition"
                        >
                            {addingRestaurant
                                ? 'جاري إنشاء المطعم...'
                                : 'إضافة مطعم'}
                        </button>

                    </form>

                </section>

                {/* RESTAURANTS */}

                <section className="bg-white border rounded-xl shadow-sm overflow-hidden">

                    <div className="p-5 border-b">

                        <h2 className="text-xl font-bold text-gray-900">
                            المطاعم
                        </h2>

                        <p className="text-sm text-gray-500 mt-1">
                            إدارة جميع المطاعم الموجودة على MenuFlow
                        </p>

                    </div>

                    {restaurants.length ===
                    0 ? (
                        <div className="p-8 text-center text-gray-500">
                            لا توجد مطاعم.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">

                            <table className="w-full text-right">

                                <thead className="bg-gray-50 border-b">

                                    <tr>

                                        <th className="p-4">
                                            اسم المطعم
                                        </th>

                                        <th className="p-4">
                                            الرابط
                                        </th>

                                        <th className="p-4">
                                            الهاتف
                                        </th>

                                        <th className="p-4">
                                            الحالة
                                        </th>

                                        <th className="p-4">
                                            الإجراءات
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {restaurants.map(
                                        (
                                            restaurant
                                        ) => {

                                            const isDeleting =
                                                deletingRestaurant ===
                                                restaurant.id

                                            return (
                                                <tr
                                                    key={
                                                        restaurant.id
                                                    }
                                                    className="border-b last:border-b-0 hover:bg-gray-50"
                                                >

                                                    <td className="p-4 font-semibold">
                                                        {
                                                            restaurant.name
                                                        }
                                                    </td>

                                                    <td className="p-4">

                                                        <a
                                                            href={`/${restaurant.slug}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-blue-600 hover:underline"
                                                        >
                                                            /
                                                            {
                                                                restaurant.slug
                                                            }
                                                        </a>

                                                    </td>

                                                    <td className="p-4 text-gray-600">
                                                        {
                                                            restaurant.phone ||
                                                            '-'
                                                        }
                                                    </td>

                                                    <td className="p-4">

                                                        <span
                                                            className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                                                                restaurant.is_active
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-red-100 text-red-700'
                                                            }`}
                                                        >
                                                            {
                                                                restaurant.is_active
                                                                    ? 'نشط'
                                                                    : 'متوقف'
                                                            }
                                                        </span>

                                                    </td>

                                                    <td className="p-4">

                                                        <div className="flex flex-wrap gap-2">

                                                            {/* COPY MENU LINK */}

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleCopyMenuLink(
                                                                        restaurant
                                                                    )
                                                                }
                                                                disabled={
                                                                    isDeleting
                                                                }
                                                                className="bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 px-3 py-2 rounded-lg text-sm font-semibold"
                                                            >
                                                                {
                                                                    copiedRestaurantId ===
                                                                    restaurant.id
                                                                        ? '✓ تم النسخ'
                                                                        : 'نسخ الرابط'
                                                                }
                                                            </button>

                                                            {/* OPEN MENU */}

                                                            <a
                                                                href={`/${restaurant.slug}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-2 rounded-lg text-sm font-semibold"
                                                            >
                                                                فتح المنيو
                                                            </a>

                                                            {/* TOGGLE */}

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    toggleActive(
                                                                        restaurant.id,
                                                                        restaurant.is_active
                                                                    )
                                                                }
                                                                disabled={
                                                                    isDeleting
                                                                }
                                                                className="bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 px-3 py-2 rounded-lg text-sm font-semibold"
                                                            >
                                                                {
                                                                    restaurant.is_active
                                                                        ? 'إيقاف'
                                                                        : 'تفعيل'
                                                                }
                                                            </button>

                                                            {/* DELETE ALL ORDERS ONLY */}

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleDeleteAllOrders(
                                                                        restaurant
                                                                    )
                                                                }
                                                                disabled={
                                                                    isDeleting ||
                                                                    deletingOrdersId ===
                                                                    restaurant.id
                                                                }
                                                                className="bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50 px-3 py-2 rounded-lg text-sm font-semibold"
                                                            >
                                                                {deletingOrdersId ===
                                                                    restaurant.id
                                                                    ? 'جاري المسح...'
                                                                    : 'مسح كل الطلبات'}
                                                            </button>

                                                            {/* DELETE */}

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleDeleteRestaurant(
                                                                        restaurant
                                                                    )
                                                                }
                                                                disabled={
                                                                    isDeleting
                                                                }
                                                                className="bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 px-3 py-2 rounded-lg text-sm font-semibold"
                                                            >
                                                                {isDeleting
                                                                    ? 'جاري الحذف...'
                                                                    : 'حذف المطعم'}
                                                            </button>

                                                        </div>

                                                    </td>

                                                </tr>
                                            )
                                        }
                                    )}

                                </tbody>

                            </table>

                        </div>
                    )}

                </section>

            </main>

        </div>
    )
}
