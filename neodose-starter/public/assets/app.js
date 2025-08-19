// public/assets/app.js
let SUPABASE_URL = "";
let SUPABASE_ANON_KEY = "";
let CHECKOUT_URL = "";
let supabaseClient = null;
let session = null;
let i18n = {
  en: {
    heroTitle: "One‑page neonatal dose calculator",
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
    disclaimer: "Education only. Not a substitute for clinical judgment. Always confirm with local neonatal protocols."
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
    disclaimer: "صرف تعلیمی مقاصد کے لیے۔ کلینیکل فیصلے کے لیے متبادل نہیں۔ ہمیشہ مقامی NICU پروٹوکول سے تصدیق کریں۔"
  }
};

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

async function fetchPublicEnv() {
  const resp = await fetch("/api/public/env");
  const data = await resp.json();
  SUPABASE_URL = data.SUPABASE_URL;
  SUPABASE_ANON_KEY = data.SUPABASE_ANON_KEY;
  CHECKOUT_URL = data.CHECKOUT_URL;
  if (CHECKOUT_URL) {
    const link = document.getElementById("link-checkout");
    link.href = CHECKOUT_URL;
    link.classList.remove("hidden");
  }
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  session = (await supabaseClient.auth.getSession()).data.session;
  updateAuthUI();
  supabaseClient.auth.onAuthStateChange((_event, sess) => {
    session = sess;
    updateAuthUI();
  });
}

function updateAuthUI() {
  const authCard = document.getElementById("auth-card");
  const appCard = document.getElementById("app-card");
  const btnLogin = document.getElementById("btn-login");
  const btnLogout = document.getElementById("btn-logout");
  const badgePlan = document.getElementById("badge-plan");
  const saveBtn = document.getElementById("save-btn");

  if (session) {
    authCard.classList.add("hidden");
    appCard.classList.remove("hidden");
    btnLogin.classList.add("hidden");
    btnLogout.classList.remove("hidden");
    // Fetch user plan
    fetch("/api/user/me", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => r.json())
      .then(info => {
        if (info.is_pro) {
          badgePlan.textContent = "Pro";
          badgePlan.className = "text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800";
          saveBtn.classList.remove("hidden");
        } else {
          badgePlan.textContent = "Free";
          saveBtn.classList.add("hidden");
        }
      });
  } else {
    authCard.classList.remove("hidden");
    appCard.classList.add("hidden");
    btnLogin.classList.remove("hidden");
    btnLogout.classList.add("hidden");
  }
}

async function sendMagicLink() {
  const email = document.getElementById("email").value.trim();
  const msg = document.getElementById("auth-msg");
  if (!email) { msg.textContent = "Enter your email."; return; }
  const { error } = await supabaseClient.auth.signInWithOtp({ email });
  if (error) { msg.textContent = "Error: " + error.message; return; }
  msg.textContent = "Check your email for a magic link.";
}

async function doCalculation() {
  const weight = Number(document.getElementById("weight").value || 0);
  const regimen = document.getElementById("regimen").value;
  const customDose = document.getElementById("customDose").value ? Number(document.getElementById("customDose").value) : null;
  const resBox = document.getElementById("result");
  const limitMsg = document.getElementById("limit-msg");
  limitMsg.textContent = "";
  resBox.textContent = "";

  if (!session) {
    resBox.textContent = "Please sign in first.";
    return;
  }

  const payload = { weightKg: weight, regimen, customDoseMgPerKg: customDose };
  const resp = await fetch("/api/calc/neodose", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${session.access_token}`
    },
    body: JSON.stringify(payload)
  });

  const data = await resp.json();
  if (!resp.ok) {
    if (data.code === "LIMIT_REACHED") {
      limitMsg.textContent = `Free daily limit reached (${data.used}/${data.limit}). Consider upgrading.`;
      if (CHECKOUT_URL) {
        limitMsg.innerHTML += ` <a class="underline" href="${CHECKOUT_URL}" target="_blank" rel="noopener">Go Pro</a>`;
      }
    } else {
      resBox.textContent = data.error || "Error";
    }
    return;
  }

  const r = data.result;
  resBox.innerHTML = `
    <div class="p-3 border rounded-lg bg-slate-50">
      <div><strong>Drug:</strong> ${r.drug}</div>
      <div><strong>Weight:</strong> ${r.weightKg} kg</div>
      <div><strong>Regimen:</strong> ${r.regimen}</div>
      <div><strong>Dose:</strong> ${r.doseMgPerKg} mg/kg</div>
      <div class="text-lg mt-1"><strong>Total:</strong> ${r.totalDoseMg} mg</div>
      <div class="text-xs text-slate-600 mt-2">${r.notes}</div>
    </div>
  `;
}

function printPage() {
  window.print();
}

function toggleLang() {
  const html = document.documentElement;
  if (html.lang === "ur") {
    html.lang = "en"; html.dir = "ltr";
  } else {
    html.lang = "ur"; html.dir = "rtl";
  }
  applyI18n();
}

function loginClick() {
  document.getElementById("auth-card").scrollIntoView({ behavior: "smooth" });
}

async function logout() {
  if (supabaseClient) await supabaseClient.auth.signOut();
}

document.addEventListener("DOMContentLoaded", () => {
  fetchPublicEnv().then(applyI18n);
  document.getElementById("send-magic").addEventListener("click", sendMagicLink);
  document.getElementById("calc-btn").addEventListener("click", doCalculation);
  document.getElementById("btn-lang").addEventListener("click", toggleLang);
  document.getElementById("btn-login").addEventListener("click", loginClick);
  document.getElementById("btn-logout").addEventListener("click", logout);
  document.getElementById("print-btn").addEventListener("click", printPage);
});
