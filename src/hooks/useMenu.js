import { useCallback, useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export function useMenu(restaurantId) {
    const [products, setProducts] = useState([])
    const [dbCategories, setDbCategories] = useState([])
    const [menuLoading, setMenuLoading] = useState(false)
    const [menuError, setMenuError] = useState("")

    const loadMenu = useCallback(async () => {
        if (!restaurantId) {
            setProducts([])
            setDbCategories([])
            return
        }

        setMenuLoading(true)
        setMenuError("")

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

        if (productsRes.error) {
            console.error("Failed to load products:", productsRes.error)
            setMenuError("حصل خطأ أثناء تحميل المنتجات.")
            setProducts([])
            setMenuLoading(false)
            return
        }

        if (categoriesRes.error) {
            console.error("Failed to load categories:", categoriesRes.error)
            setMenuError("حصل خطأ أثناء تحميل التصنيفات.")
            setDbCategories([])
            setMenuLoading(false)
            return
        }

        setProducts(productsRes.data || [])
        setDbCategories(categoriesRes.data || [])
        setMenuLoading(false)
    }, [restaurantId])

    useEffect(() => {
        let isMounted = true

        const run = async () => {
            if (!isMounted) return
            await loadMenu()
        }

        run()

        return () => {
            isMounted = false
        }
    }, [loadMenu])

    return {
        products,
        dbCategories,
        menuLoading,
        menuError,
        reloadMenu: loadMenu,
    }
}
