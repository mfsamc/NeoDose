// public/assets/app.js

// ---------- Public config (filled by /api/public/env) ----------
let SUPABASE_URL = "";
let SUPABASE_ANON_KEY = "";
let CHECKOUT_URL = "";

// ---------- Auth/session ----------
let supabaseClient = null;
let session = null;

// ---------- i18n dictionaries ----------
let i18n = {
  en: {
    heroTitle: "One-page neonatal dose calculator",
    heroSubtitle: "For education and rapid estimates. Validate before clinical use.",
    authTitle: "Sign in with your email",
    authSubtitle: "We use passwordless magic links.",
    calcTitle: "NeoDose Calculator (Demo: Caffeine Citrate)",
    weightLabel: "Weight (kg)",
    regimenLabel: "Regimen",
    regimenLoading: "Loading dose (20 mg/kg)",
    regimenMaintenance: "Maintenance (5–10 mg/kg)",
    customDoseLabel: "Custom dose (mg/kg)",
    btnCalculate: "Calculate",
    btnPrint: "Print",
    btnSave: "Save (Pro)",
    faqTitle: "FAQ",
    faq1q: "Is NeoDose free?",
    faq1a: "You can use 5 calculations/day for free. Pro unlocks unlimited use and saving.",
    faq2q: "How do I upgrade?",
    faq2a: "Click “Go Pro” to purchase. Use the same email you used to sign in.",
    disclaimer: "Education only. Not a substitute for clinical judgment. Always confirm with local neonatal protocols.",
    // Added keys for validation & future fields
    concentrationLabel: "Concentration (mg/mL)",
    concentrationNote: "Demo only. Confirm actual product strength.",
    validationWeight: "Enter a valid weight in kg (e.g., 2.8).",
    validationConcentration: "Enter a valid concentration (mg/mL)."
  },
  ur: {
    heroTitle: "ایک سادہ نیو نیٹل ڈوز کیلکولیٹر",
    heroSubtitle: "صرف تعلیم اور فوری اندازے کے لیے۔ استعمال سے پہلے تصدیق کریں۔",
    authTitle: "ای میل کے ذریعے سائن اِن کریں",
    authSubtitle: "پاس ورڈ کے بغیر میجک لنک استعمال ہوتا ہے۔",
    calcTitle: "NeoDose کیلکولیٹر (ڈیمو: کیفین سیٹریٹ)",
    weightLabel: "وزن (کلوگرام)",
    regimenLabel: "ریجمن",
    regimenLoading: "لوڈنگ ڈوز (20 ملی گرام/کلوگرام)",
    regimenMaintenance: "مینٹیننس (5–10 ملی گرام/کلوگرام)",
    customDoseLabel: "کسٹم ڈوز (ملی گرام/کلوگرام)",
    btnCalculate: "حساب کریں",
    btnPrint: "پرنٹ",
    btnSave: "سیو (پرو)",
    faqTitle: "سوالات",
    faq1q: "کیا نیو ڈوز مفت ہے؟",
    faq1a: "روزانہ 5 مفت کیلکولیشنز۔ پرو پلان میں لامحدود اور سیو کی سہولت۔",
    faq2q: "اپ گریڈ کیسے کریں؟",
    faq2a: "“گو پرو” پر کلک کریں اور وہی ای میل استعمال کریں جس سے آپ سائن اِن کرتے ہیں۔",
    disclaimer: "صرف تعلیمی مقاصد کے لیے۔ کلینیکل فیصلے کے لیے متبادل نہیں۔ ہمیشہ مقامی NICU پروٹوکول سے تصدیق کریں۔",
    // Added keys for validation & future fields
    concentrationLabel: "ارتکاز (mg/mL)",
    concentrationNote: "صرف ڈیمو۔ اصل طاقت کی تصدیق کریں۔",
    validationWeight: "براہِ کرم درست وزن (کلوگرام) درج کریں (مثلاً 2.8)۔",
    validationConcentration: "براہِ کرم درست ارتکاز (mg/mL) درج کریں۔"
  }
};

// ---------- i18n helpers ----------
function t(key) {
  const lang = document.documentElement.lang || "en";
  const dict = lang === "ur" ? i18n.ur : i18n.en;
  return dict[key] || key;
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });
}

// ---------- Public env fetch ----------
async function fetchPublicEnv() {
  const resp = await fetch("/api/public/env");
  const data = await resp.json();
  SUPABASE_URL = data.SUPABASE_URL;
  SUPABASE_ANON_KEY = data.SUPABASE_ANON_KEY;
  CHECKOUT_URL = data.CHECKOUT_URL;

  // Show checkout if provided
  const link = document.getElementById("link-checkout");
  if (link && CHECKOUT_URL) {
    link.href = CHECKOUT_URL;
    link.classList.remove("hidden");
  }

  // Init Supabase client
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const sess = await supabaseClient.auth.getSession();
  session = sess.data.session || null;

  updateAuthUI();

  // Listen for auth changes
  supabaseClient.auth.onAuthStateChange((_event, sess2) => {
    session = sess2;
    updateAuthUI();
  });
}

// ---------- Auth/UI state ----------
function updateAuthUI() {
  const authCard = document.getElementById("auth-card");
  const appCard = document.getElementById("app-card");
  const btnLogin = document.getElementById("btn-login");
  const btnLogout = document.getElementById("btn-logout");
  const badgePlan = document.getElementById("badge-plan");
  const saveBtn = document.getElementById("save-btn");

  if (session) {
    if (authCard) authCard.classList.add("hidden");
    if (appCard) appCard.classList.remove("hidden");
    if (btnLogin) btnLogin.classList.add("hidden");
    if (btnLogout) btnLogout.classList.remove("hidden");

    // Fetch user plan/usage
    fetch("/api/user/me", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => r.json())
      .then(info => {
        if (!badgePlan || !saveBtn) return;
        if (info.is_pro) {
          badgePlan.textContent = "Pro";
          badgePlan.className = "text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800";
          saveBtn.classList.remove("hidden");
        } else {
          badgePlan.textContent = "Free";
          badgePlan.className = "text-xs px-2 py-1 rounded-full bg-slate-200 text-slate-700";
          saveBtn.classList.add("hidden");
        }
      })
      .catch(() => {});
  } else {
    if (authCard) authCard.classList.remove("hidden");
    if (appCard) appCard.classList.add("hidden");
    if (btnLogin) btnLogin.classList.remove("hidden");
    if (btnLogout) btnLogout.classList.add("hidden");
  }
}

// ---------- Auth actions ----------
async function sendMagicLink() {
  const emailInput = document.getElementById("email");
  const msg = document.getElementById("auth-msg");
  const email = (emailInput && emailInput.value || "").trim();

  if (!email) {
    if (msg) msg.textContent = "Enter your email.";
    return;
  }
  const { error } = await supabaseClient.auth.signInWithOtp({ email });
  if (error) {
    if (msg) msg.textContent = "Error: " + error.message;
    return;
  }
  if (msg) msg.textContent = "Check your email for a magic link.";
}

function loginClick() {
  const authCard = document.getElementById("auth-card");
  if (authCard) authCard.scrollIntoView({ behavior: "smooth" });
}

async function logout() {
  if (supabaseClient) await supabaseClient.auth.signOut();
}

// ---------- Calculator ----------
async function doCalculation() {
  const resBox = document.getElementById("result");
  const limitMsg = document.getElementById("limit-msg");
  if (limitMsg) limitMsg.textContent = "";

  // Immediate feedback
  if (resBox) resBox.innerHTML = `<div>Calculating…</div>`;

  // Must be signed in
  if (!session) {
    if (resBox) resBox.textContent = "Please sign in first.";
    return;
  }

  // Read inputs safely
  const weightEl = document.getElementById("weight");
  const regimenEl = document.getElementById("regimen");
  const customEl = document.getElementById("customDose");

  const weight = Number((weightEl && weightEl.value) || 0);
  const regimen = (regimenEl && regimenEl.value) || "maintenance";
  const customDose = (customEl && customEl.value) ? Number(customEl.value) : null;

  // Validate weight
  if (!(weight > 0)) {
    if (resBox) resBox.textContent = t("validationWeight");
    return;
  }

  // Call API (source of truth for mg calculation)
  try {
    const resp = await fetch("/api/calc/neodose", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        weightKg: weight,
        regimen,
        customDoseMgPerKg: customDose
      })
    });

    const data = await resp.json();

    if (!resp.ok) {
      // Free plan limit reached
      if (data && data.code === "LIMIT_REACHED") {
        if (limitMsg) {
          limitMsg.textContent = `Free daily limit reached (${data.used}/${data.limit}). Consider upgrading.`;
          if (CHECKOUT_URL) {
            limitMsg.innerHTML += ` <a class="underline" href="${CHECKOUT_URL}" target="_blank" rel="noopener">Go Pro</a>`;
          }
        }
      }
      if (resBox) resBox.textContent = (data && data.error) ? data.error : "Error";
      return;
    }

    // Success: show result
    const r = data.result;
    if (resBox) {
      // Gentle warnings
      const warnings = [];
      if (weight > 6) warnings.push("Entered weight is high for a neonate—confirm units.");
      if (r.doseMgPerKg < 0.1 || r.doseMgPerKg > 50) warnings.push("Custom mg/kg appears unusual—confirm protocol.");

      resBox.innerHTML = `
        <div class="p-3 border rounded-lg bg-slate-50">
          <div><strong>Drug:</strong> ${r.drug}</div>
          <div><strong>Weight:</strong> ${r.weightKg} kg</div>
          <div><strong>Regimen:</strong> ${r.regimen}</div>
          <div><strong>Dose:</strong> ${r.doseMgPerKg} mg/kg</div>
          <div class="text-lg mt-1"><strong>Total:</strong> ${r.totalDoseMg} mg</div>
          ${warnings.length ? `<div class="text-xs text-amber-700 mt-2">⚠️ ${warnings.join(" ")}</div>` : ""}
          <div class="text-xs text-slate-600 mt-2">${r.notes}</div>
        </div>
      `;
      resBox.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  } catch (_e) {
    if (resBox) resBox.textContent = "Network error.";
  }
}

// ---------- Printing ----------
function printPage() {
  window.print();
}

// ---------- Language toggle ----------
function toggleLang() {
  const html = document.documentElement;
  if (html.lang === "ur") {
    html.lang = "en"; html.dir = "ltr";
  } else {
    html.lang = "ur"; html.dir = "rtl";
  }
  applyI18n();
}

// ---------- Safe query helper ----------
function byId(id) { return document.getElementById(id); }

// ---------- Wire up events once DOM is ready ----------
document.addEventListener("DOMContentLoaded", () => {
  // Load config + then apply i18n
  fetchPublicEnv().then(applyI18n);

  const calcBtn = byId("calc-btn");
  if (calcBtn) calcBtn.addEventListener("click", doCalculation);

  const sendBtn = byId("send-magic");
  if (sendBtn) sendBtn.addEventListener("click", sendMagicLink);

  const langBtn = byId("btn-lang");
  if (langBtn) langBtn.addEventListener("click", toggleLang);

  const loginBtn = byId("btn-login");
  if (loginBtn) loginBtn.addEventListener("click", loginClick);

  const logoutBtn = byId("btn-logout");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  const printBtn = byId("print-btn");
  if (printBtn) printBtn.addEventListener("click", printPage);
});
