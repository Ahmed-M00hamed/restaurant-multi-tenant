# 🍽️ MenuFlow

### Multi-Restaurant Digital Menu & Ordering SaaS

MenuFlow is a modern digital menu and restaurant ordering platform built for restaurants that want to manage their menu, receive orders, and provide customers with a fast mobile-friendly ordering experience.

Each restaurant can have its own menu, settings, products, categories, tables, delivery areas, and admin account — all managed through a centralized multi-restaurant architecture.

---

## ✨ Features

### 🏪 Multi-Restaurant Architecture

- Each restaurant has its own account and dashboard.
- Restaurant-specific settings and branding.
- Unique restaurant slug for the public menu.
- Restaurant-specific products, categories, tables, and delivery areas.
- Super Admin dashboard for managing restaurants and administrators.

### 📱 Digital Menu

- Mobile-first responsive design.
- Restaurant branding and customizable colors.
- Product categories.
- Product images.
- Product availability control.
- Product descriptions and prices.
- Restaurant open/closed status.

### 🛒 Ordering System

Customers can place orders through the digital menu with different order types:

- 🚚 Delivery
- 🛍️ Pickup
- 🍽️ Dine-in

Dine-in orders can be connected to a specific table using QR codes.

Example:

```text
https://your-domain.com/restaurant-slug?table=5
```

### 📦 Order Management

Restaurant administrators can:

- View incoming orders.
- Search orders.
- Filter by order status.
- Filter by order type.
- View order details.
- Manage delivery information.
- Update order status.

Supported order statuses include:

```text
Pending
Processing
Shipped
Delivered
Cancelled
```

### 📍 Delivery Areas

Restaurants can manage their delivery areas and delivery prices directly from the dashboard.

### 🪑 Table Management

- Create restaurant tables.
- Generate QR links for tables.
- Connect QR codes to dine-in orders.
- Identify the table automatically when a customer scans the QR code.

### 🖼️ Product Image Upload

- Upload product images directly from the admin dashboard.
- Images are stored using Supabase Storage.
- Image preview before saving.
- Maximum file size validation.
- Supports common image formats.

### 👨‍💼 Admin Dashboard

Restaurant administrators can manage:

- Products
- Categories
- Orders
- Delivery areas
- Tables
- Restaurant settings

### 👑 Super Admin

The platform owner can:

- Create restaurants.
- Manage restaurant administrators.
- Activate/deactivate restaurants.
- Manage the multi-restaurant environment.

---

## 🛠️ Tech Stack

### Frontend

- React
- Vite
- React Router
- Tailwind CSS

### Backend / Database

- Supabase
- PostgreSQL
- Supabase Authentication
- Supabase Storage
- Row Level Security (RLS)

### Deployment

- Vercel
- GitHub

---

## 🏗️ Architecture

MenuFlow is designed around a multi-tenant architecture.

```text
                    ┌─────────────────────┐
                    │      Super Admin    │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
          ┌──────▼──────┐             ┌──────▼──────┐
          │ Restaurant A│             │ Restaurant B│
          └──────┬──────┘             └──────┬──────┘
                 │                           │
        ┌────────┼────────┐         ┌────────┼────────┐
        │        │        │         │        │        │
     Products  Orders  Tables    Products  Orders  Tables
        │        │        │         │        │        │
        └────────┴────────┘         └────────┴────────┘
```

Each restaurant's data is associated with its own `restaurant_id`.

This allows multiple restaurants to use the same application while keeping their data separated through database policies and application-level authorization.

---

## 🔐 Security

MenuFlow uses Supabase Row Level Security (RLS) to control access to restaurant data.

The application includes separate authorization levels for:

- Restaurant Admin
- Super Admin
- Customer / Public Menu

Sensitive environment variables are stored locally and through deployment environment variables.

> Never commit `.env` or Supabase service-role keys to the repository.

---

## 📂 Project Structure

```text
src/
├── admin/
│   ├── AdminLayout.jsx
│   ├── AdminLogin.jsx
│   └── ...
│
├── pages/
│   ├── admin/
│   │   ├── AdminProducts.jsx
│   │   ├── AdminOrders.jsx
│   │   ├── AdminTables.jsx
│   │   ├── AdminDeliveryAreas.jsx
│   │   └── ...
│   │
│   └── super-admin/
│       └── SuperAdminDashboard.jsx
│
├── lib/
│   └── supabase.js
│
├── App.jsx
└── main.jsx
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd menuflow
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Start the development server

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:5173
```

---

## 🏗️ Production Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## 🌐 Deployment

MenuFlow can be deployed using Vercel.

Recommended production setup:

```text
GitHub
   │
   ▼
Vercel
   │
   ▼
React + Vite Application
   │
   ▼
Supabase
```

Add the following environment variables to the Vercel project:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

---

## 🔗 Restaurant URLs

Each restaurant can have its own public URL using its unique slug.

Example:

```text
https://your-domain.com/adam-res
```

A table QR code can point to:

```text
https://your-domain.com/adam-res?table=1
```

When the customer scans the QR code, MenuFlow can identify the restaurant and table automatically.

---

## 🗄️ Main Database Entities

The platform uses Supabase/PostgreSQL with entities such as:

```text
restaurants
restaurant_settings
user_roles
admin_users
categories
products
delivery_areas
tables
orders
order_items
```

The `restaurant_id` relationship is used to isolate restaurant-specific data.

---

## 🎯 Project Goals

MenuFlow is being developed with the following goals:

- Replace traditional printed menus with digital menus.
- Simplify restaurant ordering.
- Give restaurants their own customizable online menu.
- Support delivery, pickup, and dine-in ordering.
- Provide restaurant owners with an easy management dashboard.
- Build a scalable SaaS architecture that can support multiple restaurants.

---

## 🔮 Future Improvements

Planned features may include:

- WhatsApp order notifications.
- Customer order tracking.
- Restaurant analytics.
- Sales reports.
- Discount and coupon system.
- Advanced product variants.
- Multiple admin roles.
- Online payment integration.
- Custom restaurant domains.
- Subscription plans for restaurants.
- Automated QR code generation.
- More advanced Super Admin controls.

---

## 📸 Screenshots

Screenshots will be added as the platform UI continues to evolve.

---

## 👨‍💻 Developer

**Ahmed Mohamed**

MenuFlow is a personal SaaS project built using modern web technologies with a focus on restaurant management, multi-tenant architecture, and real-world business workflows.

---

## 📄 License

This project is currently intended as a private commercial project.

The source code may be made publicly visible for demonstration and portfolio purposes, but commercial reuse, redistribution, or deployment as a competing service is not permitted without permission from the project owner.
