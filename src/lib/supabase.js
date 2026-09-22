import { createClient } from '@supabase/supabase-js';


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey
);

export async function getCurrentUserRole() {
    const { data: { user }, error: userError } =
        await supabase.auth.getUser();

    console.log("CURRENT USER:", user);
    console.log("USER ERROR:", userError);

    if (!user) return null;

    const { data, error } = await supabase
        .from('user_roles')
        .select('role, restaurant_id, restaurants(*)')
        .eq('user_id', user.id)
        .maybeSingle();

    console.log("USER ROLE:", data);
    console.log("ROLE ERROR:", error);

    const { data: isAdmin, error: adminError } =
        await supabase.rpc('is_admin');

    console.log("IS ADMIN:", isAdmin);
    console.log("ADMIN ERROR:", adminError);

    if (error || !data) {
        return {
            user,
            role: 'authenticated',
            restaurant_id: null
        };
    }

    return { user, ...data };
}