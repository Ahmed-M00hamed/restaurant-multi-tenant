import { createClient } from '@supabase/supabase-js';


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey
);

export async function getCurrentUserRole() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
        .from('user_roles')
        .select('role, restaurant_id, restaurants(*)')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error || !data) {
        // مفيش صف في user_roles لليوزر ده = محدش أدمن، منسيبهوش
        // يعدّي كـ "admin" بالغلط
        return {
            user,
            role: null,
            restaurant_id: null
        };
    }

    return { user, ...data };
}
