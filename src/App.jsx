import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "./lib/supabase"
import { buildWhatsAppLink } from "./lib/whatsapp"
import { applyBranding, getHeaderOverlay } from "./lib/branding"

// ========================================
// تتبع حالة الطلب
// ========================================

const ACTIVE_ORDER_KEY = "menuflow_active_order"
const FINAL_STATUSES = ["delivered", "cancelled"]
const POLL_INTERVAL_MS = 4000

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
    // ignore
  }
}

const removeActiveOrder = () => {
  try {
    localStorage.removeItem(ACTIVE_ORDER_KEY)
  } catch {
    // ignore
  }
}

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
  const { slug } = useParams()

  const [selectedCategory, setSelectedCategory] = useState("الكل")

  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  const [orderType, setOrderType] = useState(null)

  const [showReview, setShowReview] = useState(false)

  const [trackedOrder, setTrackedOrder] = useState(readActiveOrder)

  const [orderStatus, setOrderStatus] = useState(null)
  const [isTrackingOpen, setIsTrackingOpen] = useState(
    () => readActiveOrder() !== null,
  )

  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelNote, setCancelNote] = useState("")
  const [isCancelling, setIsCancelling] = useState(false)

  const [orderSuccess, setOrderSuccess] = useState(
    () => readActiveOrder() !== null,
  )

  const [isSubmitting, setIsSubmitting] = useState(false)

  // ========================================
  // المطعم
  // ========================================

  const [restaurantRow, setRestaurantRow] = useState(null)
  const [isLoadingRestaurant, setIsLoadingRestaurant] = useState(true)
  const [restaurantNotFound, setRestaurantNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadRestaurant = async () => {
      setIsLoadingRestaurant(true)
      setRestaurantNotFound(false)

      const { data, error } = await supabase
        .from("restaurants")
        .select("id, slug, name, phone, is_active")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle()

      if (cancelled) return

      if (error || !data) {
        if (error) console.error("Restaurant load error:", error)
        setRestaurantRow(null)
        setRestaurantNotFound(true)
      } else {
        setRestaurantRow(data)
      }

      setIsLoadingRestaurant(false)
    }

    loadRestaurant()

    return () => {
      cancelled = true
    }
  }, [slug])

  const restaurantId = restaurantRow?.id || null

  // ========================================
  // المنتجات والتصنيفات
  // ========================================

  const [products, setProducts] = useState([])
  const [dbCategories, setDbCategories] = useState([])
  const [isLoadingMenu, setIsLoadingMenu] = useState(true)
  const [menuError, setMenuError] = useState(false)
  const [search, setSearch] = useState("")

  const [menuReloadKey, setMenuReloadKey] = useState(0)

  useEffect(() => {
    if (!restaurantId) return

    let cancelled = false

    const loadMenu = async () => {
      setIsLoadingMenu(true)

      const [productsRes, categoriesRes] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .order("created_at", { ascending: true }),

        supabase
          .from("categories")
          .select("*")
          .eq("restaurant_id", restaurantId)
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
        setMenuError(false)
      }

      setIsLoadingMenu(false)
    }

    loadMenu()

    return () => {
      cancelled = true
    }
  }, [restaurantId, menuReloadKey])

  const retryLoadMenu = () => {
    setIsLoadingMenu(true)
    setMenuError(false)
    setMenuReloadKey((key) => key + 1)
  }

  const categories = [
    { id: "all", name: "الكل" },
    ...dbCategories.filter((category) =>
      products.some((product) => product.category === category.name),
    ),
  ]

  // ========================================
  // إعدادات المطعم
  // ========================================

  const [restaurantSettings, setRestaurantSettings] = useState(null)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)

  const [deliveryAreas, setDeliveryAreas] = useState([])
  const [isLoadingDeliveryAreas, setIsLoadingDeliveryAreas] = useState(true)

  // ========================================
  // QR الطاولة
  // ========================================

  const tableNumber = (() => {
    const params = new URLSearchParams(window.location.search)
    const value = params.get("table")

    if (!value || !/^\d+$/.test(value)) return null

    const number = Number(value)

    return number > 0 ? number : null
  })()

  const isDineInQr = tableNumber !== null

  const [tableInfo, setTableInfo] = useState(null)
  const [isCheckingTable, setIsCheckingTable] =
    useState(isDineInQr)

  // ========================================
  // بيانات العميل
  // ========================================

  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    deliveryArea: "",
    address: "",
    notes: "",
    paymentMethod: "",
  })

  const updateCustomerInfo = (field, value) => {
    setCustomerInfo((current) => ({
      ...current,
      [field]: value,
    }))
  }

  // ========================================
  // تحميل إعدادات المطعم
  // ========================================

  useEffect(() => {
    if (!restaurantId) return

    let cancelled = false

    const loadRestaurantSettings = async () => {
      setIsLoadingSettings(true)

      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .limit(1)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error("Restaurant settings error:", error)
        setRestaurantSettings(null)
      } else {
        setRestaurantSettings(data)
      }

      setIsLoadingSettings(false)
    }

    loadRestaurantSettings()

    return () => {
      cancelled = true
    }
  }, [restaurantId])

  // ========================================
  // مناطق التوصيل
  // ========================================

  useEffect(() => {
    if (!restaurantId) return

    let cancelled = false

    const loadDeliveryAreas = async () => {
      setIsLoadingDeliveryAreas(true)

      const { data, error } = await supabase
        .from("delivery_areas")
        .select("id, name, price")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("name", { ascending: true })

      if (cancelled) return

      if (error) {
        console.error("Delivery areas error:", error)
        setDeliveryAreas([])
      } else {
        setDeliveryAreas(data || [])
      }

      setIsLoadingDeliveryAreas(false)
    }

    loadDeliveryAreas()

    return () => {
      cancelled = true
    }
  }, [restaurantId])

  // ========================================
  // التحقق من الطاولة
  // ========================================

  useEffect(() => {
    const checkTable = async () => {
      if (!isDineInQr || !restaurantId) {
        setTableInfo(null)
        setIsCheckingTable(false)
        return
      }

      setIsCheckingTable(true)

      const { data, error } = await supabase
        .from("tables")
        .select("id, table_number, name, capacity, is_active")
        .eq("restaurant_id", restaurantId)
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
  }, [tableNumber, isDineInQr, restaurantId])

  const isValidDineInTable =
    isDineInQr &&
    !isCheckingTable &&
    tableInfo &&
    tableInfo.is_active === true

  // ========================================
  // بيانات المطعم
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

  const hasCustomHeaderColor =
    Boolean(restaurantSettings?.header_color)

  const solidHeader =
    !restaurantCover && hasCustomHeaderColor

  const isColoredHeader =
    Boolean(restaurantCover) || solidHeader

  const settingsName =
    restaurantSettings?.restaurant_name

  useEffect(() => {
    applyBranding({
      title: settingsName || restaurantRow?.name,
      iconUrl: restaurantLogo,
    })
  }, [settingsName, restaurantLogo, restaurantRow?.name])

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

  const canDineIn =
    dineInEnabled && isValidDineInTable

  const primaryColor =
    restaurantSettings?.primary_color || "#000000"

  const backgroundColor =
    restaurantSettings?.background_color || "#f8f8f8"

  const cardColor =
    restaurantSettings?.card_color || "#ffffff"

  const selectedDeliveryArea = deliveryAreas.find(
    (area) =>
      area.name === customerInfo.deliveryArea,
  )

  const deliveryPrice =
    selectedDeliveryArea?.price || 0

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "الكل" ||
      product.category === selectedCategory

    const term = search.trim().toLowerCase()

    const matchesSearch =
      !term ||
      product.name?.toLowerCase().includes(term) ||
      product.description?.toLowerCase().includes(term)

    return matchesCategory && matchesSearch
  })

  // ========================================
  // Cart
  // ========================================

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
      const existingProduct = currentCart.find(
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

  const increaseQuantity = (productId) => {
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

  const decreaseQuantity = (productId) => {
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
        .filter((item) => item.quantity > 0),
    )
  }

  const cartItemsCount = cart.reduce(
    (total, item) => total + item.quantity,
    0,
  )

  const cartTotal = cart.reduce(
    (total, item) =>
      total + item.price * item.quantity,
    0,
  )

  const finalTotal =
    cartTotal +
    (orderType === "delivery"
      ? deliveryPrice
      : 0)

  // ========================================
  // Order Flow
  // ========================================

  const openOrderTypeSelector = () => {
    if (!isRestaurantOpen) {
      alert(closedMessage)
      return
    }

    if (cart.length === 0) {
      alert("السلة فارغة.")
      return
    }

    setIsCartOpen(false)
    setShowReview(false)
    setOrderType("select")
  }

  const selectOrderType = (type) => {
    setOrderType(type)
    setShowReview(false)

    if (
      type === "delivery" &&
      !onlinePaymentEnabled &&
      cashPaymentEnabled
    ) {
      updateCustomerInfo(
        "paymentMethod",
        "cash",
      )
    } else if (
      type === "delivery" &&
      onlinePaymentEnabled &&
      !cashPaymentEnabled
    ) {
      updateCustomerInfo(
        "paymentMethod",
        "online",
      )
    }
  }

  const backToTypeSelect = () => {
    setOrderType("select")
    setShowReview(false)
  }

  const closeOrderFlow = () => {
    setOrderType(null)
    setShowReview(false)
  }

  const validateOrderForm = () => {
    if (orderType === "delivery") {
      if (!customerInfo.name.trim())
        return "من فضلك اكتب اسمك."

      if (!customerInfo.phone.trim())
        return "من فضلك اكتب رقم موبايلك."

      if (!customerInfo.deliveryArea)
        return "من فضلك اختر منطقة التوصيل."

      if (!customerInfo.address.trim())
        return "من فضلك اكتب عنوانك بالتفصيل."

      if (!customerInfo.paymentMethod)
        return "من فضلك اختر طريقة الدفع."
    }

    if (orderType === "pickup") {
      if (!customerInfo.name.trim())
        return "من فضلك اكتب اسمك."

      if (!customerInfo.phone.trim())
        return "من فضلك اكتب رقم موبايلك."
    }

    if (
      orderType === "dine-in" &&
      !canDineIn
    ) {
      return "لازم تكون ماسح كود QR على طاولتك عشان تطلب داخل المطعم."
    }

    return null
  }

  const proceedToReview = () => {
    const errorMessage =
      validateOrderForm()

    if (errorMessage) {
      alert(errorMessage)
      return
    }

    setShowReview(true)
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

    if (!restaurantId) {
      alert(
        "تعذر تحديد المطعم، من فضلك أعد تحميل الصفحة.",
      )
      return
    }

    const errorMessage =
      validateOrderForm()

    if (errorMessage) {
      alert(errorMessage)
      return
    }

    setIsSubmitting(true)

    const newOrderId =
      crypto.randomUUID()

    const newOrderNumber =
      `MF-${Date.now()
        .toString()
        .slice(-6)}`

    const { error: orderError } =
      await supabase
        .from("orders")
        .insert({
          id: newOrderId,
          restaurant_id: restaurantId,
          order_number: newOrderNumber,
          order_type:
            orderType === "delivery"
              ? "delivery"
              : orderType === "pickup"
                ? "pickup"
                : "dine-in",
          table_number:
            orderType === "dine-in"
              ? tableNumber
              : null,
          customer_name:
            orderType === "dine-in"
              ? null
              : customerInfo.name.trim() ||
                null,
          customer_phone:
            orderType === "dine-in"
              ? null
              : customerInfo.phone.trim() ||
                null,
          delivery_area:
            orderType === "delivery"
              ? customerInfo.deliveryArea ||
                null
              : null,
          address:
            orderType === "delivery"
              ? customerInfo.address.trim() ||
                null
              : null,
          notes:
            customerInfo.notes.trim() ||
            null,
          payment_method:
            orderType === "delivery"
              ? customerInfo.paymentMethod
              : null,
          products_total: cartTotal,
          delivery_price:
            orderType === "delivery"
              ? deliveryPrice
              : 0,
          total_price: finalTotal,
          status: "pending",
        })

    if (orderError) {
      console.error(
        "Order insert error:",
        orderError,
      )

      alert(
        `حصل خطأ أثناء إنشاء الطلب:\n${orderError.message}`,
      )

      setIsSubmitting(false)
      return
    }

    const orderItems = cart.map(
      (item) => ({
        order_id: newOrderId,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price:
          item.price * item.quantity,
      }),
    )

    const { error: itemsError } =
      await supabase
        .from("order_items")
        .insert(orderItems)

    if (itemsError) {
      console.error(
        "Order items insert error:",
        itemsError,
      )

      alert(
        `تم إنشاء الطلب لكن حصل خطأ في حفظ المنتجات:\n${itemsError.message}`,
      )

      setIsSubmitting(false)
      return
    }

    const newTrackedOrder = {
      id: newOrderId,
      number: newOrderNumber,
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
    setShowReview(false)
    setOrderType(null)
    setOrderSuccess(true)
    setIsTrackingOpen(true)
    setIsSubmitting(false)
  }

  // ========================================
  // Tracking
  // ========================================

  const isTrackingFinished =
    FINAL_STATUSES.includes(
      orderStatus,
    )

  const trackedOrderId =
    trackedOrder?.id

  useEffect(() => {
    if (
      !trackedOrderId ||
      isTrackingFinished
    )
      return

    let cancelled = false

    const fetchStatus = async () => {
      const { data, error } =
        await supabase.rpc(
          "get_order_status",
          {
            p_order_id:
              trackedOrderId,
          },
        )

      if (cancelled) return

      if (error) {
        console.error(
          "Order status error:",
          error,
        )
        return
      }

      const row =
        Array.isArray(data)
          ? data[0]
          : data

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

    const interval = setInterval(
      () => {
        if (!document.hidden)
          fetchStatus()
      },
      POLL_INTERVAL_MS,
    )

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [
    trackedOrderId,
    isTrackingFinished,
  ])

  // ========================================
  // Cancel Order
  // ========================================

  const cancelOrder = async () => {
    if (
      !trackedOrderId ||
      isCancelling
    )
      return

    if (!cancelReason) {
      alert(
        "من فضلك اختر سبب الإلغاء.",
      )
      return
    }

    if (
      cancelReason ===
        OTHER_CANCEL_REASON &&
      !cancelNote.trim()
    ) {
      alert(
        "من فضلك اكتب سبب الإلغاء.",
      )
      return
    }

    setIsCancelling(true)

    const { error } =
      await supabase
        .from("orders")
        .update({
          status: "cancelled",
          cancelled_by: "customer",
          cancel_reason:
            cancelReason ===
            OTHER_CANCEL_REASON
              ? cancelNote.trim()
              : cancelReason,
          cancelled_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          trackedOrderId,
        )

    if (error) {
      console.error(
        "Cancel order error:",
        error,
      )

      alert(
        `تعذر إلغاء الطلب:\n${error.message}`,
      )

      setIsCancelling(false)
      return
    }

    setOrderStatus(
      "cancelled",
    )

    setShowCancel(false)
    setCancelReason("")
    setCancelNote("")
    setIsCancelling(false)
  }

  const startNewOrder = () => {
    removeActiveOrder()

    setTrackedOrder(null)
    setOrderStatus(null)
    setOrderSuccess(false)
    setIsTrackingOpen(false)

    setCustomerInfo({
      name: "",
      phone: "",
      deliveryArea: "",
      address: "",
      notes: "",
      paymentMethod: "",
    })
  }

  const whatsappContactLink =
    restaurantPhone
      ? buildWhatsAppLink(
          restaurantPhone,
          `مرحباً، عندي استفسار بخصوص ${restaurantName} 🙋`,
        )
      : ""

  // ========================================
  // Loading
  // ========================================

  if (isLoadingRestaurant) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center bg-gray-50"
      >
        <div className="text-center">
          <div className="text-4xl mb-4">
            🍽️
          </div>

          <div className="font-bold text-lg">
            جاري تحميل المنيو...
          </div>

          <p className="text-sm opacity-60 mt-2">
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
        className="min-h-screen flex items-center justify-center bg-gray-50 p-6"
      >
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">
            🚫
          </div>

          <h1 className="font-bold text-lg">
            المطعم غير موجود
          </h1>

          <p className="text-sm opacity-60 mt-2">
            الرابط ده مش شغال أو المطعم
            متوقف حاليًا. تأكد من الرابط
            وجرّب تاني.
          </p>
        </div>
      </div>
    )
  }

  if (isLoadingSettings) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center bg-gray-50"
      >
        <div className="text-center">
          <div className="text-4xl mb-4">
            🍽️
          </div>

          <div className="font-bold text-lg">
            جاري تحميل المنيو...
          </div>

          <p className="text-sm opacity-60 mt-2">
            لحظات من فضلك
          </p>
        </div>
      </div>
    )
  }

  const trackingSteps = trackedOrder
    ? getTrackingSteps(
        trackedOrder.type,
      )
    : []

  const currentStepIndex =
    trackingSteps.findIndex(
      (step) =>
        step.status ===
        orderStatus,
    )

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
      className="min-h-screen bg-(--color-background) text-(--color-text) overflow-x-clip"
    >
      {/* ========================================
          HEADER
      ======================================== */}

      <header
        className="relative overflow-hidden bg-(--color-card) border-b"
        style={
          solidHeader
            ? {
                backgroundColor:
                  overlay.solidColor,
                color:
                  overlay.textColor,
              }
            : undefined
        }
      >
        {restaurantCover && (
          <>
            <img
              src={restaurantCover}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />

            <div
              className="absolute inset-0"
              style={{
                backgroundColor:
                  overlay.backgroundColor,
              }}
            />
          </>
        )}

        <div
          className={`relative max-w-md md:max-w-3xl lg:max-w-6xl mx-auto px-4 ${
            restaurantCover
              ? "pt-28 md:pt-44 lg:pt-56 pb-5"
              : "py-6 md:py-9"
          }`}
        >
          <div
            className={
              restaurantCover
                ? "rounded-3xl p-4 md:p-6 backdrop-blur-md w-full md:w-fit md:min-w-[380px] md:max-w-xl border border-white/20 shadow-xl"
                : ""
            }
            style={
              restaurantCover
                ? {
                    backgroundColor:
                      overlay.backgroundColor,
                    color:
                      overlay.textColor,
                  }
                : undefined
            }
          >
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div
                className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-(--color-primary) text-white flex items-center justify-center overflow-hidden shrink-0 shadow-lg ${
                  isColoredHeader
                    ? "ring-2 ring-white/80"
                    : ""
                }`}
              >
                {restaurantLogo ? (
                  <img
                    src={restaurantLogo}
                    alt={restaurantName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl md:text-3xl font-black">
                    {restaurantName.charAt(
                      0,
                    )}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="text-2xl md:text-3xl font-black wrap-break-word leading-tight">
                  {restaurantName}
                </h1>

                {/* حالة المطعم */}
                <div className="mt-2 inline-flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      isRestaurantOpen
                        ? "bg-green-500 shadow-[0_0_0_4px_rgba(34,197,94,0.15)]"
                        : "bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.15)]"
                    }`}
                  />

                  <span
                    className={`text-sm font-bold ${
                      isRestaurantOpen
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {isRestaurantOpen
                      ? "مفتوح الآن"
                      : "مغلق الآن"}
                  </span>
                </div>
              </div>
            </div>

            {restaurantDescription && (
              <p className="mt-4 text-sm leading-6 opacity-80">
                {restaurantDescription}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Closed Message */}
      {!isRestaurantOpen && (
        <div className="bg-red-50 text-red-700 border-b border-red-100 text-center py-3 px-4">
          <div className="flex items-center justify-center gap-2 text-sm font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>{closedMessage}</span>
          </div>
        </div>
      )}

      {/* ========================================
          MAIN
      ======================================== */}

      <main className="max-w-md md:max-w-3xl lg:max-w-6xl mx-auto px-4 py-6 md:py-8">

        {/* Search + Categories */}
        <div className="space-y-4">

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث عن وجبة أو مشروب..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="w-full bg-(--color-card) border border-black/5 rounded-2xl py-3.5 pr-11 pl-4 outline-none text-sm shadow-sm focus:ring-2 focus:ring-(--color-primary)/20 transition"
            />

            <span className="absolute right-4 top-3.5 text-gray-400 text-lg">
              🔍
            </span>
          </div>

          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map(
              (cat) => (
                <button
                  key={cat.id}
                  onClick={() =>
                    setSelectedCategory(
                      cat.name,
                    )
                  }
                  className={`px-5 py-2.5 rounded-full text-sm whitespace-nowrap transition-all font-bold shrink-0 ${
                    selectedCategory ===
                    cat.name
                      ? "bg-(--color-primary) text-white shadow-md"
                      : "bg-(--color-card) border border-black/5 text-gray-600 hover:border-(--color-primary)/30"
                  }`}
                >
                  {cat.name}
                </button>
              ),
            )}
          </div>
        </div>

        {/* ========================================
            Products
        ======================================== */}

        {isLoadingMenu ? (
          <div className="text-center py-20 opacity-60">
            جاري تحميل المنتجات...
          </div>
        ) : menuError ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">
              ⚠️
            </div>

            <p className="opacity-70 mb-4">
              تعذر تحميل المنيو.
            </p>

            <button
              onClick={retryLoadMenu}
              className="px-5 py-2.5 rounded-xl bg-(--color-primary) text-white text-sm font-bold"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : filteredProducts.length ===
          0 ? (
          <div className="text-center py-20 opacity-60">
            <div className="text-4xl mb-3">
              🍽️
            </div>
            لا توجد منتجات مطابقة.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
            {filteredProducts.map(
              (product) => {
                const cartItem =
                  cart.find(
                    (item) =>
                      item.id ===
                      product.id,
                  )

                const quantity =
                  cartItem
                    ? cartItem.quantity
                    : 0

                const isUnavailable =
                  product.is_available ===
                  false

                return (
                  <div
                    key={product.id}
                    className={`group bg-(--color-card) border border-black/5 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all ${
                      isUnavailable
                        ? "opacity-60"
                        : ""
                    }`}
                  >
                    {/* Product Image */}
                    {product.image_url ? (
                      <div className="relative w-full h-48 overflow-hidden bg-gray-100">
                        <img
                          src={
                            product.image_url
                          }
                          alt={
                            product.name
                          }
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {isUnavailable && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="bg-white text-red-600 px-3 py-1.5 rounded-full text-xs font-bold">
                              غير متاح
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-32 bg-(--color-background) flex items-center justify-center text-4xl">
                        🍽️
                      </div>
                    )}

                    {/* Product Content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-black text-base leading-6">
                            {product.name}
                          </h3>

                          {product.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 mt-1.5 leading-5">
                              {
                                product.description
                              }
                            </p>
                          )}
                        </div>

                        <span className="font-black text-sm text-(--color-primary) whitespace-nowrap">
                          {product.price}{" "}
                          ج.م
                        </span>
                      </div>

                      {/* Add / Quantity */}
                      <div className="mt-4">
                        {isUnavailable ? (
                          <div className="w-full bg-red-50 text-red-500 rounded-xl py-2.5 text-center text-xs font-bold">
                            غير متاح حاليًا
                          </div>
                        ) : quantity > 0 ? (
                          <div className="flex items-center justify-between bg-(--color-background) rounded-xl p-1 border">
                            <button
                              onClick={() =>
                                increaseQuantity(
                                  product.id,
                                )
                              }
                              className="w-9 h-9 bg-(--color-card) rounded-lg font-black text-lg shadow-sm"
                            >
                              +
                            </button>

                            <span className="text-sm font-black">
                              {quantity}
                            </span>

                            <button
                              onClick={() =>
                                decreaseQuantity(
                                  product.id,
                                )
                              }
                              className="w-9 h-9 bg-(--color-card) rounded-lg font-black text-lg text-red-500 shadow-sm"
                            >
                              −
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              addToCart(
                                product,
                              )
                            }
                            className="w-full py-2.5 bg-(--color-primary) text-white rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition"
                          >
                            إضافة للطلب +
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              },
            )}
          </div>
        )}
      </main>

      {/* ========================================
          Floating Actions
      ======================================== */}

      <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md md:max-w-xl mx-auto space-y-2">

        {trackedOrder &&
          !isTrackingOpen && (
            <button
              onClick={() =>
                setIsTrackingOpen(
                  true,
                )
              }
              className="w-full bg-(--color-card) border-2 border-(--color-primary) text-(--color-primary) rounded-2xl p-3.5 flex items-center justify-between shadow-lg font-bold text-sm"
            >
              <span>
                📦 تتبع طلبك{" "}
                {trackedOrder.number}
              </span>

              <span className="text-xs">
                {getStatusHeadline(
                  orderStatus,
                  trackedOrder.type,
                )}
              </span>
            </button>
          )}

        {cartItemsCount > 0 && (
          <button
            onClick={() =>
              setIsCartOpen(true)
            }
            className="w-full bg-(--color-primary) text-white rounded-2xl p-4 flex items-center justify-between shadow-xl"
          >
            <div className="flex items-center gap-2">
              <span className="bg-white/20 px-2.5 py-1 rounded-lg text-xs font-bold">
                {cartItemsCount}
              </span>

              <span className="font-bold text-sm">
                عرض السلة
              </span>
            </div>

            <span className="font-black text-sm">
              {cartTotal} ج.م
            </span>
          </button>
        )}
      </div>

      {/* WhatsApp */}
      {whatsappContactLink && (
        <a
          href={whatsappContactLink}
          target="_blank"
          rel="noreferrer"
          aria-label="تواصل عبر واتساب"
          className="fixed bottom-24 left-4 z-40 w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg text-2xl"
        >
          💬
        </a>
      )}

      {/* ========================================
          Cart Drawer
      ======================================== */}

      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() =>
              setIsCartOpen(false)
            }
          />

          <div className="relative bg-(--color-card) w-full md:max-w-md md:rounded-2xl rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-black text-lg">
                سلتك
              </h2>

              <button
                onClick={() =>
                  setIsCartOpen(false)
                }
                className="w-9 h-9 rounded-full hover:bg-(--color-background)"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-center opacity-60 py-10">
                  السلة فارغة.
                </p>
              ) : (
                cart.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 border-b pb-3"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">
                          {item.name}
                        </p>

                        <p className="text-xs opacity-60 mt-1">
                          {item.price} ج.م ×{" "}
                          {item.quantity}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1 border shrink-0">
                        <button
                          onClick={() =>
                            increaseQuantity(
                              item.id,
                            )
                          }
                          className="w-7 h-7 bg-white rounded-lg font-bold text-sm"
                        >
                          +
                        </button>

                        <span className="text-xs font-bold w-4 text-center">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() =>
                            decreaseQuantity(
                              item.id,
                            )
                          }
                          className="w-7 h-7 bg-white rounded-lg font-bold text-sm text-red-500"
                        >
                          -
                        </button>
                      </div>
                    </div>
                  ),
                )
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t space-y-3">
                <div className="flex items-center justify-between font-bold">
                  <span>
                    الإجمالي
                  </span>

                  <span>
                    {cartTotal} ج.م
                  </span>
                </div>

                <button
                  onClick={
                    openOrderTypeSelector
                  }
                  className="w-full bg-(--color-primary) text-white rounded-xl py-3 font-bold"
                >
                  متابعة الطلب
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================
          Order Flow
      ======================================== */}

      {orderType && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeOrderFlow}
          />

          <div className="relative bg-(--color-card) w-full md:max-w-md md:rounded-2xl rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-black text-lg">
                {orderType ===
                "select"
                  ? "اختر نوع الطلب"
                  : showReview
                    ? "مراجعة الطلب"
                    : "بيانات الطلب"}
              </h2>

              <button
                onClick={
                  closeOrderFlow
                }
                className="w-9 h-9 rounded-full hover:bg-(--color-background)"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {orderType ===
                "select" && (
                <div className="space-y-3">

                  {deliveryEnabled && (
                    <button
                      onClick={() =>
                        selectOrderType(
                          "delivery",
                        )
                      }
                      className="w-full flex items-center gap-3 p-4 rounded-2xl border hover:border-(--color-primary) transition text-right"
                    >
                      <span className="text-2xl">
                        🛵
                      </span>

                      <span>
                        <span className="block font-bold">
                          توصيل للمنزل
                        </span>

                        <span className="block text-xs opacity-60">
                          هنوصلّهولك
                        </span>
                      </span>
                    </button>
                  )}

                  {pickupEnabled && (
                    <button
                      onClick={() =>
                        selectOrderType(
                          "pickup",
                        )
                      }
                      className="w-full flex items-center gap-3 p-4 rounded-2xl border hover:border-(--color-primary) transition text-right"
                    >
                      <span className="text-2xl">
                        🏃
                      </span>

                      <span>
                        <span className="block font-bold">
                          استلام من المطعم
                        </span>

                        <span className="block text-xs opacity-60">
                          تيك أواي
                        </span>
                      </span>
                    </button>
                  )}

                  {dineInEnabled &&
                    isDineInQr && (
                      <button
                        onClick={() =>
                          selectOrderType(
                            "dine-in",
                          )
                        }
                        disabled={
                          !canDineIn
                        }
                        className="w-full flex items-center gap-3 p-4 rounded-2xl border hover:border-(--color-primary) transition text-right disabled:opacity-50"
                      >
                        <span className="text-2xl">
                          🍽️
                        </span>

                        <span>
                          <span className="block font-bold">
                            طلب داخل المطعم{" "}
                            {tableNumber
                              ? `(طاولة ${tableNumber})`
                              : ""}
                          </span>

                          <span className="block text-xs opacity-60">
                            {isCheckingTable
                              ? "جاري التحقق من الطاولة..."
                              : canDineIn
                                ? "هيتقدملك على الطاولة"
                                : "الطاولة غير متاحة"}
                          </span>
                        </span>
                      </button>
                    )}

                  {!deliveryEnabled &&
                    !pickupEnabled &&
                    !(
                      dineInEnabled &&
                      isDineInQr
                    ) && (
                      <p className="text-center opacity-60 py-6">
                        لا توجد طرق طلب
                        متاحة حاليًا.
                      </p>
                    )}
                </div>
              )}

              {/* بيانات الطلب */}
              {orderType !==
                "select" &&
                !showReview && (
                  <div className="space-y-4">

                    {orderType ===
                    "dine-in" ? (
                      <div className="bg-(--color-background) rounded-xl p-4 text-sm">
                        طلبك هيتقدملك
                        على طاولة رقم{" "}
                        <span className="font-bold">
                          {tableNumber}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            الاسم
                          </label>

                          <input
                            type="text"
                            value={
                              customerInfo.name
                            }
                            onChange={(e) =>
                              updateCustomerInfo(
                                "name",
                                e.target.value,
                              )
                            }
                            className="w-full border rounded-xl px-3 py-2.5 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            رقم الموبايل
                          </label>

                          <input
                            type="tel"
                            dir="ltr"
                            value={
                              customerInfo.phone
                            }
                            onChange={(e) =>
                              updateCustomerInfo(
                                "phone",
                                e.target.value,
                              )
                            }
                            className="w-full border rounded-xl px-3 py-2.5 outline-none"
                          />
                        </div>
                      </>
                    )}

                    {orderType ===
                      "delivery" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            منطقة التوصيل
                          </label>

                          <select
                            value={
                              customerInfo.deliveryArea
                            }
                            onChange={(e) =>
                              updateCustomerInfo(
                                "deliveryArea",
                                e.target.value,
                              )
                            }
                            className="w-full border rounded-xl px-3 py-2.5 outline-none bg-(--color-card)"
                          >
                            <option value="">
                              اختر المنطقة...
                            </option>

                            {deliveryAreas.map(
                              (area) => (
                                <option
                                  key={
                                    area.id
                                  }
                                  value={
                                    area.name
                                  }
                                >
                                  {area.name} —{" "}
                                  {area.price}{" "}
                                  ج.م
                                </option>
                              ),
                            )}
                          </select>

                          {isLoadingDeliveryAreas && (
                            <p className="text-xs opacity-60 mt-1">
                              جاري تحميل مناطق
                              التوصيل...
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            العنوان بالتفصيل
                          </label>

                          <textarea
                            value={
                              customerInfo.address
                            }
                            onChange={(e) =>
                              updateCustomerInfo(
                                "address",
                                e.target.value,
                              )
                            }
                            rows={2}
                            className="w-full border rounded-xl px-3 py-2.5 outline-none"
                          />
                        </div>

                        {cashPaymentEnabled &&
                          onlinePaymentEnabled && (
                            <div>
                              <label className="block text-sm font-medium mb-2">
                                طريقة الدفع
                              </label>

                              <div className="flex gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCustomerInfo(
                                      "paymentMethod",
                                      "cash",
                                    )
                                  }
                                  className={`flex-1 py-2.5 rounded-xl border font-medium ${
                                    customerInfo.paymentMethod ===
                                    "cash"
                                      ? "bg-(--color-primary) text-white border-(--color-primary)"
                                      : ""
                                  }`}
                                >
                                  كاش عند الاستلام
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCustomerInfo(
                                      "paymentMethod",
                                      "online",
                                    )
                                  }
                                  className={`flex-1 py-2.5 rounded-xl border font-medium ${
                                    customerInfo.paymentMethod ===
                                    "online"
                                      ? "bg-(--color-primary) text-white border-(--color-primary)"
                                      : ""
                                  }`}
                                >
                                  دفع أونلاين
                                </button>
                              </div>
                            </div>
                          )}
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        ملاحظات (اختياري)
                      </label>

                      <textarea
                        value={
                          customerInfo.notes
                        }
                        onChange={(e) =>
                          updateCustomerInfo(
                            "notes",
                            e.target.value,
                          )
                        }
                        rows={2}
                        className="w-full border rounded-xl px-3 py-2.5 outline-none"
                      />
                    </div>
                  </div>
                )}

              {/* مراجعة */}
              {orderType !==
                "select" &&
                showReview && (
                  <div className="space-y-4">

                    <div className="space-y-2">
                      {cart.map(
                        (item) => (
                          <div
                            key={
                              item.id
                            }
                            className="flex items-center justify-between text-sm"
                          >
                            <span>
                              {item.name} ×{" "}
                              {
                                item.quantity
                              }
                            </span>

                            <span className="font-medium">
                              {item.price *
                                item.quantity}{" "}
                              ج.م
                            </span>
                          </div>
                        ),
                      )}
                    </div>

                    <div className="border-t pt-3 space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span>
                          المنتجات
                        </span>

                        <span>
                          {cartTotal} ج.م
                        </span>
                      </div>

                      {orderType ===
                        "delivery" && (
                        <div className="flex items-center justify-between">
                          <span>
                            التوصيل
                          </span>

                          <span>
                            {deliveryPrice}{" "}
                            ج.م
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between font-bold text-base pt-1">
                        <span>
                          الإجمالي
                        </span>

                        <span>
                          {finalTotal} ج.م
                        </span>
                      </div>
                    </div>

                    <div className="border-t pt-3 text-sm space-y-1 opacity-80">
                      {orderType ===
                      "dine-in" ? (
                        <p>
                          طاولة رقم{" "}
                          {tableNumber}
                        </p>
                      ) : (
                        <>
                          <p>
                            {
                              customerInfo.name
                            }
                          </p>

                          <p
                            dir="ltr"
                            className="text-right"
                          >
                            {
                              customerInfo.phone
                            }
                          </p>
                        </>
                      )}

                      {orderType ===
                        "delivery" && (
                        <>
                          <p>
                            {
                              customerInfo.deliveryArea
                            }
                          </p>

                          <p>
                            {
                              customerInfo.address
                            }
                          </p>

                          <p>
                            الدفع:{" "}
                            {customerInfo.paymentMethod ===
                            "online"
                              ? "أونلاين"
                              : "كاش عند الاستلام"}
                          </p>
                        </>
                      )}

                      {customerInfo.notes && (
                        <p>
                          ملاحظات:{" "}
                          {
                            customerInfo.notes
                          }
                        </p>
                      )}
                    </div>
                  </div>
                )}
            </div>

            {orderType !==
              "select" && (
              <div className="p-4 border-t flex gap-3">
                <button
                  onClick={
                    showReview
                      ? () =>
                          setShowReview(
                            false,
                          )
                      : backToTypeSelect
                  }
                  className="flex-1 py-3 rounded-xl border font-bold"
                >
                  رجوع
                </button>

                <button
                  onClick={
                    showReview
                      ? confirmOrder
                      : proceedToReview
                  }
                  disabled={
                    isSubmitting
                  }
                  className="flex-1 py-3 rounded-xl bg-(--color-primary) text-white font-bold disabled:opacity-50"
                >
                  {showReview
                    ? isSubmitting
                      ? "جاري الإرسال..."
                      : "تأكيد الطلب"
                    : "التالي"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================
          Tracking
      ======================================== */}

      {orderSuccess &&
        trackedOrder &&
        isTrackingOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() =>
                setIsTrackingOpen(
                  false,
                )
              }
            />

            <div className="relative bg-(--color-card) w-full md:max-w-md md:rounded-2xl rounded-t-3xl max-h-[90vh] flex flex-col overflow-y-auto shadow-2xl">

              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-black text-lg">
                  تتبع طلبك
                </h2>

                <button
                  onClick={() =>
                    setIsTrackingOpen(
                      false,
                    )
                  }
                  className="w-9 h-9 rounded-full hover:bg-(--color-background)"
                  aria-label="إغلاق"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-5">

                <div className="text-center">
                  <p className="text-2xl font-black">
                    {getStatusHeadline(
                      orderStatus,
                      trackedOrder.type,
                    )}
                  </p>

                  <p className="opacity-60 text-sm mt-1">
                    رقم الطلب:{" "}
                    {
                      trackedOrder.number
                    }
                  </p>
                </div>

                {orderStatus !==
                  "cancelled" && (
                  <div className="space-y-0">
                    {trackingSteps.map(
                      (
                        step,
                        index,
                      ) => {
                        const isDone =
                          currentStepIndex >=
                            0 &&
                          index <=
                            currentStepIndex

                        return (
                          <div
                            key={
                              step.status
                            }
                            className="flex items-start gap-3"
                          >
                            <div className="flex flex-col items-center">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                  isDone
                                    ? "bg-(--color-primary) text-white"
                                    : "bg-gray-200 text-gray-400"
                                }`}
                              >
                                {isDone
                                  ? "✓"
                                  : index +
                                    1}
                              </div>

                              {index <
                                trackingSteps.length -
                                  1 && (
                                <div
                                  className={`w-0.5 h-8 ${
                                    isDone
                                      ? "bg-(--color-primary)"
                                      : "bg-gray-200"
                                  }`}
                                />
                              )}
                            </div>

                            <p
                              className={`text-sm pt-0.5 ${
                                isDone
                                  ? "font-bold"
                                  : "opacity-50"
                              }`}
                            >
                              {
                                step.label
                              }
                            </p>
                          </div>
                        )
                      },
                    )}
                  </div>
                )}

                {isTrackingFinished ? (
                  <button
                    onClick={
                      startNewOrder
                    }
                    className="w-full py-3 rounded-xl bg-(--color-primary) text-white font-bold"
                  >
                    اطلب تاني
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      setShowCancel(
                        true,
                      )
                    }
                    className="w-full py-3 rounded-xl border border-red-300 text-red-600 font-bold"
                  >
                    إلغاء الطلب
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      {/* ========================================
          Cancel
      ======================================== */}

      {showCancel && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() =>
              !isCancelling &&
              setShowCancel(false)
            }
          />

          <div className="relative bg-(--color-card) w-full md:max-w-md md:rounded-2xl rounded-t-3xl shadow-2xl">

            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-black text-lg">
                إلغاء الطلب
              </h2>

              <button
                onClick={() =>
                  setShowCancel(false)
                }
                disabled={
                  isCancelling
                }
                className="w-9 h-9 rounded-full hover:bg-(--color-background) disabled:opacity-50"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-sm opacity-70">
                ليه عايز تلغي الطلب؟
              </p>

              {CANCEL_REASONS.map(
                (reason) => (
                  <label
                    key={reason}
                    className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="cancel-reason"
                      checked={
                        cancelReason ===
                        reason
                      }
                      onChange={() =>
                        setCancelReason(
                          reason,
                        )
                      }
                      className="w-4 h-4 accent-(--color-primary)"
                    />

                    <span className="text-sm">
                      {reason}
                    </span>
                  </label>
                ),
              )}

              {cancelReason ===
                OTHER_CANCEL_REASON && (
                <textarea
                  value={cancelNote}
                  onChange={(e) =>
                    setCancelNote(
                      e.target.value,
                    )
                  }
                  placeholder="اكتب السبب..."
                  rows={2}
                  className="w-full border rounded-xl px-3 py-2.5 outline-none"
                />
              )}
            </div>

            <div className="p-4 border-t">
              <button
                onClick={
                  cancelOrder
                }
                disabled={
                  isCancelling
                }
                className="w-full py-3 rounded-xl bg-red-600 text-white font-bold disabled:opacity-50"
              >
                {isCancelling
                  ? "جاري الإلغاء..."
                  : "تأكيد الإلغاء"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App