export default function WhatsAppButton({
    phone,
    href,
}) {
    if (!phone && !href) {
        return null
    }

    const whatsappHref =
        href ||
        `https://wa.me/${String(phone).replace(/\D/g, "")}`

    return (
        <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="fixed bottom-5 end-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition hover:scale-105"
            aria-label="تواصل عبر واتساب"
            title="واتساب"
        >
            <svg
                className="h-7 w-7"
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                <path d="M12.04 2C6.51 2 2 6.48 2 11.98c0 2.11.66 4.07 1.78 5.68L2 22l4.5-1.75a10 10 0 0 0 5.54 1.66h.01c5.53 0 10.03-4.48 10.03-9.98C22.08 6.48 17.57 2 12.04 2Zm0 18.12h-.01a8.12 8.12 0 0 1-4.14-1.13l-.3-.18-2.67 1.04 1.04-2.6-.2-.31a8.06 8.06 0 1 1 6.28 3.18Zm4.43-6.06c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.18-.71-.63-1.19-1.41-1.33-1.65-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.57 4.09 3.61.57.25 1.01.4 1.35.51.57.18 1.09.15 1.5.09.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
            </svg>
        </a>
    )
}
