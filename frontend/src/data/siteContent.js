/**
 * All copy lives here so pages stay presentational and easy to reword.
 * `icon` values map to keys in components/ui/Icon.jsx.
 */

export const SITE = {
  name: "LEANOR FOUNDATION",
  fullName: "LEANOR FOUNDATION INFO SHARE",
  tagline: "A single, secure channel for sharing your information",
  owner: "the Leanor Foundation",
  email: "contact@leanorfoundation.org",
};

export const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "What you can send" },
  { to: "/submit", label: "Submit" },
];

export const FEATURES = [
  {
    icon: "layers",
    title: "One form for everything",
    body: "Personal details, account access, bank information, identification and photographs — a single submission instead of five messages.",
  },
  {
    icon: "lock",
    title: "Private by default",
    body: "Only the Foundation's inbox can open what you send. Every read is behind a signed, expiring session.",
    accent: true,
  },
  {
    icon: "bolt",
    title: "Instant confirmation",
    body: "A reference number is issued the moment your submission is stored — no waiting for a reply.",
  },
  {
    icon: "shield",
    title: "Verified at both ends",
    body: "Details are checked in your browser and again on the server, so nothing incomplete is ever filed.",
  },
];

export const HOW_IT_WORKS = [
  {
    title: "Complete the form",
    body: "Your name and email address, then whatever applies: phone numbers, account access, bank details, ID photographs and notes.",
  },
  {
    title: "Attach photographs",
    body: "Both sides of your ID card, plus any supporting images. Everything is checked for type and size before sending.",
  },
  {
    title: "Receive a reference",
    body: "A reference number is displayed immediately. Quote it in any follow-up correspondence.",
  },
];

export const SERVICES = [
  {
    icon: "user",
    title: "Personal details",
    body: "Full name, email address and as many phone numbers as required.",
  },
  {
    icon: "bank",
    title: "Bank information",
    body: "Bank name, account number, IBAN and online banking password.",
    accent: true,
  },
  {
    icon: "card",
    title: "ID card photographs",
    body: "Front and back of your identification card, photographed clearly.",
  },
  {
    icon: "image",
    title: "Supporting photographs",
    body: `Up to eight further images at 5 MB each.`,
  },
  {
    icon: "note",
    title: "Notes",
    body: "Anything else worth recording — up to 5,000 characters.",
  },
];

/** Scrolling ticker strip below the hero (see components/fx/Ticker.jsx). */
export const TICKER = [
  "Personal details",
  "Phone numbers",
  "Email account access",
  "Bank information",
  "IBAN",
  "ID card photographs",
  "Supporting images",
  "Notes",
  "Instant reference number",
];

/** Animated counters in the "by the numbers" band on the home page. */
export const HOME_STATS = [
  { value: 3, label: "steps to completion" },
  { value: 12, label: "phone numbers accepted" },
  { value: 8, label: "supporting photos" },
  { value: 2, label: "ID card photographs" },
  { value: 5, suffix: " MB", label: "per image" },
  { value: 5000, label: "note characters" },
];

export const LIMITS = [
  ["12", "phone numbers"],
  ["8", "supporting photos"],
  ["2", "ID card photographs"],
  ["5 MB", "per image"],
  ["5 000", "note characters"],
  ["200", "password characters"],
];

export const FAQS = [
  {
    q: "Who can read what I submit?",
    a: "Only the Leanor Foundation. The inbox is password protected and every read or delete requires a signed, expiring session token.",
  },
  {
    q: "Why are passwords requested?",
    a: "Only when the Foundation has specifically asked for account access. Those fields are optional and are stored separately from your identity details. Never share them over an unsecured connection.",
  },
  {
    q: "Is my information sent over an encrypted connection?",
    a: "It is when the site is served over HTTPS. Do not submit passwords or identification photographs to a site running on plain HTTP.",
  },
  {
    q: "What format should ID photographs be in?",
    a: "PNG, JPEG, GIF or WEBP, up to 5 MB each. Photograph the card flat and evenly lit so the text is legible.",
  },
  {
    q: "Can I correct or withdraw a submission?",
    a: "Yes. Send a new submission with the corrected details and quote the original reference, or ask the Foundation to remove the earlier record.",
  },
];

export const PRIVACY_POINTS = [
  "Only the Leanor Foundation can view submissions — the inbox is password protected.",
  "Nothing is shared with third parties or sold on.",
  "You can request that your information is deleted at any time.",
  "Photographs are stored as files; the details describing them are held separately.",
  "The site does not store your IP address or set tracking cookies.",
];