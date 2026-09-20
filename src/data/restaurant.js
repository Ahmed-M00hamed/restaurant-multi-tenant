const restaurant = {
    name: "MenuFlow Cafe",

    logo: "MF",

    description: "أهلاً بيك 👋 اختار طلبك من المنيو",

    isOpen: true,

    theme: {
        primary: "#111827",
        secondary: "#f59e0b",
        background: "#f9fafb",
        text: "#111827",
        card: "#ffffff",
    },

    contact: {
        phone: "01000000000",
        whatsapp: "201000000000",
    },

    // مناطق التوصيل التي يحددها صاحب المطعم
    deliveryAreas: [
        {
            id: 1,
            name: "العاشر من رمضان",
            price: 50,
        },
        {
            id: 2,
            name: "العبور",
            price: 70,
        },
        {
            id: 3,
            name: "الشروق",
            price: 80,
        },
    ],

    settings: {
        deliveryEnabled: true,
        pickupEnabled: true,
        dineInEnabled: true,
    },
}

export default restaurant