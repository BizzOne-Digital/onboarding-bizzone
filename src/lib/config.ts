// Shared form configuration. Used by the public form, the API and the dashboard.

export type PlanKey = "standard" | "premium" | "advanced";

export const PLANS: Record<PlanKey, { name: string; price: number; pages: number; live: string; blurb: string; chips: string[] }> = {
  standard: { name: "Standard", price: 79, pages: 5, live: "24–48 hours", blurb: "A simple site to get online fast.", chips: ["Up to 5 pages", "Basic SEO"] },
  premium: { name: "Premium", price: 149, pages: 12, live: "24–48 hours", blurb: "More tools to get more customers.", chips: ["Up to 12 pages", "Admin portal", "Bookings", "Payments"] },
  advanced: { name: "Advanced", price: 299, pages: 20, live: "2–4 days", blurb: "A full online store, ready to sell.", chips: ["Up to 20 pages", "Online store", "100 products"] },
};
export const PLAN_ORDER: PlanKey[] = ["standard", "premium", "advanced"];

// Dashboard package dropdown labels.
export const PACKAGES = ["Standard ($79)", "Premium ($149)", "Advanced ($299)", "Custom"];

/** Normalise any historical/variant package label into one bucket. */
export function packageBucket(label: string | undefined | null): string {
  const s = (label || "").toLowerCase();
  if (s.includes("standard") || s.includes("starter") || s.includes("basic")) return "Standard";
  if (s.includes("premium") || s.includes("pro")) return "Premium";
  if (s.includes("advanced") || s.includes("ecom") || s.includes("store")) return "Advanced";
  if (s.includes("custom")) return "Custom";
  return "Other";
}

export const TEAM = ["Zubair", "Shumaila", "Memoon Javed", "Atif"];

export type FieldDef = {
  id: string;
  label: string;
  type: "text" | "textarea" | "choice" | "multi";
  options?: string[];
  placeholder?: string;
  optional?: boolean;
};

export type BusinessType = {
  id: string;
  label: string;
  help: string;
  icon: string; // key into ICONS
  core: string[]; // 5 core pages, ticked automatically
  extra: string[]; // other relevant pages for this type
  fields: FieldDef[]; // type-specific questions shown in step 4
};

const HOURS: FieldDef = { id: "hours", label: "Opening hours", type: "textarea", placeholder: "For example: Mon–Fri 9am–6pm, Sat 10am–4pm", optional: true };

export const BUSINESS_TYPES: BusinessType[] = [
  {
    id: "ecommerce", label: "Online store", help: "Sell products online", icon: "sell",
    core: ["Home", "Shop", "Product page", "Cart and checkout", "Contact"],
    extra: ["About us", "Categories", "My account", "Order tracking", "Wishlist", "Shipping and returns", "Sale and offers", "Size guide", "Reviews", "FAQ", "Blog"],
    fields: [
      { id: "products_what", label: "What do you sell?", type: "text", placeholder: "For example: handmade candles and home decor" },
      { id: "product_count", label: "About how many products?", type: "choice", options: ["Up to 30", "31 to 100", "100+"] },
      { id: "categories", label: "Product categories", type: "text", placeholder: "For example: Candles, Diffusers, Gift sets", optional: true },
      { id: "payments", label: "How should customers pay?", type: "multi", options: ["Card (Stripe)", "PayPal", "Cash on delivery", "Bank transfer"] },
      { id: "shipping", label: "Where do you ship?", type: "choice", options: ["Local delivery", "Nationwide", "International", "Pickup only"] },
      { id: "returns", label: "Returns policy", type: "textarea", placeholder: "A short note is fine, or we can draft one", optional: true },
    ],
  },
  {
    id: "service", label: "Service business", help: "Cleaning, plumbing, consulting and more", icon: "portfolio",
    core: ["Home", "About us", "Services", "Get a quote", "Contact"],
    extra: ["Our work", "Testimonials", "Pricing", "Service areas", "Our team", "Booking", "FAQ", "Blog", "Careers"],
    fields: [
      { id: "service_areas", label: "Areas you serve", type: "text", placeholder: "For example: Toronto, Mississauga, Brampton" },
      { id: "lead_method", label: "How should customers reach you first?", type: "choice", options: ["Quote form", "Phone call", "Online booking", "WhatsApp"] },
      { id: "years", label: "Years in business", type: "text", optional: true },
      { id: "licences", label: "Licences or certifications", type: "text", optional: true },
    ],
  },
  {
    id: "restaurant", label: "Restaurant or cafe", help: "Menu, orders and reservations", icon: "food",
    core: ["Home", "Menu", "About us", "Reservations", "Contact"],
    extra: ["Order online", "Gallery", "Catering", "Events", "Reviews", "Locations", "Gift cards", "Our team", "Careers", "Blog", "FAQ"],
    fields: [
      { id: "cuisine", label: "Type of food", type: "text", placeholder: "For example: Italian, pizza and pasta" },
      { id: "service_types", label: "What do you offer?", type: "multi", options: ["Dine-in", "Takeaway", "Delivery", "Catering"] },
      { id: "reservations", label: "How do guests reserve a table?", type: "choice", options: ["Online booking", "Call only", "No reservations"] },
      { id: "menu_source", label: "Your menu", type: "choice", options: ["I'll send a PDF or photos", "I'll type it later", "Please help me with it"] },
      { id: "delivery_apps", label: "Delivery apps you use", type: "text", placeholder: "For example: Uber Eats, DoorDash", optional: true },
      HOURS,
    ],
  },
  {
    id: "salon", label: "Salon or spa", help: "Beauty, hair, nails, wellness", icon: "brush",
    core: ["Home", "Services and prices", "Book appointment", "Gallery", "Contact"],
    extra: ["About us", "Our team", "Testimonials", "Offers", "Gift cards", "Products", "FAQ", "Blog", "Careers"],
    fields: [
      { id: "salon_services", label: "Main services", type: "textarea", placeholder: "For example: Haircut, colour, facials, manicure" },
      { id: "booking_method", label: "How do clients book?", type: "choice", options: ["Online booking", "Call or WhatsApp", "Walk-ins"] },
      { id: "staff", label: "Stylists or staff to show", type: "text", optional: true },
      HOURS,
    ],
  },
  {
    id: "healthcare", label: "Healthcare or clinic", help: "Doctors, dentists, therapy", icon: "health",
    core: ["Home", "About us", "Services and treatments", "Book appointment", "Contact"],
    extra: ["Our doctors", "Patient forms", "Insurance", "Locations", "Testimonials", "FAQ", "Blog", "Careers", "Emergency info"],
    fields: [
      { id: "specialties", label: "Specialties or treatments", type: "text", placeholder: "For example: General dentistry, implants, whitening" },
      { id: "appointment_method", label: "How do patients book?", type: "choice", options: ["Online booking", "Call only", "Request form"] },
      { id: "insurance", label: "Insurance you accept", type: "text", optional: true },
      { id: "practitioners", label: "Doctors or practitioners to show", type: "text", optional: true },
      HOURS,
    ],
  },
  {
    id: "school", label: "School or academy", help: "Education, courses, training", icon: "school",
    core: ["Home", "About us", "Programs", "Admissions", "Contact"],
    extra: ["Faculty", "Fees", "Events and calendar", "Gallery", "News", "Student portal", "Testimonials", "FAQ", "Careers"],
    fields: [
      { id: "programs", label: "Programs or levels you offer", type: "text", placeholder: "For example: Grades 1–8, IELTS, coding bootcamp" },
      { id: "admissions_method", label: "How do students apply?", type: "choice", options: ["Online application", "Inquiry form", "Visit campus"] },
      { id: "fees_display", label: "Show fees on the website?", type: "choice", options: ["Yes, show fees", "On request only"] },
      { id: "campuses", label: "Campus locations", type: "text", optional: true },
    ],
  },
  {
    id: "realestate", label: "Real estate", help: "Agents, brokers, property", icon: "biz",
    core: ["Home", "Listings", "Property details", "About us", "Contact"],
    extra: ["Buy", "Sell and valuation", "Rent", "Our agents", "Neighbourhoods", "Mortgage calculator", "Testimonials", "FAQ", "Blog"],
    fields: [
      { id: "property_types", label: "Property types", type: "multi", options: ["Residential", "Commercial", "Rentals", "Land"] },
      { id: "listing_count", label: "About how many listings?", type: "choice", options: ["Up to 20", "21 to 100", "100+"] },
      { id: "areas", label: "Areas you cover", type: "text", placeholder: "For example: Downtown Toronto, North York" },
      { id: "listing_source", label: "How will listings be added?", type: "choice", options: ["Connect MLS / IDX feed", "Add them manually", "Not sure"] },
    ],
  },
  {
    id: "other", label: "Other", help: "Tell us in your own words", icon: "info",
    core: ["Home", "About us", "Services", "Testimonials", "Contact"],
    extra: ["FAQ", "Pricing", "Gallery", "Booking", "Our team", "Shop", "Blog", "Careers"],
    fields: [
      { id: "describe", label: "Tell us what your business does", type: "textarea", placeholder: "Who you serve and what you offer" },
    ],
  },
];

export function businessType(id: string | undefined | null): BusinessType | undefined {
  return BUSINESS_TYPES.find((b) => b.id === id);
}

export const FEATURES = [
  { id: "booking", title: "Bookings or quote requests", help: "Customers book a time or ask for a quote", level: "premium" as PlanKey },
  { id: "payments", title: "Take payments online", help: "Deposits or payments on your site", level: "premium" as PlanKey },
  { id: "admin", title: "Edit your own content", help: "An admin portal for text and photos", level: "premium" as PlanKey },
  { id: "gallery", title: "A gallery you can update", help: "Show your work, add photos anytime", level: "premium" as PlanKey },
  { id: "store", title: "Full online store", help: "Cart, checkout and order tracking", level: "advanced" as PlanKey },
];

export const GOALS: [string, string][] = [
  ["Get more leads and calls", "leads"], ["Sell products online", "sell"], ["Get more bookings", "booking"],
  ["Build trust and awareness", "trust"], ["Show my work", "portfolio"], ["Share information", "info"],
];

export const LANGS = ["One", "Two languages", "Three or more"];

export const STYLES: [string, string, string[]][] = [
  ["Modern and minimal", "Clean and airy", ["#FFFFFF", "#E9E9EC", "#111111"]],
  ["Bold and graphic", "Strong colour, big type", ["#FFD400", "#1F3BFF", "#111111"]],
  ["Corporate and professional", "Polished and trustworthy", ["#0B2545", "#8DA9C4", "#EEF4ED"]],
  ["Warm and friendly", "Approachable and personal", ["#F4A261", "#E76F51", "#FFF1E6"]],
  ["Luxury and high-end", "Refined and premium", ["#0E0E0E", "#C9A227", "#F5F0E6"]],
  ["Dark and sleek", "Dark with sharp accents", ["#0B0B12", "#2D2D44", "#8C00FF"]],
];

export const REGISTRARS = ["GoDaddy", "Namecheap", "Squarespace (formerly Google Domains)", "Wix", "Hostinger", "Cloudflare", "Other", "I’m not sure"];

export const DOMAIN_PRICE = 30;
export const WHATSAPP = "12894121562";
