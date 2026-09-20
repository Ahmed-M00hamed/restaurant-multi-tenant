import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom"

import "./index.css"

import App from "./App.jsx"
import AdminOrders from "./pages/admin/AdminOrders.jsx"
import AdminDashboard from "./pages/admin/AdminDashboard.jsx"
import AdminLogin from "./pages/admin/AdminLogin.jsx"
import AdminLayout from "./pages/admin/AdminLayout.jsx"
import AdminProducts from "./pages/admin/AdminProducts.jsx"
import AdminCategories from "./pages/admin/AdminCategories.jsx"
import AdminTables from "./pages/admin/AdminTables.jsx"
import AdminSettings from "./pages/admin/AdminSettings.jsx"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>

        {/* 1. مسارات لوحة التحكم (Admin) */}
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route path="/admin/*" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="tables" element={<AdminTables />} />
          <Route
            path="delivery-areas"
            element={<Navigate to="/admin/settings" replace />}
          />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>

        {/* 2. رابط المطعم الديناميكي (مثال: /demo-restaurant) */}
        <Route path="/:slug/*" element={<App />} />

        {/* 3. توجيه الصفحة الرئيسية تلقائياً إلى /demo-restaurant */}
        <Route path="/" element={<Navigate to="/demo-restaurant" replace />} />

        {/* 4. أي مسار آخر غير معروف يوجه إلى /demo-restaurant */}
        <Route path="*" element={<Navigate to="/demo-restaurant" replace />} />

      </Routes>
    </BrowserRouter>
  </StrictMode>
)