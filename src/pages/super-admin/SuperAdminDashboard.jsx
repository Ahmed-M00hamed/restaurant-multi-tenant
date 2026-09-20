import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function SuperAdminDashboard() {
    const [restaurants, setRestaurants] = useState([]);
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [phone, setPhone] = useState('');

    const loadRestaurants = async () => {
        const { data } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
        setRestaurants(data || []);
    };

    useEffect(() => {
        loadRestaurants();
    }, []);

    const handleAddRestaurant = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('restaurants').insert([{ name, slug, phone }]);

        if (!error) {
            alert('تم إنشاء المطعم بنجاح!');
            setName('');
            setSlug('');
            setPhone('');
            loadRestaurants();
        } else {
            alert('حدث خطأ: ' + error.message);
        }
    };

    const toggleActive = async (id, currentStatus) => {
        await supabase.from('restaurants').update({ is_active: !currentStatus }).eq('id', id);
        loadRestaurants();
    };

    return (
        <div className="p-6 max-w-5xl mx-auto" dir="rtl">
            <h1 className="text-2xl font-bold mb-6">لوحة تحكم الـ Super Admin</h1>

            {/* نموذج إنشاء مطعم جديد */}
            <form onSubmit={handleAddRestaurant} className="bg-white p-4 border rounded-lg mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                    type="text"
                    placeholder="اسم المطعم"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border p-2 rounded"
                    required
                />
                <input
                    type="text"
                    placeholder="الرابط (slug) مثال: my-restaurant"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="border p-2 rounded"
                    required
                />
                <input
                    type="text"
                    placeholder="رقم الهاتف"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="border p-2 rounded"
                />
                <button type="submit" className="bg-blue-600 text-white p-2 rounded font-bold">إضافة مطعم</button>
            </form>

            {/* قائمة المطاعم */}
            <div className="bg-white border rounded-lg overflow-hidden">
                <table className="w-full text-right border-collapse">
                    <thead className="bg-gray-100 border-b">
                        <tr>
                            <th className="p-3">اسم المطعم</th>
                            <th className="p-3">الرابط (Slug)</th>
                            <th className="p-3">الحالة</th>
                            <th className="p-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {restaurants.map((rest) => (
                            <tr key={rest.id} className="border-b">
                                <td className="p-3 font-semibold">{rest.name}</td>
                                <td className="p-3 text-blue-600">/{rest.slug}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs ${rest.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {rest.is_active ? 'نشط' : 'متوقف'}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <button
                                        onClick={() => toggleActive(rest.id, rest.is_active)}
                                        className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm"
                                    >
                                        {rest.is_active ? 'إيقاف' : 'تفعيل'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}