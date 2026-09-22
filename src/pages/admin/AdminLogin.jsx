
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

function AdminLogin() {
    const navigate = useNavigate()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleLogin = async (e) => {
        e.preventDefault()

        if (!email || !password) {
            setError("من فضلك اكتب الإيميل وكلمة السر.")
            return
        }

        setLoading(true)
        setError("")

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            console.error("Login error:", error)
            setError("الإيميل أو كلمة السر غير صحيحة.")
            setLoading(false)
            return
        }

        // نوجّه حسب الدور: صاحب المنصة (super_admin) يروح للوحته الخاصة،
        // وصاحب المطعم (admin) يروح للوحة مطعمه
        const { data: authUser } = await supabase.auth.getUser()

        let role = "admin"
        if (authUser?.user) {
            const { data: roleData } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", authUser.user.id)
                .maybeSingle()

            role = roleData?.role || "admin"
        }

        setLoading(false)

        if (role === "super_admin") {
            navigate("/super-admin")
        } else {
            navigate("/admin/orders")
        }
    }

    return (
        <div className="min-h-screen bg-(--color-background) flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-(--color-card) rounded-2xl shadow-lg p-6">

                <h1 className="text-2xl font-bold text-center mb-2">
                    MenuFlow Admin
                </h1>

                <p className="text-center opacity-70 mb-6">
                    تسجيل الدخول إلى لوحة التحكم
                </p>

                <form onSubmit={handleLogin} className="space-y-4">

                    <div>
                        <label className="block mb-2 font-medium">
                            البريد الإلكتروني
                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@example.com"
                            className="w-full border rounded-xl px-4 py-3 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block mb-2 font-medium">
                            كلمة السر
                        </label>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full border rounded-xl px-4 py-3 outline-none"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-(--color-primary) text-white rounded-xl py-3 font-semibold disabled:opacity-50"
                    >
                        {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                    </button>

                </form>
            </div>
        </div>
    )
}

export default AdminLogin
