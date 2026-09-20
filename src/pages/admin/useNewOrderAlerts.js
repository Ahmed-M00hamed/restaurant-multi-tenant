import { useEffect, useRef, useState } from "react"
import { supabase } from "../../lib/supabase"

// حدث بيتبعت لباقي صفحات الأدمن عشان تحدّث نفسها بهدوء
export const ORDERS_CHANGED_EVENT = "menuflow:orders-changed"

const POLL_INTERVAL_MS = 15000

// الطلب بيتسجل على مرحلتين (orders ثم order_items)،
// فبنستنى شوية قبل ما نطلب من الصفحات تحدّث نفسها
const ITEMS_DELAY_MS = 1500

const isNewer = (a, b) =>
  new Date(a).getTime() > new Date(b).getTime()

/**
 * بيراقب الطلبات الجديدة للمطعم المحدد:
 * 1) Supabase Realtime (لحظي مع فلترة بالـ restaurant_id)
 * 2) فحص دوري كل 15 ثانية كاحتياطي لو الـ Realtime مش مفعّل
 */
export default function useNewOrderAlerts({
  restaurantId, // تم إضافة معرف المطعم لفلترة التنبيهات
  enabled,
  onNewOrder,
  onCustomerCancel,
}) {
  const [pendingCount, setPendingCount] = useState(0)
  const [realtimeStatus, setRealtimeStatus] = useState("CONNECTING")

  const handlerRef = useRef(onNewOrder)
  const cancelRef = useRef(onCustomerCancel)

  useEffect(() => {
    handlerRef.current = onNewOrder
    cancelRef.current = onCustomerCancel
  })

  useEffect(() => {
    // يتوقف عن العمل إذا تم إيقافه أو لم يتم تحديد restaurantId
    if (!enabled || !restaurantId) return

    let cancelled = false
    let changeTimer = null
    let lastSeen = null

    const known = new Set()
    const knownCancels = new Set()
    let lastCancelSeen = null

    const announceChange = () => {
      clearTimeout(changeTimer)

      changeTimer = setTimeout(() => {
        window.dispatchEvent(new Event(ORDERS_CHANGED_EVENT))
      }, ITEMS_DELAY_MS)
    }

    const refreshPending = async () => {
      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .eq("status", "pending")

      if (!cancelled && !error) {
        setPendingCount(count || 0)
      }
    }

    const handleNewOrder = (order) => {
      if (!order?.id || known.has(order.id)) return

      known.add(order.id)

      if (
        order.created_at &&
        (!lastSeen || isNewer(order.created_at, lastSeen))
      ) {
        lastSeen = order.created_at
      }

      handlerRef.current?.(order)
      refreshPending()
      announceChange()
    }

    // العميل ألغى الطلب بنفسه (cancelled_by = customer)
    const handleCustomerCancel = (order) => {
      if (!order?.id || knownCancels.has(order.id)) return

      if (
        !order.cancelled_at ||
        (lastCancelSeen && !isNewer(order.cancelled_at, lastCancelSeen))
      ) {
        return
      }

      knownCancels.add(order.id)
      lastCancelSeen = order.cancelled_at

      cancelRef.current?.(order)
    }

    const initCancels = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, cancelled_at")
        .eq("restaurant_id", restaurantId)
        .eq("cancelled_by", "customer")
        .order("cancelled_at", { ascending: false })
        .limit(1)

      if (cancelled || error) return

      if (data?.[0]) {
        knownCancels.add(data[0].id)
        lastCancelSeen = data[0].cancelled_at
      } else if (!lastCancelSeen) {
        lastCancelSeen = new Date(0).toISOString()
      }
    }

    const pollCancels = async () => {
      if (lastCancelSeen === null) return

      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, order_type, table_number, total_price, cancel_reason, cancelled_at",
        )
        .eq("restaurant_id", restaurantId)
        .eq("cancelled_by", "customer")
        .gt("cancelled_at", lastCancelSeen)
        .order("cancelled_at", { ascending: true })

      if (cancelled || error) return

        ; (data || []).forEach(handleCustomerCancel)
    }

    const pollNewOrders = async () => {
      if (lastSeen === null) return

      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, order_type, table_number, customer_name, total_price, created_at",
        )
        .eq("restaurant_id", restaurantId)
        .gt("created_at", lastSeen)
        .order("created_at", { ascending: true })

      if (cancelled || error) return

        ; (data || []).forEach(handleNewOrder)

      refreshPending()
    }

    const init = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, created_at")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(1)

      if (cancelled) return

      if (error || !data?.[0]) {
        lastSeen = error
          ? new Date().toISOString()
          : new Date(0).toISOString()
      } else {
        known.add(data[0].id)

        if (!lastSeen || isNewer(data[0].created_at, lastSeen)) {
          lastSeen = data[0].created_at
        }
      }

      refreshPending()
    }

    init()
    initCancels()

    // إعداد قناة الاستماع المباشر مع فلتر المكون للتصنيف بناءً على restaurant_id
    const channel = supabase
      .channel(`admin-orders-alerts-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => handleNewOrder(payload.new),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          refreshPending()
          announceChange()

          if (
            payload.new?.status === "cancelled" &&
            payload.new?.cancelled_by === "customer"
          ) {
            handleCustomerCancel(payload.new)
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          refreshPending()
          announceChange()
        },
      )
      .subscribe((status) => {
        if (!cancelled) setRealtimeStatus(status)
      })

    const interval = setInterval(() => {
      pollNewOrders()
      pollCancels()
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
      clearTimeout(changeTimer)
      supabase.removeChannel(channel)
    }
  }, [enabled, restaurantId])

  return { pendingCount, realtimeStatus }
}