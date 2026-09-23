import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export function useDeliveryAreas(restaurantId) {
    const [deliveryAreas, setDeliveryAreas] = useState([])
    const [deliveryAreasLoading, setDeliveryAreasLoading] = useState(false)
    const [deliveryAreasError, setDeliveryAreasError] = useState("")

    useEffect(() => {
        let isMounted = true

        const loadDeliveryAreas = async () => {
            if (!restaurantId) {
                setDeliveryAreas([])
                return
            }

            setDeliveryAreasLoading(true)
            setDeliveryAreasError("")

            const { data, error } = await supabase
                .from("delivery_areas")
                .select("id, name, price")
                .eq("restaurant_id", restaurantId)
                .eq("is_active", true)
                .order("name", { ascending: true })

            if (!isMounted) return

            if (error) {
                console.error("Failed to load delivery areas:", error)
                setDeliveryAreasError("حصل خطأ أثناء تحميل مناطق التوصيل.")
                setDeliveryAreas([])
                setDeliveryAreasLoading(false)
                return
            }

            setDeliveryAreas(data || [])
            setDeliveryAreasLoading(false)
        }

        loadDeliveryAreas()

        return () => {
            isMounted = false
        }
    }, [restaurantId])

    return {
        deliveryAreas,
        deliveryAreasLoading,
        deliveryAreasError,
    }
}
