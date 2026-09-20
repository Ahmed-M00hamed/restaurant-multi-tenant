import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getCurrentUserRole } from '../lib/supabase';

export default function ProtectedRoute({ allowedRoles }) {
    const [loading, setLoading] = useState(true);
    const [authData, setAuthData] = useState(null);

    useEffect(() => {
        async function checkAuth() {
            const data = await getCurrentUserRole();
            setAuthData(data);
            setLoading(false);
        }
        checkAuth();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">جاري التحقق من الصلاحيات...</div>;
    }

    if (!authData?.user) {
        return <Navigate to="/admin/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(authData.role)) {
        if (authData.role === 'super_admin') {
            return <Navigate to="/super-admin" replace />;
        }
        return <Navigate to="/admin" replace />;
    }

    return <Outlet context={{ authData }} />;
}