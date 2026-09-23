import { supabase } from "./supabase"

export async function createOrder({
    restaurantId,
    orderType,
    tableNumber,
    customerToken,
    orderNumber,
    customerInfo,
    paymentMethod,
    productsTotal,
    deliveryPrice,
    totalPrice,
}) {
    const orderId = crypto.randomUUID()

    const { data, error } = await supabase
        .from("orders")
        .insert({
            id: orderId,
            restaurant_id: restaurantId,
            customer_token: customerToken,
            order_number: orderNumber,
            order_type: orderType,
            table_number:
                orderType === "dine-in" ? tableNumber : null,
            customer_name:
                orderType === "dine-in"
                    ? null
                    : customerInfo?.name?.trim() || null,
            customer_phone:
                orderType === "dine-in"
                    ? null
                    : customerInfo?.phone?.trim() || null,
            delivery_area:
                orderType === "delivery"
                    ? customerInfo?.deliveryArea || null
                    : null,
            address:
                orderType === "delivery"
                    ? customerInfo?.address?.trim() || null
                    : null,
            notes: customerInfo?.notes?.trim() || null,
            payment_method: paymentMethod,
            products_total: productsTotal,
            delivery_price: deliveryPrice,
            total_price: totalPrice,
            status: "pending",
        })
        .select("id, order_number, customer_token")
        .single()

    if (error) {
        console.error("Failed to create order:", error)
        throw error
    }

    return data
}

export async function createOrderItems(orderId, cart) {
    const orderItems = cart.map((item) => ({
        order_id: orderId,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
    }))

    const { data, error } = await supabase
        .from("order_items")
        .insert(orderItems)
        .select()

    if (error) {
        console.error("Failed to create order items:", error)
        throw error
    }

    return data
}

export async function cancelOrder({
    orderId,
    customerToken,
    cancelReason,
}) {
    const { data, error } = await supabase.rpc("cancel_order", {
        p_order_id: orderId,
        p_customer_token: customerToken,
        p_cancel_reason: cancelReason,
    })

    if (error) {
        console.error("Failed to cancel order:", error)
        throw error
    }

    const result = Array.isArray(data) ? data[0] : data

    return result || null
}

export async function getOrderStatus({
    orderId,
    customerToken,
}) {
    const { data, error } = await supabase.rpc("get_order_status", {
        p_order_id: orderId,
        p_customer_token: customerToken,
    })

    if (error) {
        console.error("Failed to get order status:", error)
        throw error
    }

    const result = Array.isArray(data) ? data[0] : data

    return result || null
}