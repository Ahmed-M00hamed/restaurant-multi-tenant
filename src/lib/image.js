import { supabase } from "./supabase"

const BUCKET = "product-images"

// بيصغّر الصورة قبل الرفع عشان المنيو يفتح بسرعة على الموبايل
export const resizeImage = async (
  file,
  { maxSize = 1600, quality = 0.85 } = {},
) => {
  try {
    const bitmap = await createImageBitmap(file)

    const scale = Math.min(
      1,
      maxSize / Math.max(bitmap.width, bitmap.height),
    )

    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height)

    // PNG بيفضل PNG عشان الشفافية (اللوجو)
    const type =
      file.type === "image/png" ? "image/png" : "image/jpeg"

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, type, quality),
    )

    if (!blob) return file

    return blob
  } catch {
    return file
  }
}

// بيرفع صورة (لوجو / غلاف) ويرجّع الرابط العام
export const uploadBrandingImage = async (
  file,
  kind,
  options,
) => {
  if (!file.type.startsWith("image/")) {
    throw new Error("من فضلك اختر ملف صورة فقط.")
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("حجم الصورة يجب ألا يتجاوز 8MB.")
  }

  const body = await resizeImage(file, options)

  const extension = body.type === "image/png" ? "png" : "jpg"

  const path = `branding/${kind}-${Date.now()}.${extension}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, {
      cacheControl: "31536000",
      contentType: body.type || file.type,
      upsert: false,
    })

  if (error) throw error

  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path)

  return data.publicUrl
}
