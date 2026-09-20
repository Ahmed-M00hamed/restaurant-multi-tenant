import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function PublicMenu() {
    const { restaurantSlug } = useParams();
    const [restaurant, setRestaurant] = useState(null);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            // أ) جلب المطعم بواسطة الـ Slug
            const { data: rest, error } = await supabase
                .from('restaurants')
                .select('*')
                .eq('slug', restaurantSlug)
                .eq('is_active', true)
                .maybeSingle();

            if (rest) {
                setRestaurant(rest);

                // ب) جلب تصنيفات هذا المطعم
                const { data: cats } = await supabase
                    .from('categories')
                    .select('*')
                    .eq('restaurant_id', rest.id);
                setCategories(cats || []);

                // ج) جلب منتجات هذا المطعم
                const { data: prods } = await supabase
                    .from('products')
                    .select('*')
                    .eq('restaurant_id', rest.id);
                setProducts(prods || []);
            }
            setLoading(false);
        }

        fetchData();
    }, [restaurantSlug]);

    if (loading) return <div className="p-8 text-center">جاري تحميل المنيو...</div>;
    if (!restaurant) return <div className="p-8 text-center text-red-500">المطعم غير موجود أو تم إيقافه.</div>;

    return (
        <div className="max-w-4xl mx-auto p-4">
            <header className="mb-6 text-center border-b pb-4">
                {restaurant.logo_url && <img src={restaurant.logo_url} alt={restaurant.name} className="w-20 h-20 mx-auto mb-2 rounded-full" />}
                <h1 className="text-3xl font-bold">{restaurant.name}</h1>
                <p className="text-gray-500">{restaurant.phone}</p>
            </header>

            <main>
                <h2 className="text-xl font-bold mb-4">المنتجات</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.map((prod) => (
                        <div key={prod.id} className="border p-4 rounded-lg shadow-sm flex justify-between items-center">
                            <div>
                                <h3 className="font-semibold">{prod.name}</h3>
                                <p className="text-sm text-gray-500">{prod.description}</p>
                                <span className="font-bold text-green-600">{prod.price} ج.م</span>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}