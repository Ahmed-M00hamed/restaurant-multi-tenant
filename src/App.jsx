import { useEffect, useState } from "react"
import { supabase } from "./lib/supabase"
import { buildWhatsAppLink } from "./lib/whatsapp"
import { applyBranding, getHeaderOverlay } from "./lib/branding"

// ========================================
// تتبع حالة الطلب
// ========================================

const ACTIVE_ORDER_KEY = "menuflow_active_order"
const FINAL_STATUSES = ["delivered", "cancelled"]
const POLL_INTERVAL_MS = 4000

// أسباب إلغاء الطلب (العميل بيختار واحد منها)
const CANCEL_REASONS = [
  "غيّرت رأيي",
  "طلبت بالغلط",
  "عايز أعدّل في الطلب وأطلب من جديد",
  "مش هقدر أستلم الطلب",
  "سبب آخر",
]

const OTHER_CANCEL_REASON = "سبب آخر"
const MAX_TRACK_AGE_MS = 12 * 60 * 60 * 1000

const readActiveOrder = () => {
  try {
    const raw = localStorage.getItem(ACTIVE_ORDER_KEY)
    if (!raw) return null

    const order = JSON.parse(raw)

    if (
      !order?.id ||
      Date.now() - (order.createdAt || 0) > MAX_TRACK_AGE_MS
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
    localStorage.setItem(ACTIVE_ORDER_KEY, JSON.stringify(order))
  } catch {
    // التخزين غير متاح (وضع خاص مثلًا) — التتبع يشتغل بدون استرجاع بعد التحديث
  }
}

const removeActiveOrder = () => {
  try {
    localStorage.removeItem(ACTIVE_ORDER_KEY)
  } catch {
    // ignore
  }
}

// خطوات التتبع حسب نوع الطلب (نفس مسميات لوحة الأدمن)
const getTrackingSteps = (orderType) => {
  const isDineIn = orderType === "dine-in"
  const isPickup = orderType === "pickup"

  return [
    { status: "pending", label: "تم استلام طلبك" },
    {
      status: "processing",
      label: isDineIn ? "جاري التحضير" : "جاري التجهيز",
    },
    {
      status: "shipped",
      label: isPickup
        ? "جاهز للاستلام"
        : isDineIn
          ? "جاهز"
          : "خرج للتوصيل",
    },
    {
      status: "delivered",
      label: isPickup
        ? "تم الاستلام"
        : isDineIn
          ? "تم التقديم"
          : "تم التسليم",
    },
  ]
}

const getStatusHeadline = (status, orderType) => {
  if (status === "processing") {
    return orderType === "dine-in"
      ? "بنحضّر طلبك 👨‍🍳"
      : "بنجهّز طلبك 👨‍🍳"
  }

  if (status === "shipped") {
    if (orderType === "pickup") return "طلبك جاهز للاستلام ✅"
    if (orderType === "dine-in") return "طلبك جاهز ✅"
    return "طلبك في الطريق إليك 🛵"
  }

  if (status === "delivered") return "بالهنا والشفا 🍽️"
  if (status === "cancelled") return "تم إلغاء الطلب"

  return "تم استلام طلبك 🎉"
}

function App() {
  const [selectedCategory, setSelectedCategory] =
    useState("الكل")

  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  const [orderType, setOrderType] = useState(null)

  const [showReview, setShowReview] = useState(false)

  // الطلب اللي العميل بيتابعه
  const [trackedOrder, setTrackedOrder] =
    useState(readActiveOrder)

  const [orderStatus, setOrderStatus] = useState(null)

  // إلغاء الطلب من العميل
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelNote, setCancelNote] = useState("")
  const [isCancelling, setIsCancelling] = useState(false)

  const [orderSuccess, setOrderSuccess] =
    useState(() => readActiveOrder() !== null)

  const [isSubmitting, setIsSubmitting] = useState(false)

  // ========================================
  // المنتجات والتصنيفات (من Supabase)
  // ========================================

  const [products, setProducts] = useState([])
  const [dbCategories, setDbCategories] = useState([])
  const [isLoadingMenu, setIsLoadingMenu] = useState(true)
  const [menuError, setMenuError] = useState(false)
  const [search, setSearch] = useState("")

  const [menuReloadKey, setMenuReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const loadMenu = async () => {
      const [productsRes, categoriesRes] =
        await Promise.all([
          supabase
            .from("products")
            .select("*")
            .order("created_at", { ascending: true }),
          supabase
            .from("categories")
            .select("*")
            .order("created_at", { ascending: true }),
        ])

      if (cancelled) return

      if (productsRes.error || categoriesRes.error) {
        console.error(
          "Menu load error:",
          productsRes.error || categoriesRes.error,
        )
        setMenuError(true)
        setProducts([])
        setDbCategories([])
      } else {
        setProducts(productsRes.data || [])
        setDbCategories(categoriesRes.data || [])
      }

      setIsLoadingMenu(false)
    }

    loadMenu()

    return () => {
      cancelled = true
    }
  }, [menuReloadKey])

  const retryLoadMenu = () => {
    setIsLoadingMenu(true)
    setMenuError(false)
    setMenuReloadKey((key) => key + 1)
  }

  // "الكل" + التصنيفات اللي فيها منتجات فعلًا
  const categories = [
    { id: "all", name: "الكل" },
    ...dbCategories.filter((category) =>
      products.some(
        (product) => product.category === category.name,
      ),
    ),
  ]

  // ========================================
  // إعدادات المطعم ومناطق التوصيل
  // ========================================

  const [restaurantSettings, setRestaurantSettings] = useState(null)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [deliveryAreas, setDeliveryAreas] = useState([])
  const [isLoadingDeliveryAreas, setIsLoadingDeliveryAreas] = useState(true)

  // قراءة رقم الطاولة من QR
  const tableNumber = (() => {
    const params = new URLSearchParams(window.location.search)
    const value = params.get("table")
    if (!value || !/^\d+$/.test(value)) return null
    const number = Number(value)
    return number > 0 ? number : null
  })()

  const isDineInQr = tableNumber !== null
  const [tableInfo, setTableInfo] = useState(null)
  const [isCheckingTable, setIsCheckingTable] = useState(isDineInQr)

  // بيانات العميل
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    deliveryArea: "",
    address: "",
    notes: "",
    paymentMethod: "",
  })

  useEffect(() => {
    const loadRestaurantSettings = async () => {
      setIsLoadingSettings(true)
      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("*")
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error("Restaurant settings error:", error)
        setRestaurantSettings(null)
      } else {
        setRestaurantSettings(data)
      }
      setIsLoadingSettings(false)
    }

    loadRestaurantSettings()
  }, [])

  useEffect(() => {
    const loadDeliveryAreas = async () => {
      setIsLoadingDeliveryAreas(true)
      const { data, error } = await supabase
        .from("delivery_areas")
        .select("id, name, price")
        .eq("is_active", true)
        .order("name", { ascending: true })

      if (error) {
        console.error("Delivery areas error:", error)
        setDeliveryAreas([])
      } else {
        setDeliveryAreas(data || [])
      }
      setIsLoadingDeliveryAreas(false)
    }

    loadDeliveryAreas()
  }, [])

  useEffect(() => {
    const checkTable = async () => {
      if (!isDineInQr) {
        setTableInfo(null)
        setIsCheckingTable(false)
        return
      }

      setIsCheckingTable(true)
      const { data, error } = await supabase
        .from("tables")
        .select("id, table_number, name, capacity, is_active")
        .eq("table_number", tableNumber)
        .maybeSingle()

      if (error) {
        console.error("Table check error:", error)
        setTableInfo(null)
      } else {
        setTableInfo(data || null)
      }
      setIsCheckingTable(false)
    }

    checkTable()
  }, [tableNumber, isDineInQr])

  const isValidDineInTable =
    isDineInQr &&
    !isCheckingTable &&
    tableInfo &&
    tableInfo.is_active === true

  // بيانات إعدادات المطعم
  const restaurantName = restaurantSettings?.restaurant_name || "MenuFlow"
  const restaurantDescription = restaurantSettings?.description || ""
  const restaurantPhone = restaurantSettings?.phone || ""
  const restaurantAddress = restaurantSettings?.address || ""
  const restaurantLogo = restaurantSettings?.logo_url || ""
  const restaurantCover = restaurantSettings?.cover_url || ""

  const overlay = getHeaderOverlay(
    restaurantSettings?.header_color,
    restaurantSettings?.header_opacity,
  )

  const hasCustomHeaderColor = Boolean(restaurantSettings?.header_color)
  const solidHeader = !restaurantCover && hasCustomHeaderColor
  const isColoredHeader = Boolean(restaurantCover) || solidHeader

  const settingsName = restaurantSettings?.restaurant_name

  useEffect(() => {
    applyBranding({
      title: settingsName,
      iconUrl: restaurantLogo,
    })
  }, [settingsName, restaurantLogo])

  const isRestaurantOpen = restaurantSettings?.is_open ?? true
  const closedMessage = restaurantSettings?.closed_message || "المطعم مغلق حاليًا"
  const deliveryEnabled = restaurantSettings?.delivery_enabled ?? true
  const pickupEnabled = restaurantSettings?.pickup_enabled ?? true
  const dineInEnabled = restaurantSettings?.dine_in_enabled ?? true
  const cashPaymentEnabled = restaurantSettings?.cash_payment_enabled ?? true
  const onlinePaymentEnabled = restaurantSettings?.online_payment_enabled ?? false

  const primaryColor = restaurantSettings?.primary_color || "#000000"
  const backgroundColor = restaurantSettings?.background_color || "#f8f8f8"
  const cardColor = restaurantSettings?.card_color || "#ffffff"

  const selectedDeliveryArea = deliveryAreas.find(
    (area) => area.name === customerInfo.deliveryArea,
  )
  const deliveryPrice = selectedDeliveryArea?.price || 0

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "الكل" || product.category === selectedCategory
    const term = search.trim().toLowerCase()
    const matchesSearch =
      !term ||
      product.name?.toLowerCase().includes(term) ||
      product.description?.toLowerCase().includes(term)

    return matchesCategory && matchesSearch
  })

  // Cart Handlers
  const addToCart = (product) => {
    if (!isRestaurantOpen) {
      alert(closedMessage)
      return
    }

    if (product.is_available === false) {
      alert("هذا المنتج غير متاح حاليًا.")
      return
    }

    setCart((currentCart) => {
      const existingProduct = currentCart.find((item) => item.id === product.id)
      if (existingProduct) {
        return currentCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }
      return [...currentCart, { ...product, quantity: 1 }]
    })
  }

  const increaseQuantity = (productId) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === productId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    )
  }

  const decreaseQuantity = (productId) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0)
  const cartTotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  )
  const finalTotal =
    cartTotal + (orderType === "delivery" ? deliveryPrice : 0)

  const openOrderTypeSelector = () => {
    if (!isRestaurantOpen) {
      alert(closedMessage)
      return
    }
    if (cart.length === 0) {
      alert("السلة فارغة.")
      return
    }
    setOrderType("select")
  }

  const confirmOrder = async () => {
    if (isSubmitting) return
    if (!isRestaurantOpen) {
      alert(closedMessage)
      return
    }
    if (cart.length === 0) {
      alert("السلة فارغة.")
      return
    }

    setIsSubmitting(true)
    const newOrderId = crypto.randomUUID()
    const newOrderNumber = `MF-${Date.now().toString().slice(-6)}`

    const { error: orderError } = await supabase.from("orders").insert({
      id: newOrderId,
      order_number: newOrderNumber,
      order_type:
        orderType === "delivery"
          ? "delivery"
          : orderType === "pickup"
            ? "pickup"
            : "dine-in",
      table_number: orderType === "dine-in" ? tableNumber : null,
      customer_name:
        orderType === "dine-in" ? null : customerInfo.name.trim() || null,
      customer_phone:
        orderType === "dine-in" ? null : customerInfo.phone.trim() || null,
      delivery_area:
        orderType === "delivery" ? customerInfo.deliveryArea || null : null,
      address:
        orderType === "delivery" ? customerInfo.address.trim() || null : null,
      notes: customerInfo.notes.trim() || null,
      payment_method:
        orderType === "delivery" ? customerInfo.paymentMethod : null,
      products_total: cartTotal,
      delivery_price: orderType === "delivery" ? deliveryPrice : 0,
      total_price: finalTotal,
      status: "pending",
    })

    if (orderError) {
      console.error("Order insert error:", orderError)
      alert(`حصل خطأ أثناء إنشاء الطلب:\n${orderError.message}`)
      setIsSubmitting(false)
      return
    }

    const orderItems = cart.map((item) => ({
      order_id: newOrderId,
      product_id: item.id,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
    }))

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems)

    if (itemsError) {
      console.error("Order items insert error:", itemsError)
      alert(`تم إنشاء الطلب لكن حصل خطأ في حفظ المنتجات:\n${itemsError.message}`)
      setIsSubmitting(false)
      return
    }

    const newTrackedOrder = {
      id: newOrderId,
      number: newOrderNumber,
      type: orderType,
      table: orderType === "dine-in" ? tableNumber : null,
      name: orderType === "pickup" ? customerInfo.name.trim() : "",
      phone: orderType === "pickup" ? customerInfo.phone.trim() : "",
      createdAt: Date.now(),
    }

    saveActiveOrder(newTrackedOrder)
    setTrackedOrder(newTrackedOrder)
    setOrderStatus("pending")
    setCart([])
    setShowReview(false)
    setOrderType(null)
    setOrderSuccess(true)
    setIsSubmitting(false)
  }

  const isTrackingFinished = FINAL_STATUSES.includes(orderStatus)
  const trackedOrderId = trackedOrder?.id

  useEffect(() => {
    if (!trackedOrderId || isTrackingFinished) return
    let cancelled = false

    const fetchStatus = async () => {
      const { data, error } = await supabase.rpc("get_order_status", {
        p_order_id: trackedOrderId,
      })

      if (cancelled) return
      if (error) {
        console.error("Order status error:", error)
        return
      }

      const row = Array.isArray(data) ? data[0] : data
      if (!row) {
        removeActiveOrder()
        setTrackedOrder(null)
        setOrderStatus(null)
        setOrderSuccess(false)
        return
      }
      setOrderStatus(row.status)
    }

    fetchStatus()
    const interval = setInterval(() => {
      if (!document.hidden) fetchStatus()
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [trackedOrderId, isTrackingFinished])

  if (isLoadingSettings) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center bg-gray-50"
      >
        <div className="text-center">
          <div className="text-4xl mb-4">🍽️</div>
          <div className="font-bold text-lg">جاري تحميل المنيو...</div>
          <p className="text-sm opacity-60 mt-2">لحظات من فضلك</p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        "--color-primary": primaryColor,
        "--color-background": backgroundColor,
        "--color-card": cardColor,
        "--color-text": "#171717",
      }}
      className="min-h-screen bg-(--color-background) text-(--color-text) overflow-x-clip"
    >
      {/* Header */}
      <header
        className="relative bg-(--color-card) border-b overflow-hidden"
        style={
          solidHeader
            ? {
              backgroundColor: overlay.solidColor,
              color: overlay.textColor,
            }
            : undefined
        }
      >
        {restaurantCover && (
          <img
            src={restaurantCover}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        <div
          className={`relative max-w-md md:max-w-3xl lg:max-w-6xl mx-auto px-4 ${restaurantCover
              ? "pt-28 md:pt-44 lg:pt-60 pb-4 md:pb-6"
              : "py-5 md:py-8"
            }`}
        >
          <div
            className={
              restaurantCover
                ? "rounded-2xl p-4 md:p-5 backdrop-blur-sm w-full md:w-fit md:min-w-96 md:max-w-xl"
                : ""
            }
            style={
              restaurantCover
                ? {
                  backgroundColor: overlay.backgroundColor,
                  color: overlay.textColor,
                }
                : undefined
            }
          >
            <div className="flex items-center gap-3 md:gap-4">
              <div
                className={`w-14 h-14 md:w-20 md:h-20 rounded-full bg-(--color-primary) text-white flex items-center justify-center overflow-hidden shrink-0 ${isColoredHeader ? "ring-2 ring-white/70" : ""
                  }`}
              >
                {restaurantLogo ? (
                  <img
                    src={restaurantLogo}
                    alt={restaurantName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl md:text-3xl font-bold">
                    {restaurantName.charAt(0)}
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <h1 className="text-xl md:text-3xl font-bold wrap-break-word">
                  {restaurantName}
                </h1>
                <p className="text-sm font-medium mt-1">
                  ● {isRestaurantOpen ? "مفتوح الآن" : "مغلق الآن"}
                </p>
              </div>
            </div>

            {restaurantDescription && (
              <p className="mt-3 text-sm opacity-80">{restaurantDescription}</p>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md md:max-w-3xl lg:max-w-6xl mx-auto px-4 py-6">
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث عن وجبة أو مشروب..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-(--color-card) border rounded-2xl py-3 pr-10 pl-4 outline-none text-sm"
            />
            <span className="absolute right-3.5 top-3.5 text-gray-400">🔍</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all font-medium ${selectedCategory === cat.name
                    ? "bg-(--color-primary) text-white shadow-md"
                    : "bg-(--color-card) border text-gray-600"
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {filteredProducts.map((product) => {
            const cartItem = cart.find((item) => item.id === product.id)
            const quantity = cartItem ? cartItem.quantity : 0

            return (
              <div
                key={product.id}
                className="bg-(--color-card) border rounded-2xl p-4 flex gap-4 items-center justify-between shadow-xs"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base truncate">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                      {product.description}
                    </p>
                  )}
                  <p className="font-bold text-sm text-(--color-primary) mt-2">
                    {product.price} ج.م
                  </p>
                </div>

                <div className="flex flex-col items-center gap-1">
                  {quantity > 0 ? (
                    <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1 border">
                      <button
                        onClick={() => increaseQuantity(product.id)}
                        className="w-7 h-7 bg-white rounded-lg font-bold text-sm"
                      >
                        +
                      </button>
                      <span className="text-xs font-bold w-4 text-center">
                        {quantity}
                      </span>
                      <button
                        onClick={() => decreaseQuantity(product.id)}
                        className="w-7 h-7 bg-white rounded-lg font-bold text-sm text-red-500"
                      >
                        -
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(product)}
                      className="px-3 py-2 bg-(--color-primary) text-white rounded-xl text-xs font-bold"
                    >
                      إضافة +
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Floating Cart Button */}
      {cartItemsCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md md:max-w-xl mx-auto">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-(--color-primary) text-white rounded-2xl p-4 flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-2">
              <span className="bg-white/20 px-2.5 py-1 rounded-lg text-xs font-bold">
                {cartItemsCount}
              </span>
              <span className="font-bold text-sm">عرض السلة</span>
            </div>
            <span className="font-bold text-sm">{cartTotal} ج.م</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default App