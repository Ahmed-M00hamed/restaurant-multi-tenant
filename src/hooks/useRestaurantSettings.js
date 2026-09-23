import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export function useRestaurantSettings(restaurantId) {
    const [restaurantSettings, setRestaurantSettings] = useState(null)
    const [settingsLoading, setSettingsLoading] = useState(false)
    const [settingsError, setSettingsError] = useState("")

    useEffect(() => {
        let isMounted = true

        const loadSettings = async () => {
            if (!restaurantId) {
                setRestaurantSettings(null)
                return
            }

            setSettingsLoading(true)
            setSettingsError("")

            const { data, error } = await supabase
                .from("restaurant_settings")
                .select("*")
                .eq("restaurant_id", restaurantId)
                .limit(1)
                .maybeSingle()

            if (!isMounted) return

            if (error) {
                console.error("Failed to load restaurant settings:", error)
                setSettingsError("حصل خطأ أثناء تحميل إعدادات المطعم.")
                setRestaurantSettings(null)
                setSettingsLoading(false)
                return
            }

            setRestaurantSettings(data || null)
            setSettingsLoading(false)
        }

        loadSettings()

        return () => {
            isMounted = false
        }
    }, [restaurantId])

    return {
        restaurantSettings,
        settingsLoading,
        settingsError,
    }
}