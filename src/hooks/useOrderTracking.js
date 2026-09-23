import { useCallback, useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

const POLL_INTERVAL_MS = 4000

export function useOrderTracking(trackedOrder) {
    const [orderStatus, setOrderStatus] = useState(null)
    const [isTrackingLoading, setIsTrackingLoading] = useState(false)
    const [trackingError, setTrackingError] = useState("")

    const fetchOrderStatus = useCallback(async () => {
        if (!trackedOrder?.id || !trackedOrder?.token) {
            return
        }

        try {
            setTrackingError("")

            const { data, error } = await supabase.rpc("get_order_status", {
                p_order_id: trackedOrder.id,
                p_customer_token: trackedOrder.token,
            })

            if (error) {
                console.error("Failed to fetch order status:", error)
                setTrackingError("حصل خطأ أثناء تحديث حالة الطلب.")
                return
            }

            const result = Array.isArray(data) ? data[0] : data

            if (!result) {
                setOrderStatus(null)
                return
            }

            setOrderStatus(result.status)
        } catch (error) {
            console.error("Unexpected tracking error:", error)
            setTrackingError("حصل خطأ أثناء تحديث حالة الطلب.")
        }
    }, [trackedOrder])

    useEffect(() => {
        if (!trackedOrder?.id || !trackedOrder?.token) {
            setOrderStatus(null)
            return
        }

        let isMounted = true

        const startTracking = async () => {
            setIsTrackingLoading(true)

            await fetchOrderStatus()

            if (isMounted) {
                setIsTrackingLoading(false)
            }
        }

        startTracking()

        const interval = setInterval(() => {
            fetchOrderStatus()
        }, POLL_INTERVAL_MS)

        return () => {
            isMounted = false
            clearInterval(interval)
        }
    }, [trackedOrder, fetchOrderStatus])

    return {
        orderStatus,
        setOrderStatus,
        isTrackingLoading,
        trackingError,
        refreshOrderStatus: fetchOrderStatus,
    }
}
