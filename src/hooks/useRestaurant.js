import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export function useRestaurant(slug) {
    const [restaurantRow, setRestaurantRow] = useState(null)
    const [restaurantLoading, setRestaurantLoading] = useState(true)
    const [restaurantNotFound, setRestaurantNotFound] = useState(false)
    const [restaurantError, setRestaurantError] = useState("")

    useEffect(() => {
        let isMounted = true

        const loadRestaurant = async () => {
            if (!slug) {
                if (isMounted) {
                    setRestaurantRow(null)
                    setRestaurantNotFound(true)
                    setRestaurantLoading(false)
                }
                return
            }

            setRestaurantLoading(true)
            setRestaurantNotFound(false)
            setRestaurantError("")

            const { data, error } = await supabase
                .from("restaurants")
                .select("id, slug, name, phone, is_active")
                .eq("slug", slug)
                .eq("is_active", true)
                .maybeSingle()

            if (!isMounted) return

            if (error) {
                console.error("Failed to load restaurant:", error)
                setRestaurantError("حصل خطأ أثناء تحميل بيانات المطعم.")
                setRestaurantRow(null)
                setRestaurantNotFound(false)
                setRestaurantLoading(false)
                return
            }

            if (!data) {
                setRestaurantRow(null)
                setRestaurantNotFound(true)
                setRestaurantLoading(false)
                return
            }

            setRestaurantRow(data)
            setRestaurantNotFound(false)
            setRestaurantLoading(false)
        }

        loadRestaurant()

        return () => {
            isMounted = false
        }
    }, [slug])

    return {
        restaurantRow,
        restaurantLoading,
        restaurantNotFound,
        restaurantError,
    }
}
