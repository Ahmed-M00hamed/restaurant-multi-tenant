// اسم الموقع + أيقونة التبويب (favicon) مربوطين ببيانات المطعم

// حدث بيتبعت لما إعدادات المطعم تتحفظ، عشان باقي اللوحة تحدّث نفسها
export const SETTINGS_CHANGED_EVENT = "menuflow:settings-changed"

export const applyBranding = ({ title, iconUrl } = {}) => {
  if (title) {
    document.title = title
  }

  if (iconUrl) {
    let link = document.querySelector("link[rel~='icon']")

    if (!link) {
      link = document.createElement("link")
      link.rel = "icon"
      document.head.appendChild(link)
    }

    // الأيقونة الأصلية SVG؛ لازم نشيل النوع عشان اللوجو (png/jpg) يشتغل
    link.removeAttribute("type")
    link.href = iconUrl
  }
}

// لون الخلفية البني الشفاف اللي ورا اسم المطعم واللوجو فوق صورة الهيدر
export const HEADER_OVERLAY = "rgba(84, 52, 30, 0.68)"

// ===== التحكم في لون خلفية الهيدر من الإعدادات =====

export const DEFAULT_OVERLAY_COLOR = "#54341e"
export const DEFAULT_OVERLAY_OPACITY = 68

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value))

export const hexToRgb = (hex) => {
  let value = String(hex || "").trim().replace("#", "")

  if (/^[0-9a-f]{3}$/i.test(value)) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("")
  }

  if (!/^[0-9a-f]{6}$/i.test(value)) return null

  const number = parseInt(value, 16)

  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  }
}

// بيرجّع ألوان الهيدر (خلفية شفافة + خلفية سادة + لون الكلام المناسب)
export const getHeaderOverlay = (color, opacity) => {
  const rgb = hexToRgb(color) || hexToRgb(DEFAULT_OVERLAY_COLOR)

  const parsed =
    opacity === null || opacity === undefined || opacity === ""
      ? NaN
      : Number(opacity)

  const percent = Number.isFinite(parsed)
    ? clamp(parsed, 0, 100)
    : DEFAULT_OVERLAY_OPACITY

  const luminance =
    (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255

  const isLightText = luminance <= 0.6

  return {
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${percent / 100})`,
    solidColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    textColor: isLightText ? "#ffffff" : "#111827",
    isLightText,
    percent,
  }
}
