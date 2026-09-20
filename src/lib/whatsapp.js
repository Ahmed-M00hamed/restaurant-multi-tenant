// أدوات واتساب

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩"

const toLatinDigits = (value) =>
  String(value || "").replace(/[٠-٩]/g, (digit) =>
    String(ARABIC_DIGITS.indexOf(digit)),
  )

/**
 * يحوّل رقم موبايل مصري أو دولي لصيغة مناسبة للواتساب (مثل: 201012345678)
 */
export const toWhatsAppNumber = (
  phone,
  countryCode = "20",
) => {
  const digits = toLatinDigits(phone).replace(/\D/g, "")

  if (!digits) return ""

  if (digits.startsWith("00")) return digits.slice(2)

  if (digits.startsWith("0")) {
    return countryCode + digits.slice(1)
  }

  // رقم بدون صفر في الأول (مثلًا 1012345678)
  if (digits.length <= 10) return countryCode + digits

  return digits
}

/**
 * يبني رابط واتساب مخصص لأي رقم هاتف ورسالة
 */
export const buildWhatsAppLink = (phone, message = "") => {
  const number = toWhatsAppNumber(phone)

  if (!number) return ""

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

/**
 * دالة مخصصة للمنصة المتعددة المطاعم:
 * تبني رابط إرسال الطلب لواتساب المطعم بناءً على رقم هاتف المطعم وبيانات الطلب
 */
export const buildRestaurantWhatsAppLink = (restaurantPhone, orderData) => {
  if (!restaurantPhone) return ""

  const customerName = orderData?.customer_name || orderData?.customerName || "عميل"
  const orderNumber = orderData?.order_number || orderData?.orderNumber || orderData?.id || ""
  const totalPrice = orderData?.total_price || orderData?.totalPrice || 0
  const orderType = orderData?.order_type === "dine_in" ? "صالة" : orderData?.order_type === "takeaway" ? "تيك أواي" : "توصيل"

  let message = `مرحباً، طلب جديد من المنيو الإلكتروني 📋\n`
  if (orderNumber) message += `رقم الطلب: #${orderNumber}\n`
  message += `الاسم: ${customerName}\n`
  message += `نوع الطلب: ${orderType}\n`

  if (orderData?.table_number) {
    message += `رقم الطاولة: ${orderData.table_number}\n`
  }

  if (orderData?.items && Array.isArray(orderData.items)) {
    message += `\nالطلبات:\n`
    orderData.items.forEach((item) => {
      message += `- ${item.quantity}x ${item.name} (${item.price * item.quantity} ج.م)\n`
    })
  }

  message += `\nالإجمالي: ${totalPrice} ج.م`

  return buildWhatsAppLink(restaurantPhone, message)
}