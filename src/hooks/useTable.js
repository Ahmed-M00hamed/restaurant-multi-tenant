import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export function useTable(restaurantId, tableNumber) {
    const [tableInfo, setTableInfo] = useState(null)
    const [isCheckingTable, setIsCheckingTable] = useState(false)
    const [tableError, setTableError] = useState("")

    useEffect(() => {
        let isMounted = true

        const loadTable = async () => {
            if (!restaurantId || !tableNumber) {
                setTableInfo(null)
                setTableError("")
                return
            }

            setIsCheckingTable(true)
            setTableError("")

            const { data, error } = await supabase
                .from("tables")
                .select("id, table_number, name, capacity, is_active")
                .eq("restaurant_id", restaurantId)
                .eq("table_number", tableNumber)
                .maybeSingle()

            if (!isMounted) return

            if (error) {
                console.error("Failed to load table:", error)
                setTableInfo(null)
                setTableError("حصل خطأ أثناء التحقق من الطاولة.")
                setIsCheckingTable(false)
                return
            }

            if (!data || !data.is_active) {
                setTableInfo(null)
                setTableError("الطاولة غير متاحة حاليًا.")
                setIsCheckingTable(false)
                return
            }

            setTableInfo(data)
            setTableError("")
            setIsCheckingTable(false)
        }

        loadTable()

        return () => {
            isMounted = false
        }
    }, [restaurantId, tableNumber])

    return {
        tableInfo,
        isCheckingTable,
        tableError,
    }
}
