import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"

import { buildWhatsAppLink } from "./lib/whatsapp"
import { applyBranding, getHeaderOverlay } from "./lib/branding"
import {
  createOrder,
  createOrderItems,
  cancelOrder as cancelOrderRequest,
} from "./lib/orders"

import { useRestaurant } from "./hooks/useRestaurant"
import { useMenu } from "./hooks/useMenu"
import { useRestaurantSettings } from "./hooks/useRestaurantSettings"
import { useDeliveryAreas } from "./hooks/useDeliveryAreas"
import { useTable } from "./hooks/useTable"
import { useOrderTracking } from "./hooks/useOrderTracking"

import Header from "./components/Header"
import MenuSearch from "./components/MenuSearch"
import CategoryTabs from "./components/CategoryTabs"
import ProductCard from "./components/ProductCard"
import FloatingActions from "./components/FloatingActions"
import WhatsAppButton from "./components/WhatsAppButton"
import CartDrawer from "./components/CartDrawer"
import OrderFlow from "./components/OrderFlow"
import OrderTracking from "./components/OrderTracking"
import CancelOrderModal from "./components/CancelOrderModal"

const ACTIVE_ORDER_KEY = "menuflow_active_order"
const MAX_TRACK_AGE_MS = 12 * 60 * 60 * 1000

const CANCELLABLE_STATUSES = [
  "pending",
  "processing",
]

const readActiveOrder = () => {
  try {
    const raw = localStorage.getItem(ACTIVE_ORDER_KEY)

    if (!raw) {
      return null
    }

    const order = JSON.parse(raw)

    if (
      !order?.id ||
      !order?.token ||
      Date.now() - Number(order.createdAt || 0) >
      MAX_TRACK_AGE_MS
    ) {
      localStorage.removeItem(ACTIVE_ORDER_KEY)
      return null
    }

    return order
  } catch {
    return null
  }
}

const saveActiveOrder = (order) => {
  try {
    localStorage.setItem(
      ACTIVE_ORDER_KEY,
      JSON.stringify(order),
    )
  } catch {
    // ignore localStorage errors
  }
}

const removeActiveOrder = () => {
  try {
    localStorage.removeItem(ACTIVE_ORDER_KEY)
  } catch {
    // ignore localStorage errors
  }
}

function App() {
  const { slug } = useParams()

  // ========================================
  // Restaurant
  // ========================================

  const {
    restaurantRow,
    restaurantLoading,
    restaurantNotFound,
    restaurantError,
  } = useRestaurant(slug)

  const restaurantId = restaurantRow?.id || null

  // ========================================
  // Menu
  // ========================================

  const {
    products,
    dbCategories,
    menuLoading,
    menuError,
    reloadMenu,
  } = useMenu(restaurantId)

  const [selectedCategory, setSelectedCategory] =
    useState("الكل")

  const [searchTerm, setSearchTerm] = useState("")

  // ========================================
  // Restaurant Settings
  // ========================================

  const {
    restaurantSettings,
    settingsLoading,
    settingsError,
  } = useRestaurantSettings(restaurantId)

  // ========================================
  // Delivery Areas
  // ========================================

  const {
    deliveryAreas,
    deliveryAreasLoading,
  } = useDeliveryAreas(restaurantId)

  // ========================================
  // Table / QR
  // ========================================

  const tableNumber = useMemo(() => {
    const params = new URLSearchParams(
      window.location.search,
    )

    const value = params.get("table")

    if (!value || !/^\d+$/.test(value)) {
      return null
    }

    const number = Number(value)

    return number > 0 ? number : null
  }, [])

  const isDineInQr = tableNumber !== null

  const {
    tableInfo,
    isCheckingTable,
    tableError,
  } = useTable(
    restaurantId,
    tableNumber,
  )

  const isValidDineInTable =
    Boolean(
      isDineInQr &&
      tableInfo &&
      tableInfo.is_active === true &&
      !isCheckingTable,
    )

  // ========================================
  // Branding / Restaurant Data
  // ========================================

  const restaurantName =
    restaurantSettings?.restaurant_name ||
    restaurantRow?.name ||
    "MenuFlow"

  const restaurantDescription =
    restaurantSettings?.description || ""

  const restaurantPhone =
    restaurantSettings?.phone ||
    restaurantRow?.phone ||
    ""

  const restaurantLogo =
    restaurantSettings?.logo_url || ""

  const restaurantCover =
    restaurantSettings?.cover_url || ""

  const overlay = getHeaderOverlay(
    restaurantSettings?.header_color,
    restaurantSettings?.header_opacity,
  )

  const headerOverlay =
    overlay?.backgroundColor ||
    overlay?.solidColor ||
    "rgba(0,0,0,0.35)"

  const isRestaurantOpen =
    restaurantSettings?.is_open ?? true

  const closedMessage =
    restaurantSettings?.closed_message ||
    "المطعم مغلق حاليًا"

  const deliveryEnabled =
    restaurantSettings?.delivery_enabled ?? true

  const pickupEnabled =
    restaurantSettings?.pickup_enabled ?? true

  const dineInEnabled =
    restaurantSettings?.dine_in_enabled ?? true

  const cashPaymentEnabled =
    restaurantSettings?.cash_payment_enabled ?? true

  const onlinePaymentEnabled =
    restaurantSettings?.online_payment_enabled ?? false

  const primaryColor =
    restaurantSettings?.primary_color ||
    "#000000"

  const backgroundColor =
    restaurantSettings?.background_color ||
    "#f8f8f8"

  const cardColor =
    restaurantSettings?.card_color ||
    "#ffffff"

  useEffect(() => {
    applyBranding({
      title:
        restaurantSettings?.restaurant_name ||
        restaurantRow?.name,
      iconUrl: restaurantLogo,
    })
  }, [
    restaurantSettings?.restaurant_name,
    restaurantRow?.name,
    restaurantLogo,
  ])

  // ========================================
  // Cart
  // ========================================

  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] =
    useState(false)

  const addToCart = (product) => {
    if (!isRestaurantOpen) {
      alert(closedMessage)
      return
    }

    if (product?.is_available === false) {
      alert("هذا المنتج غير متاح حاليًا.")
      return
    }

    setCart((currentCart) => {
      const existingProduct =
        currentCart.find(
          (item) => item.id === product.id,
        )

      if (existingProduct) {
        return currentCart.map((item) =>
          item.id === product.id
            ? {
              ...item,
              quantity: item.quantity + 1,
            }
            : item,
        )
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ]
    })
  }

  const increaseQuantity = (product) => {
    const productId =
      typeof product === "object"
        ? product.id
        : product

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === productId
          ? {
            ...item,
            quantity: item.quantity + 1,
          }
          : item,
      ),
    )
  }

  const decreaseQuantity = (product) => {
    const productId =
      typeof product === "object"
        ? product.id
        : product

    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId
            ? {
              ...item,
              quantity: item.quantity - 1,
            }
            : item,
        )
        .filter(
          (item) => item.quantity > 0,
        ),
    )
  }

  const removeFromCart = (product) => {
    const productId =
      typeof product === "object"
        ? product.id
        : product

    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.id !== productId,
      ),
    )
  }

  const cartItemsCount = cart.reduce(
    (total, item) =>
      total + Number(item.quantity || 0),
    0,
  )

  const cartTotal = cart.reduce(
    (total, item) =>
      total +
      Number(item.price || 0) *
      Number(item.quantity || 0),
    0,
  )

  // ========================================
  // Categories / Filter
  // ========================================

  const categories = useMemo(() => {
    return [
      {
        id: "all",
        name: "الكل",
        slug: "all",
      },
      ...dbCategories
        .filter((category) =>
          products.some(
            (product) =>
              product.category ===
              category.name,
          ),
        )
        .map((category) => ({
          ...category,
          slug:
            category.name ||
            category.slug ||
            String(category.id),
        })),
    ]
  }, [dbCategories, products])

  const filteredProducts = useMemo(() => {
    const term =
      searchTerm.trim().toLowerCase()

    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "الكل" ||
        product.category ===
        selectedCategory

      const matchesSearch =
        !term ||
        product.name
          ?.toLowerCase()
          .includes(term) ||
        product.description
          ?.toLowerCase()
          .includes(term)

      return (
        matchesCategory &&
        matchesSearch
      )
    })
  }, [
    products,
    selectedCategory,
    searchTerm,
  ])

  // ========================================
  // Order Flow
  // ========================================

  const [
    isOrderFlowOpen,
    setIsOrderFlowOpen,
  ] = useState(false)

  const [orderStep, setOrderStep] =
    useState(1)

  const [orderType, setOrderType] =
    useState(null)

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("")

  const [customerInfo, setCustomerInfo] =
    useState({
      name: "",
      phone: "",
      deliveryArea: "",
      address: "",
      notes: "",
    })

  const selectedDeliveryArea =
    deliveryAreas.find(
      (area) =>
        String(area.name) ===
        String(
          customerInfo.deliveryArea,
        ),
    )

  const deliveryPrice =
    Number(
      selectedDeliveryArea?.price || 0,
    )

  const finalTotal =
    cartTotal +
    (orderType === "delivery"
      ? deliveryPrice
      : 0)

  const openOrderFlow = () => {
    if (!isRestaurantOpen) {
      alert(closedMessage)
      return
    }

    if (!cart.length) {
      alert("السلة فارغة.")
      return
    }

    setIsCartOpen(false)
    setOrderStep(1)
    setOrderType(null)
    setPaymentMethod("")
    setIsOrderFlowOpen(true)
  }

  const closeOrderFlow = () => {
    if (isSubmitting) {
      return
    }

    setIsOrderFlowOpen(false)
    setOrderStep(1)
    setOrderType(null)
    setPaymentMethod("")
  }

  const handleSelectOrderType = (type) => {
    setOrderType(type)

    if (type === "delivery") {
      if (
        cashPaymentEnabled &&
        !onlinePaymentEnabled
      ) {
        setPaymentMethod("cash")
      } else if (
        onlinePaymentEnabled &&
        !cashPaymentEnabled
      ) {
        setPaymentMethod("online")
      } else {
        setPaymentMethod("")
      }

      return
    }

    setPaymentMethod("")
  }

  const validateOrderForm = () => {
    if (!orderType) {
      return "من فضلك اختر نوع الطلب."
    }

    if (
      orderType === "dine-in" &&
      !isValidDineInTable
    ) {
      return "لازم تكون ماسح كود QR على طاولتك عشان تطلب داخل المطعم."
    }

    if (orderType === "delivery") {
      if (!customerInfo.name.trim()) {
        return "من فضلك اكتب اسمك."
      }

      if (!customerInfo.phone.trim()) {
        return "من فضلك اكتب رقم موبايلك."
      }

      if (!customerInfo.deliveryArea) {
        return "من فضلك اختر منطقة التوصيل."
      }

      if (!customerInfo.address.trim()) {
        return "من فضلك اكتب عنوانك بالتفصيل."
      }

      if (!paymentMethod) {
        return "من فضلك اختر طريقة الدفع."
      }
    }

    if (orderType === "pickup") {
      if (!customerInfo.name.trim()) {
        return "من فضلك اكتب اسمك."
      }

      if (!customerInfo.phone.trim()) {
        return "من فضلك اكتب رقم موبايلك."
      }
    }

    return null
  }

  // ========================================
  // Order Tracking
  // ========================================

  const [
    trackedOrder,
    setTrackedOrder,
  ] = useState(readActiveOrder)

  const {
    orderStatus,
    setOrderStatus,
    trackingError,
    isTrackingLoading,
  } = useOrderTracking(trackedOrder)

  const [isTrackingOpen, setIsTrackingOpen] =
    useState(
      () => readActiveOrder() !== null,
    )

  const [orderSuccess, setOrderSuccess] =
    useState(
      () => readActiveOrder() !== null,
    )

  // لما الطلب يوصل لحالة نهائية (تم التسليم / ملغي)، نمسحه من
  // localStorage عشان مايظهرش تاني عند عمل Reload للصفحة
  useEffect(() => {
    if (
      orderStatus === "delivered" ||
      orderStatus === "cancelled"
    ) {
      removeActiveOrder()
    }
  }, [orderStatus])

  // لما الطلب "يتم تسليمه"، نسكّر صفحة التتبع تلقائيًا بعد
  // كام ثانية (عشان العميل يشوف رسالة التأكيد الأول)
  useEffect(() => {
    if (orderStatus !== "delivered") {
      return
    }

    const timer = setTimeout(() => {
      setIsTrackingOpen(false)
    }, 4000)

    return () => clearTimeout(timer)
  }, [orderStatus])

  // ========================================
  // Cancel Order
  // ========================================

  const [
    showCancel,
    setShowCancel,
  ] = useState(false)

  const [
    cancelReason,
    setCancelReason,
  ] = useState("")

  const [
    cancelNote,
    setCancelNote,
  ] = useState("")

  const [
    isCancelling,
    setIsCancelling,
  ] = useState(false)

  const canCancelOrder =
    CANCELLABLE_STATUSES.includes(
      orderStatus,
    )

  const cancelCurrentOrder =
    async () => {
      if (
        !trackedOrder?.id ||
        !trackedOrder?.token ||
        isCancelling
      ) {
        return
      }

      if (!canCancelOrder) {
        setShowCancel(false)
        return
      }

      if (!cancelReason) {
        alert(
          "من فضلك اختر سبب الإلغاء.",
        )
        return
      }

      const finalReason =
        cancelReason === "سبب آخر"
          ? cancelNote.trim()
          : cancelReason

      if (!finalReason) {
        alert(
          "من فضلك اكتب سبب الإلغاء.",
        )
        return
      }

      setIsCancelling(true)

      try {
        const result =
          await cancelOrderRequest({
            orderId:
              trackedOrder.id,
            customerToken:
              trackedOrder.token,
            cancelReason:
              finalReason,
          })

        if (!result?.success) {
          if (result?.status) {
            setOrderStatus(
              result.status,
            )
          }

          setShowCancel(false)

          alert(
            "الطلب لم يعد قابلًا للإلغاء.",
          )

          return
        }

        setOrderStatus("cancelled")

        setShowCancel(false)
        setCancelReason("")
        setCancelNote("")
      } catch (error) {
        console.error(
          "Cancel order error:",
          error,
        )

        alert(
          `تعذر إلغاء الطلب:\n${error?.message ||
          "حدث خطأ غير متوقع."
          }`,
        )
      } finally {
        setIsCancelling(false)
      }
    }

  // ========================================
  // Start New Order
  // ========================================

  const startNewOrder = () => {
    removeActiveOrder()

    setTrackedOrder(null)
    setOrderStatus(null)
    setOrderSuccess(false)
    setIsTrackingOpen(false)

    setShowCancel(false)
    setCancelReason("")
    setCancelNote("")

    setCart([])
    setIsCartOpen(false)

    setIsOrderFlowOpen(false)
    setOrderStep(1)
    setOrderType(null)

    setCustomerInfo({
      name: "",
      phone: "",
      deliveryArea: "",
      address: "",
      notes: "",
    })

    setPaymentMethod("")
  }

  // ========================================
  // Create Order
  // ========================================

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false)

  const confirmOrder =
    async () => {
      if (isSubmitting) {
        return
      }

      if (!isRestaurantOpen) {
        alert(closedMessage)
        return
      }

      if (!restaurantId) {
        alert(
          "تعذر تحديد المطعم، من فضلك أعد تحميل الصفحة.",
        )
        return
      }

      if (!cart.length) {
        alert("السلة فارغة.")
        return
      }

      const validationError =
        validateOrderForm()

      if (validationError) {
        alert(validationError)
        return
      }

      setIsSubmitting(true)

      try {
        const newCustomerToken =
          crypto.randomUUID()

        const newOrderNumber =
          `MF-${Date.now()
            .toString()
            .slice(-6)}`

        const createdOrder =
          await createOrder({
            restaurantId,
            orderType,
            tableNumber,
            customerToken:
              newCustomerToken,
            orderNumber:
              newOrderNumber,
            customerInfo,
            paymentMethod:
              orderType === "delivery"
                ? paymentMethod
                : null,
            productsTotal:
              cartTotal,
            deliveryPrice:
              orderType === "delivery"
                ? deliveryPrice
                : 0,
            totalPrice:
              finalTotal,
          })

        await createOrderItems(
          createdOrder.id,
          cart,
        )

        const newTrackedOrder = {
          id: createdOrder.id,
          token:
            createdOrder.customer_token ||
            newCustomerToken,
          number:
            createdOrder.order_number ||
            newOrderNumber,
          type: orderType,
          table:
            orderType === "dine-in"
              ? tableNumber
              : null,
          name:
            orderType === "pickup"
              ? customerInfo.name.trim()
              : "",
          phone:
            orderType === "pickup"
              ? customerInfo.phone.trim()
              : "",
          createdAt: Date.now(),
        }

        saveActiveOrder(
          newTrackedOrder,
        )

        setTrackedOrder(
          newTrackedOrder,
        )

        setOrderStatus("pending")

        setCart([])
        setIsCartOpen(false)

        setIsOrderFlowOpen(false)
        setOrderStep(1)
        setOrderType(null)

        setOrderSuccess(true)
        setIsTrackingOpen(true)

        setCustomerInfo({
          name: "",
          phone: "",
          deliveryArea: "",
          address: "",
          notes: "",
        })

        setPaymentMethod("")
      } catch (error) {
        console.error(
          "Create order error:",
          error,
        )

        alert(
          `حصل خطأ أثناء إنشاء الطلب:\n${error?.message ||
          "حدث خطأ غير متوقع."
          }`,
        )
      } finally {
        setIsSubmitting(false)
      }
    }

  // ========================================
  // WhatsApp
  // ========================================

  const whatsappContactLink =
    restaurantPhone
      ? buildWhatsAppLink(
        restaurantPhone,
        `مرحباً، عندي استفسار بخصوص ${restaurantName} 🙋`,
      )
      : ""

  // ========================================
  // Loading / Errors
  // ========================================

  if (restaurantLoading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-gray-50"
      >
        <div className="text-center">
          <div className="mb-4 text-4xl">
            🍽️
          </div>

          <div className="text-lg font-bold">
            جاري تحميل المنيو...
          </div>

          <p className="mt-2 text-sm opacity-60">
            لحظات من فضلك
          </p>
        </div>
      </div>
    )
  }

  if (restaurantNotFound) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-gray-50 p-6"
      >
        <div className="max-w-sm text-center">
          <div className="mb-4 text-4xl">
            🚫
          </div>

          <h1 className="text-lg font-bold">
            المطعم غير موجود
          </h1>

          <p className="mt-2 text-sm opacity-60">
            الرابط ده مش شغال أو المطعم
            متوقف حاليًا. تأكد من الرابط
            وجرّب تاني.
          </p>
        </div>
      </div>
    )
  }

  if (restaurantError) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-gray-50 p-6"
      >
        <div className="max-w-sm text-center">
          <div className="mb-4 text-4xl">
            ⚠️
          </div>

          <h1 className="text-lg font-bold">
            حصل خطأ
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {restaurantError}
          </p>
        </div>
      </div>
    )
  }

  if (settingsLoading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-gray-50"
      >
        <div className="text-center">
          <div className="mb-4 text-4xl">
            🍽️
          </div>

          <div className="text-lg font-bold">
            جاري تحميل المنيو...
          </div>

          <p className="mt-2 text-sm opacity-60">
            لحظات من فضلك
          </p>
        </div>
      </div>
    )
  }

  // ========================================
  // UI
  // ========================================

  return (
    <div
      dir="rtl"
      style={{
        "--color-primary":
          primaryColor,
        "--color-background":
          backgroundColor,
        "--color-card":
          cardColor,
        "--color-text":
          "#171717",
      }}
      className="min-h-screen overflow-x-clip bg-(--color-background) text-(--color-text)"
    >
      {/* Header */}

      <Header
        restaurantName={restaurantName}
        restaurantDescription={
          restaurantDescription
        }
        restaurantLogo={restaurantLogo}
        restaurantCover={restaurantCover}
        restaurantPhone={restaurantPhone}
        isOpen={isRestaurantOpen}
        overlay={headerOverlay}
      />

      {!isRestaurantOpen && (
        <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-center text-red-700">
          <div className="flex items-center justify-center gap-2 text-sm font-bold">
            <span className="h-2 w-2 rounded-full bg-red-500" />

            <span>
              {closedMessage}
            </span>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-md px-4 py-6 md:max-w-3xl md:py-8 lg:max-w-6xl">
        <div className="space-y-4">
          <MenuSearch
            searchTerm={searchTerm}
            setSearchTerm={
              setSearchTerm
            }
          />

          <CategoryTabs
            categories={categories}
            activeCategory={
              selectedCategory === "الكل"
                ? "all"
                : selectedCategory
            }
            setActiveCategory={(
              value,
            ) => {
              if (value === "all") {
                setSelectedCategory(
                  "الكل",
                )
                return
              }

              const selected =
                dbCategories.find(
                  (category) =>
                    String(
                      category.name ||
                      category.slug ||
                      category.id,
                    ) ===
                    String(value),
                )

              setSelectedCategory(
                selected?.name || value,
              )
            }}
          />
        </div>

        {menuLoading ? (
          <div className="py-20 text-center opacity-60">
            جاري تحميل المنتجات...
          </div>
        ) : menuError ? (
          <div className="py-20 text-center">
            <div className="mb-3 text-4xl">
              ⚠️
            </div>

            <p className="mb-4 opacity-70">
              تعذر تحميل المنيو.
            </p>

            <button
              type="button"
              onClick={reloadMenu}
              className="rounded-xl bg-(--color-primary) px-5 py-2.5 text-sm font-bold text-white"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center opacity-60">
            <div className="mb-3 text-4xl">
              🍽️
            </div>

            لا توجد منتجات مطابقة.
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {filteredProducts.map(
              (product) => {
                const cartItem =
                  cart.find(
                    (item) =>
                      item.id ===
                      product.id,
                  )

                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    quantity={
                      cartItem?.quantity ||
                      0
                    }
                    onAddToCart={
                      addToCart
                    }
                    onIncrease={
                      increaseQuantity
                    }
                    onDecrease={
                      decreaseQuantity
                    }
                  />
                )
              },
            )}
          </div>
        )}
      </main>

      {/* Floating Actions */}

      <FloatingActions
        cartItemsCount={
          cartItemsCount
        }
        cartTotal={
          cartTotal
        }
        onOpenCart={() =>
          setIsCartOpen(true)
        }
        onOpenTracking={
          trackedOrder
            ? () =>
              setIsTrackingOpen(
                true,
              )
            : null
        }
      />

      {/* WhatsApp */}

      <WhatsAppButton
        href={whatsappContactLink}
      />

      {/* Cart */}

      <CartDrawer
        isOpen={isCartOpen}
        cart={cart}
        cartTotal={cartTotal}
        onClose={() =>
          setIsCartOpen(false)
        }
        onIncrease={
          increaseQuantity
        }
        onDecrease={
          decreaseQuantity
        }
        onRemove={
          removeFromCart
        }
        onCheckout={
          openOrderFlow
        }
      />

      {/* Order Flow */}

      <OrderFlow
        isOpen={isOrderFlowOpen}
        step={orderStep}
        setStep={setOrderStep}
        orderType={orderType}
        setOrderType={
          handleSelectOrderType
        }
        customerInfo={
          customerInfo
        }
        setCustomerInfo={
          setCustomerInfo
        }
        deliveryAreas={
          deliveryAreas
        }
        deliveryPrice={
          deliveryPrice
        }
        productsTotal={
          cartTotal
        }
        finalTotal={
          finalTotal
        }
        paymentMethod={
          paymentMethod
        }
        setPaymentMethod={
          setPaymentMethod
        }
        deliveryEnabled={
          deliveryEnabled
        }
        pickupEnabled={
          pickupEnabled
        }
        dineInEnabled={
          dineInEnabled &&
          isDineInQr
        }
        cashPaymentEnabled={
          orderType === "delivery" &&
          cashPaymentEnabled
        }
        onlinePaymentEnabled={
          orderType === "delivery" &&
          onlinePaymentEnabled
        }
        tableNumber={
          tableNumber
        }
        tableInfo={
          tableInfo
        }
        isDineInQr={
          isDineInQr
        }
        isSubmitting={
          isSubmitting
        }
        onClose={
          closeOrderFlow
        }
        onSubmit={
          confirmOrder
        }
      />

      {/* Order Tracking */}

      <OrderTracking
        isOpen={
          orderSuccess &&
          isTrackingOpen &&
          Boolean(trackedOrder)
        }
        trackedOrder={
          trackedOrder
        }
        orderStatus={
          orderStatus
        }
        isTrackingLoading={
          isTrackingLoading
        }
        trackingError={
          trackingError
        }
        canCancelOrder={
          canCancelOrder
        }
        onClose={() =>
          setIsTrackingOpen(
            false,
          )
        }
        onCancel={() =>
          setShowCancel(true)
        }
        onStartNewOrder={
          startNewOrder
        }
      />

      {/* Cancel Modal */}

      <CancelOrderModal
        isOpen={
          showCancel &&
          canCancelOrder
        }
        cancelReason={
          cancelReason
        }
        setCancelReason={
          setCancelReason
        }
        cancelNote={
          cancelNote
        }
        setCancelNote={
          setCancelNote
        }
        isCancelling={
          isCancelling
        }
        onClose={() => {
          if (isCancelling) {
            return
          }

          setShowCancel(false)
        }}
        onConfirm={
          cancelCurrentOrder
        }
      />

      {/* Table Error */}

      {isDineInQr &&
        tableError &&
        !isCheckingTable && (
          <div className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-red-50 p-3 text-center text-sm font-semibold text-red-700 shadow-lg">
            {tableError}
          </div>
        )}

      {/* Non-blocking status information */}

      {settingsError && (
        <div className="sr-only">
          {settingsError}
        </div>
      )}

      {deliveryAreasLoading && (
        <div className="sr-only">
          جاري تحميل مناطق التوصيل...
        </div>
      )}
    </div>
  )
}

export default App