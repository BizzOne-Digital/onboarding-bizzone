import Script from "next/script";

// GoHighLevel (LeadConnector) chat widget.
// Turned on only when NEXT_PUBLIC_GHL_WIDGET_ID is set (GHL > Sites > Chat Widget > Get Code > data-widget-id).
// The bot replies / automations are configured inside GoHighLevel, not in this codebase.
export default function GhlChat() {
  const id = process.env.NEXT_PUBLIC_GHL_WIDGET_ID;
  if (!id) return null;
  return (
    <Script
      id="ghl-chat-widget"
      src="https://widgets.leadconnectorhq.com/loader.js"
      data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
      data-widget-id={id}
      strategy="lazyOnload"
    />
  );
}
