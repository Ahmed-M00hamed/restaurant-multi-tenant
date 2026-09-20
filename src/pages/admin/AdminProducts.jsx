import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function AdminProducts() {
    const context = useOutletContext() || {};
    const authData = context.authData;
    const restaurantId = authData?.restaurant_id;

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const fetchData = async () => {
        if (!restaurantId) return;

        const { data: categoriesData, error: catError } = await supabase
            .from('categories')
            .select('id, name')
            .eq('restaurant_id', restaurantId);

        if (catError) console.error('Error fetching categories:', catError);
        else setCategories(categoriesData || []);

        await fetchProducts();
    };

    const fetchProducts = async () => {
        if (!restaurantId) return;

        const { data, error } = await supabase
            .from('products')
            .select('*, categories(name)')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching products:', error);
        else setProducts(data || []);
    };

    useEffect(() => {
        fetchData();
    }, [restaurantId]);

    const handleAddProduct = async (e) => {
        e.preventDefault();
        
        if (!restaurantId) {
            alert('لا توجد صلاحية لإضافة منتجات لعدم تحديد المطعم');
            return;
        }

        if (!categoryId) {
            alert('يرجى اختيار القسم المخصص للمنتج');
            return;
        }

        setLoading(true);

        const { error } = await supabase
            .from('products')
            .insert([
                {
                    name,
                    price: parseFloat(price),
                    image_url: imageUrl.trim() || null,
                    restaurant_id: restaurantId,
                    category_id: categoryId,
                },
            ]);

        setLoading(false);

        if (error) {
            alert('حدث خطأ أثناء إضافة المنتج: ' + error.message);
        } else {
            setName('');
            setPrice('');
            setImageUrl('');
            setCategoryId('');
            fetchProducts();
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm('هل أنت تأكد من رغبتك في حذف هذا المنتج؟')) return;

        setDeletingId(id);
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        setDeletingId(null);

        if (error) {
            alert('حدث خطأ أثناء الحذف: ' + error.message);
        } else {
            setProducts((prev) => prev.filter((p) => p.id !== id));
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto" dir="rtl">
            <h2 className="text-2xl font-bold mb-6">إدارة المنتجات</h2>

            {/* Form */}
            <form onSubmit={handleAddProduct} className="bg-(--color-card) p-4 rounded-xl border mb-8 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">اسم المنتج *</label>
                        <input
                            type="text"
                            placeholder="اسم المنتج"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border p-2.5 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-(--color-primary)"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">السعر (ج.م) *</label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="السعر"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full border p-2.5 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-(--color-primary)"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">القسم *</label>
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="w-full border p-2.5 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-(--color-primary)"
                            required
                        >
                            <option value="" disabled>اختر القسم...</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">رابط صورة المنتج</label>
                        <input
                            type="url"
                            placeholder="https://example.com/image.jpg"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="w-full border p-2.5 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-(--color-primary)"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto bg-(--color-primary) text-white font-medium px-6 py-2.5 rounded-lg transition hover:opacity-90 disabled:opacity-50"
                >
                    {loading ? 'جاري الإضافة...' : 'إضافة منتج ➕'}
                </button>
            </form>

            {/* Products List */}
            <div className="bg-(--color-card) rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b font-semibold text-lg">
                    قائمة المنتجات ({products.length})
                </div>

                {products.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        لا توجد منتجات مضافة حتى الآن.
                    </div>
                ) : (
                    <ul className="divide-y">
                        {products.map((p) => (
                            <li key={p.id} className="p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    {p.image_url ? (
                                        <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl">🍔</div>
                                    )}
                                    <div>
                                        <h3 className="font-semibold text-base">{p.name}</h3>
                                        {p.categories?.name && (
                                            <span className="inline-block text-xs text-gray-500 mt-1 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                                                {p.categories.name}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                                        {p.price} ج.م
                                    </span>

                                    <button
                                        onClick={() => handleDeleteProduct(p.id)}
                                        disabled={deletingId === p.id}
                                        className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition disabled:opacity-50 text-sm font-medium"
                                    >
                                        {deletingId === p.id ? 'جاري الحذف...' : 'حذف'}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}