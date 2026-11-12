"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BUSINESS_TYPES, businessType, DOMAIN_PRICE, FEATURES, GOALS, LANGS, PLAN_ORDER, PLANS, REGISTRARS, STYLES, WHATSAPP,
  type FieldDef, type PlanKey,
} from "@/lib/config";
import { ICONS, Mark } from "./Icons";

const KEY = "bizzone-onboarding-draft-v4";

export type FormData = {
  plan: string; bizName: string; contact: string; email: string; phone: string; website: string;
  businessType: string; businessTypeOther: string; goal: string;
  pages: string[]; customPages: string[]; features: string[]; languages: string;
  headline: string; about: string; services: string; priceDisplay: string; priceList: string;
  details: Record<string, string | string[]>; notes: string;
  domainStatus: string; domainName: string; registrar: string; domainAccount: string;
  domainBuyer: string; domainWanted: string; domainBackups: string;
  style: string; logo: string; logoPaid: string; inspo: string; colors: string;
};

const EMPTY: FormData = {
  plan: "", bizName: "", contact: "", email: "", phone: "", website: "",
  businessType: "", businessTypeOther: "", goal: "",
  pages: [], customPages: [], features: [], languages: "One",
  headline: "", about: "", services: "", priceDisplay: "", priceList: "",
  details: {}, notes: "",
  domainStatus: "", domainName: "", registrar: "", domainAccount: "",
  domainBuyer: "", domainWanted: "", domainBackups: "",
  style: "", logo: "", logoPaid: "", inspo: "", colors: "",
};

const STEPS: [string, string, string, string, string][] = [
  // sidebar title, sidebar sub, heading, lede, time
  ["Your business", "Plan and basics", "About your business", "Just the basics, so we know who you are.", "1 minute"],
  ["Pages", "Already picked for you", "Your pages", "We picked the right pages for your business. Change anything you like, or just continue.", "15 seconds"],
  ["Your words", "Short notes are fine", "Tell us about it", "Short notes are fine. We’ll write it nicely for you. Not sure? Skip it, we’ll ask you on WhatsApp.", "2 minutes"],
  ["Domain and look", "Then send", "Domain and look", "Last step. Then tap Send and you’re done.", "1 minute"],
];
const TOTAL = STEPS.length;

const rank = (k: string) => PLAN_ORDER.indexOf(k as PlanKey);
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

type Errors = Record<string, string>;

function logAttempt(status: "success" | "failed", reason: string, d: FormData) {
  fetch("/api/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, reason, name: d.contact, business: d.bizName, email: d.email, phone: d.phone }),
    keepalive: true,
  }).catch(() => {});
}

export default function LeadForm() {
  const [d, setD] = useState<FormData>(EMPTY);
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [newPage, setNewPage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<null | { name: string; biz: string; steps: [string, string][] }>(null);
  const [loaded, setLoaded] = useState(false);
  const [linkPlan, setLinkPlan] = useState("");
  const [showPlans, setShowPlans] = useState(false);
  const headRef = useRef<HTMLHeadingElement>(null);

  // Restore draft from this device.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.d) setD({ ...EMPTY, ...s.d, details: s.d.details || {} });
        if (s.step) setStep(Math.min(s.step, TOTAL));
        if (s.maxStep) setMaxStep(Math.min(s.maxStep, TOTAL));
      }
    } catch {}
    // Plan can come from the link we send the client: /?plan=premium
    const lp = new URLSearchParams(window.location.search).get("plan")?.toLowerCase() || "";
    if (lp in PLANS) {
      setLinkPlan(lp);
      setD((p) => (p.plan ? p : { ...p, plan: lp }));
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded || done) return;
    try { localStorage.setItem(KEY, JSON.stringify({ d, step, maxStep })); } catch {}
  }, [d, step, maxStep, loaded, done]);

  // Mobile: while the keyboard is open, hide the sticky action bar and un-stick the top bar
  // so the field being typed in stays visible. Restored as soon as the keyboard closes.
  useEffect(() => {
    const root = document.documentElement;
    const isTyping = (el: Element | null) =>
      !!el && (el.matches("textarea, select") || (el.matches("input") && !el.matches("[type=radio],[type=checkbox],[type=button],[type=submit]")));
    const small = () => window.matchMedia("(max-width: 980px)").matches;
    let t: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const vv = window.visualViewport;
        const kbByViewport = !!vv && vv.height < window.innerHeight * 0.8;
        root.classList.toggle("kb-open", small() && (isTyping(document.activeElement) || kbByViewport));
      }, 60);
    };
    const onFocus = (e: FocusEvent) => {
      update();
      const el = e.target as HTMLElement;
      if (small() && isTyping(el)) setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
    };
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", update);
      window.visualViewport?.removeEventListener("resize", update);
      root.classList.remove("kb-open");
    };
  }, []);

  // Enter in a one-line field moves to the next field instead of submitting the step.
  function onFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    const el = e.target as HTMLElement;
    if (e.key !== "Enter" || !el.matches("input") || el.matches("[type=radio],[type=checkbox]")) return;
    if (el.closest(".addpage")) return; // "Add page" box handles its own Enter
    e.preventDefault();
    const fields = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("input:not([type=radio]):not([type=checkbox]):not([disabled]), textarea, select"));
    const next = fields[fields.indexOf(el) + 1];
    if (next) next.focus();
    else (el as HTMLInputElement).blur();
  }

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => {
    setD((p) => ({ ...p, [k]: v }));
    setErrors((e) => (e[k as string] ? { ...e, [k as string]: "" } : e));
  };
  const setDetail = (id: string, v: string | string[]) => {
    setD((p) => ({ ...p, details: { ...p.details, [id]: v } }));
    setErrors((e) => (e["d_" + id] ? { ...e, ["d_" + id]: "" } : e));
  };

  const bt = businessType(d.businessType);
  const plan = (d.plan || "") as PlanKey | "";
  const allow = plan ? PLANS[plan].pages : 5;
  const allPages = [...d.pages, ...d.customPages];
  const pageCount = allPages.length;
  const atLimit = pageCount >= allow;
  const extras = FEATURES.filter((f) => d.features.includes(f.id) && plan && rank(f.level) > rank(plan));
  const domainFee = d.domainStatus === "need" && d.domainBuyer === "bizzone" ? DOMAIN_PRICE : 0;

  function chooseType(id: string) {
    const t = businessType(id);
    setD((p) => ({
      ...p,
      businessType: id,
      pages: t ? t.core.slice(0, p.plan ? PLANS[p.plan as PlanKey].pages : 5) : [],
      customPages: [],
      features: id === "ecommerce" && !p.features.includes("store") ? [...p.features, "store"] : p.features,
    }));
    setErrors((e) => ({ ...e, businessType: "" }));
  }

  function togglePage(name: string) {
    if (d.pages.includes(name)) set("pages", d.pages.filter((x) => x !== name));
    else if (!atLimit) set("pages", [...d.pages, name]);
  }
  function addCustom() {
    const n = newPage.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!n || atLimit) return;
    if (allPages.some((p) => p.toLowerCase() === n.toLowerCase())) { setNewPage(""); return; }
    set("customPages", [...d.customPages, n]);
    setNewPage("");
  }

  // Only the essentials are required. Everything else is optional; the PM follows up on WhatsApp.
  function validate(s: number): Errors {
    const e: Errors = {};
    const req = (k: keyof FormData, msg: string) => { if (!String(d[k] ?? "").trim()) e[k] = msg; };
    if (s === 1) {
      req("plan", "Please pick the plan you bought.");
      req("bizName", "Please add your business name.");
      req("contact", "Please add your name.");
      if (!isEmail(d.email)) e.email = "Please add a valid email.";
      if (d.phone.replace(/\D/g, "").length < 7) e.phone = "Please add a valid phone number.";
      req("businessType", "Please pick your type of business.");
      if (d.businessType === "other") req("businessTypeOther", "Please tell us your type of business.");
    }
    if (s === 2) {
      if (pageCount === 0) e.pages = "Please pick at least one page.";
      if (pageCount > allow) e.pages = `Your ${plan ? PLANS[plan].name : ""} plan includes ${allow} pages. Please remove ${pageCount - allow}.`;
    }
    if (s === 4) {
      req("domainStatus", "Please pick one.");
      if (d.domainStatus === "own") req("domainName", "Please add your domain.");
    }
    return e;
  }

  function go(n: number) {
    setStep(n);
    setFormError("");
    window.scrollTo({ top: 0 });
    setTimeout(() => headRef.current?.focus(), 30);
  }

  async function next(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate(step);
    if (Object.keys(e).length) {
      setErrors(e);
      const msg = "Please check the highlighted answers.";
      setFormError(msg);
      logAttempt("failed", `Step ${step}: ${Object.values(e)[0]}`, d);
      setTimeout(() => document.querySelector<HTMLElement>("[aria-invalid='true'], .error:not(:empty)")?.scrollIntoView({ block: "center", behavior: "smooth" }), 20);
      return;
    }
    setErrors({});
    if (step < TOTAL) { const n = step + 1; setMaxStep((m) => Math.max(m, n)); go(n); return; }
    // Final submit
    for (let s = 1; s <= TOTAL; s++) { if (Object.keys(validate(s)).length) { go(s); setErrors(validate(s)); return; } }
    setSending(true);
    setFormError("");
    try {
      const res = await fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(j.error || "We couldn’t send your form. Please try again.");
        return; // server logs its own failure
      }
      setDone({ name: d.contact.split(" ")[0] || "there", biz: d.bizName || "your business", steps: doneSteps() });
      try { localStorage.removeItem(KEY); } catch {}
      window.scrollTo({ top: 0 });
    } catch {
      setFormError("Connection problem. Please check your internet and try again.");
      logAttempt("failed", "Network error on submit", d);
    } finally {
      setSending(false);
    }
  }

  function doneSteps(): [string, string][] {
    const st: [string, string][] = [["We review your details", "Your project manager checks everything within 24 hours."]];
    if (extras.length || domainFee) st.push(["We go over your extras", "Your project manager will message you. Nothing has been charged."]);
    st.push(["You send us your files", "Your project manager will message you to collect your logo, photos and files."]);
    if (d.domainStatus === "own") st.push(["We connect your domain", `We’ll guide you through connecting ${d.domainName || "your domain"}.`]);
    if (d.domainStatus === "need") st.push(["We set up your domain", d.domainBuyer !== "client" ? `We check ${d.domainWanted || "your domain"} is available, then register it in your business name.` : "We send you a 2-minute guide to buy your domain."]);
    if (d.domainStatus === "unsure") st.push(["We sort out your domain", "Your project manager will message you to check."]);
    if ((d.logo === "need" || d.logo === "update") && d.logoPaid !== "yes") st.push(["We share logo options", "Your project manager will message you with options and a price."]);
    st.push(["We build your website", `It goes live in ${plan ? PLANS[plan].live : "a few days"} once we have your content.`]);
    return st;
  }

  const inv = (k: string) => (errors[k] ? { "aria-invalid": true as const } : {});
  const Err = ({ k }: { k: string }) => <p className="error">{errors[k] || ""}</p>;

  const fitStatus = !plan ? "Pick your plan in step 1."
    : pageCount > allow ? `${pageCount} pages picked, ${allow} included.`
    : extras.length ? "We’ll message you about the extras."
    : "Everything you picked is included.";

  /* ---------------- Done screen ---------------- */
  if (done) {
    const msg = `Hi BizzOne, I just sent my project setup form for ${done.biz}.`;
    return (
      <div className="app">
        <Side step={TOTAL + 1} maxStep={TOTAL + 1} go={() => {}} planName={plan ? PLANS[plan].name : "—"} fit="Form sent. Thank you!" />
        <div className="main">
          <TopBar step={TOTAL} />
          <section className="finish" aria-labelledby="doneTitle">
            <div className="big"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg></div>
            <h1 id="doneTitle">You’re all set.</h1>
            <p className="lede">Thanks, {done.name}. We’ve received the details for {done.biz}. Here’s what happens next.</p>
            <div className="card">
              <p className="card-title">What happens next</p>
              <ol className="timeline-steps">
                {done.steps.map((s) => <li key={s[0]}><span className="tdot" aria-hidden="true" /><div><strong>{s[0]}</strong><p>{s[1]}</p></div></li>)}
              </ol>
            </div>
            <div className="card">
              <p className="card-title">Questions? Message us</p>
              <p className="card-help">Use the app you already chat with us on. Your project manager will reply there.</p>
              <Channels waText={msg} />
            </div>
            <button type="button" className="reset" onClick={() => { setDone(null); setD(EMPTY); setStep(1); setMaxStep(1); }}>Start a new form</button>
          </section>
        </div>
      </div>
    );
  }

  /* ---------------- Form ---------------- */
  const [, , heading, lede, time] = STEPS[step - 1];

  return (
    <div className="app">
      <Side step={step} maxStep={maxStep} go={go} planName={plan ? PLANS[plan].name : "—"} fit={fitStatus} />
      <div className="main">
        <TopBar step={step} />
        <form onSubmit={next} onKeyDown={onFormKeyDown} noValidate>
          <div className="wrap">
            <section aria-labelledby={`h-${step}`} key={step} data-step={step}>
              <div className="head">
                <p className="kicker">Step {step} of {TOTAL} <span className="time">{time}</span></p>
                <h1 id={`h-${step}`} ref={headRef} tabIndex={-1}>{heading}</h1>
                <p className="lede">{lede}</p>
              </div>

              {/* STEP 1: Plan (compact when it came from the link) */}
              {step === 1 && plan && linkPlan === plan && !showPlans && (
                <div className="rec-ok" style={{ marginBottom: 18 }}>
                  <span className="ico">{ICONS.check}</span>
                  <div style={{ flex: 1 }}><b>Your plan: {PLANS[plan].name}</b>{PLANS[plan].chips.join(" · ")}</div>
                  <button type="button" className="edit" onClick={() => setShowPlans(true)}>Change</button>
                </div>
              )}
              {step === 1 && !(plan && linkPlan === plan && !showPlans) && (
                <fieldset className="card">
                  <legend className="card-title">Which plan did you buy?</legend>
                  <div className="plans">
                    {PLAN_ORDER.map((k) => {
                      const p = PLANS[k];
                      return (
                        <label className="tile plan" key={k}>
                          <input type="radio" name="plan" value={k} checked={d.plan === k} onChange={() => {
                            set("plan", k);
                            // Trim pages if the new plan allows fewer.
                            setD((prev) => {
                              const lim = PLANS[k].pages, tot = prev.pages.length + prev.customPages.length;
                              if (tot <= lim) return { ...prev, plan: k };
                              const keepCustom = prev.customPages.slice(0, Math.max(0, lim - prev.pages.length));
                              return { ...prev, plan: k, pages: prev.pages.slice(0, lim), customPages: prev.pages.length >= lim ? [] : keepCustom };
                            });
                          }} />
                          <Mark />
                          <span className="tx">
                            <span className="ptop"><span className="pname">{p.name}</span><span className="pprice">${p.price} one-time</span>{k === "premium" && <span className="badge">Most popular</span>}</span>
                            <span className="pblurb">{p.blurb}</span>
                            <span className="chips">{p.chips.map((c) => <span className="chip" key={c}>{c}</span>)}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <Err k="plan" />
                  <div className="includes">
                    {["Custom-coded, no templates", "Hosting and SSL", "Mobile-first design", "Domain connection"].map((t) => <span key={t}>{ICONS.check}{t}</span>)}
                  </div>
                </fieldset>
              )}

              {/* STEP 2: Business */}
              {step === 1 && (
                <>
                  <div className="card">
                    <div className="grid">
                      <TextField id="bizName" label="Business name" value={d.bizName} onChange={(v) => set("bizName", v)} err={errors.bizName} auto="organization" />
                      <TextField id="contact" label="Your name" value={d.contact} onChange={(v) => set("contact", v)} err={errors.contact} auto="name" />
                      <TextField id="email" type="email" label="Email" value={d.email} onChange={(v) => set("email", v)} err={errors.email} auto="email" />
                      <TextField id="phone" type="tel" label="Phone" value={d.phone} onChange={(v) => set("phone", v)} err={errors.phone} auto="tel" />
                      <TextField id="website" type="url" label="Current website" optional full value={d.website} onChange={(v) => set("website", v)} placeholder="https://" />
                    </div>
                    <p className="hint" style={{ marginTop: 12 }}>We’ll show this phone and email on your website, so customers can reach you.</p>
                  </div>
                  <fieldset className="card">
                    <legend className="card-title">What type of business is it?</legend>
                    <p className="card-help">We’ll suggest the right pages for you.</p>
                    <div className="tiles">
                      {BUSINESS_TYPES.map((b) => (
                        <label className="tile" key={b.id}>
                          <input type="radio" name="businessType" value={b.id} checked={d.businessType === b.id} onChange={() => chooseType(b.id)} />
                          <span className="ico">{ICONS[b.icon]}</span>
                          <span className="tx"><strong>{b.label}</strong><span>{b.help}</span></span>
                          <Mark />
                        </label>
                      ))}
                    </div>
                    <Err k="businessType" />
                    {d.businessType === "other" && (
                      <div className="field q">
                        <label htmlFor="businessTypeOther">Your type of business</label>
                        <input type="text" id="businessTypeOther" value={d.businessTypeOther} onChange={(e) => set("businessTypeOther", e.target.value)} placeholder="For example: Photography studio" maxLength={80} {...inv("businessTypeOther")} />
                        <Err k="businessTypeOther" />
                      </div>
                    )}
                  </fieldset>
                  <fieldset className="card">
                    <legend className="card-title">What’s the main goal for your website? <span className="opt">(optional)</span></legend>
                    <div className="tiles">
                      {GOALS.map(([g, ic]) => (
                        <label className="tile" key={g}>
                          <input type="radio" name="goal" value={g} checked={d.goal === g} onChange={() => set("goal", g)} />
                          <span className="ico">{ICONS[ic]}</span>
                          <span className="tx"><strong>{g}</strong></span>
                          <Mark />
                        </label>
                      ))}
                    </div>
                    <Err k="goal" />
                  </fieldset>
                </>
              )}

              {/* STEP 3: Pages & features */}
              {step === 2 && (
                <>
                  <fieldset className="card">
                    <legend className="card-title">Pick your pages</legend>
                    <p className="card-help">{bt ? `Suggested for ${bt.id === "other" && d.businessTypeOther ? d.businessTypeOther : bt.label.toLowerCase()}. The main pages are already ticked.` : "Pick your type of business in step 2 to see suggested pages."}</p>
                    <div className={"meter" + (pageCount > allow ? " over" : "")}>
                      <div className="track"><div className="fill" style={{ width: Math.min(100, Math.round((pageCount / allow) * 100)) + "%" }} /></div>
                      <b aria-live="polite">{pageCount} of {allow} pages in {plan ? PLANS[plan].name : "your plan"}</b>
                    </div>
                    <div className="pchips">
                      {(bt ? [...bt.core, ...bt.extra] : []).map((p) => {
                        const on = d.pages.includes(p);
                        return (
                          <label className="pchip" key={p} style={!on && atLimit ? { opacity: 0.45 } : undefined}>
                            <input type="checkbox" checked={on} disabled={!on && atLimit} onChange={() => togglePage(p)} />
                            <span>{p}</span>
                          </label>
                        );
                      })}
                      {d.customPages.map((p) => (
                        <label className="pchip custom" key={"c-" + p}>
                          <input type="checkbox" checked onChange={() => set("customPages", d.customPages.filter((x) => x !== p))} />
                          <span>{p}</span>
                        </label>
                      ))}
                    </div>
                    <div className="addpage">
                      <input type="text" value={newPage} onChange={(e) => setNewPage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }} placeholder={atLimit ? "Page limit reached" : "Need another page? Type it here, e.g. Careers"} aria-label="New page name" maxLength={40} disabled={atLimit} />
                      <button type="button" className="btn btn-ghost" onClick={addCustom} disabled={atLimit}>+ Add page</button>
                    </div>
                    <Err k="pages" />
                    {atLimit && plan && (
                      <div className="note">{ICONS.info}<span><strong>You’ve used all {allow} pages in {PLANS[plan].name}.</strong> Untick a page to swap it{plan !== "advanced" ? <>, or go back to step 1 to pick a bigger plan</> : null}.</span></div>
                    )}
                  </fieldset>
                  <fieldset className="card">
                    <legend className="card-title">Features</legend>
                    <p className="card-help">Tap the ones you want.</p>
                    <div className="tiles">
                      {FEATURES.map((f) => {
                        const on = d.features.includes(f.id);
                        const incl = plan && rank(f.level) <= rank(plan);
                        return (
                          <label className="tile sq" key={f.id}>
                            <input type="checkbox" checked={on} onChange={() => set("features", on ? d.features.filter((x) => x !== f.id) : [...d.features, f.id])} />
                            <span className="ico">{ICONS[f.id]}</span>
                            <span className="tx"><strong>{f.title}</strong><span>{f.help}</span></span>
                            {plan && <span className={incl ? "incl" : "incl paid"}>{incl ? "Included" : PLANS[f.level].name}</span>}
                            <Mark />
                          </label>
                        );
                      })}
                    </div>
                    {extras.length > 0 && plan && (
                      <div className="note">{ICONS.info}<span><strong>{extras.map((f) => f.title).join(", ")}</strong> {extras.length > 1 ? "aren’t" : "isn’t"} part of {PLANS[plan].name}. That’s okay. Your project manager will message you about it. Nothing is charged here.</span></div>
                    )}
                  </fieldset>
                  <div className="card">
                    <fieldset className="q">
                      <legend className="q-label">Languages</legend>
                      <div className="seg">
                        {LANGS.map((l) => <label key={l}><input type="radio" name="languages" checked={d.languages === l} onChange={() => set("languages", l)} /><span>{l}</span></label>)}
                      </div>
                    </fieldset>
                  </div>
                </>
              )}

              {/* STEP 4: Words + business details */}
              {step === 3 && (
                <>
                  <div className="card">
                    <p className="card-title">Your words</p>
                    <p className="card-help">All optional. Write like you’re talking to a customer. A few words is enough.</p>
                    <div className="grid">
                      <TextField id="headline" full label="Homepage headline" value={d.headline} onChange={(v) => set("headline", v)} err={errors.headline} placeholder="For example: Your trusted local cleaning team" hint="The first line visitors see. A rough idea works." />
                      <TextArea id="about" label="About your business" value={d.about} onChange={(v) => set("about", v)} err={errors.about} placeholder="How you started, what makes you different, years in business" />
                      <TextArea id="services" label={d.businessType === "ecommerce" ? "Your products" : "Your services"} value={d.services} onChange={(v) => set("services", v)} err={errors.services} placeholder={d.businessType === "ecommerce" ? "Your main products or best sellers" : "List each service with a short description"} />
                    </div>
                  </div>

                  {bt && bt.fields.length > 0 && (
                    <div className="card">
                      <p className="card-title">{ICONS[bt.icon]}About your {bt.id === "other" ? "business" : bt.label.toLowerCase()}</p>
                      <p className="card-help">Just tap what fits. Skip anything you’re not sure about.</p>
                      {bt.fields.map((f) => <DetailField key={f.id} f={f} value={d.details[f.id]} onChange={(v) => setDetail(f.id, v)} err={errors["d_" + f.id]} />)}
                    </div>
                  )}

                  <fieldset className="card">
                    <legend className="card-title">Should your website show prices? <span className="opt">(optional)</span></legend>
                    <div className="tiles one">
                      {[["full", "Show my full prices", "Customers see exact prices."], ["from", "Show “starting from” prices", "A guide price, final price on request."], ["quote", "No prices, ask for a quote", "Customers contact you for a price."]].map(([v, t, h]) => (
                        <label className="tile" key={v}>
                          <input type="radio" name="priceDisplay" checked={d.priceDisplay === v} onChange={() => set("priceDisplay", v)} />
                          <span className="tx"><strong>{t}</strong><span>{h}</span></span>
                          <Mark />
                        </label>
                      ))}
                    </div>
                    <Err k="priceDisplay" />
                    {(d.priceDisplay === "full" || d.priceDisplay === "from") && (
                      <div className="field q">
                        <label htmlFor="priceList">Your prices <span className="opt">(optional)</span></label>
                        <textarea id="priceList" value={d.priceList} onChange={(e) => set("priceList", e.target.value)} placeholder="For example: Deep clean – $199, Move-out clean – from $249. You can also send these later." />
                      </div>
                    )}
                  </fieldset>

                  <div className="card">
                    <p className="card-title">Anything else?</p>
                    <div className="field">
                      <label htmlFor="notes">Offers, packages, special requests <span className="opt">(optional)</span></label>
                      <textarea id="notes" value={d.notes} onChange={(e) => set("notes", e.target.value)} />
                    </div>
                    <div className="note">{ICONS.upload}<span>After you submit, your project manager will message you to collect your logo, photos and any files.</span></div>
                  </div>
                </>
              )}

              {/* STEP 5: Domain */}
              {step === 4 && (
                <>
                  <fieldset className="card">
                    <legend className="card-title">Do you already have a domain?</legend>
                    <div className="tiles three">
                      {[["own", "Yes, I own one", "We’ll connect it"], ["need", "No, I need one", "You or we can buy it"], ["unsure", "I’m not sure", "We’ll check together"]].map(([v, t, h]) => (
                        <label className="tile" key={v}>
                          <input type="radio" name="domainStatus" checked={d.domainStatus === v} onChange={() => set("domainStatus", v)} />
                          <span className="tx"><strong>{t}</strong><span>{h}</span></span>
                          <Mark />
                        </label>
                      ))}
                    </div>
                    <Err k="domainStatus" />
                  </fieldset>
                  {d.domainStatus === "own" && (
                    <div className="card">
                      <div className="grid">
                        <TextField id="domainName" label="Your domain" value={d.domainName} onChange={(v) => set("domainName", v)} err={errors.domainName} placeholder="yourbusiness.com" />
                        <div className="field">
                          <label htmlFor="registrar">Where did you buy it?</label>
                          <select id="registrar" value={d.registrar} onChange={(e) => set("registrar", e.target.value)} {...inv("registrar")}>
                            <option value="">Choose one</option>
                            {REGISTRARS.map((r) => <option key={r}>{r}</option>)}
                          </select>
                          <Err k="registrar" />
                        </div>
                        <TextField id="domainAccount" full optional label="Account email or username with your provider" value={d.domainAccount} onChange={(v) => set("domainAccount", v)} placeholder="The email you use to log in to GoDaddy, Namecheap, etc." hint="Please don’t share passwords. Our team will guide you on the next step." />
                      </div>
                    </div>
                  )}
                  {d.domainStatus === "need" && (
                    <div className="card">
                      <fieldset>
                        <legend className="q-label">How should we get your domain?</legend>
                        <div className="tiles one">
                          {[["paid", "I already paid BizzOne for my domain", "No domain fee. We’ll set it up for you."], ["bizzone", "Please buy it for me", `$${DOMAIN_PRICE}. We register it in your business name, so it’s always yours.`], ["client", "I’ll buy it myself", "We send a 2-minute guide, then connect it."]].map(([v, t, h]) => (
                            <label className="tile" key={v}>
                              <input type="radio" name="domainBuyer" checked={d.domainBuyer === v} onChange={() => set("domainBuyer", v)} />
                              <span className="tx"><strong>{t}</strong><span>{h}</span></span>
                              <Mark />
                            </label>
                          ))}
                        </div>
                        <Err k="domainBuyer" />
                      </fieldset>
                      {d.domainBuyer === "paid" && <div className="note">{ICONS.trust}<span><strong>Great, no domain fee.</strong> Your project manager will match it to your earlier payment.</span></div>}
                      {d.domainBuyer === "bizzone" && <div className="note">{ICONS.info}<span><strong>Nothing is charged now.</strong> We’ll check your domain is available and message you about the ${DOMAIN_PRICE}.</span></div>}
                      <div className="grid q">
                        <TextField id="domainWanted" label="Domain you’d like" value={d.domainWanted} onChange={(v) => set("domainWanted", v)} err={errors.domainWanted} placeholder="yourbusiness.com" />
                        <TextField id="domainBackups" optional label="Backup choices" value={d.domainBackups} onChange={(v) => set("domainBackups", v)} placeholder="In case it’s taken" />
                      </div>
                    </div>
                  )}
                  {d.domainStatus === "unsure" && <div className="note">{ICONS.info}<span>No problem. Your project manager will message you to check and sort it out. It won’t delay your project.</span></div>}
                </>
              )}

              {/* STEP 6: Brand */}
              {step === 4 && (
                <>
                  <fieldset className="card">
                    <legend className="card-title">Pick a style</legend>
                    <div className="tiles">
                      {STYLES.map(([n, h, sw]) => (
                        <label className="tile" key={n}>
                          <input type="radio" name="style" checked={d.style === n} onChange={() => set("style", n)} />
                          <span className="sw" aria-hidden="true">{sw.map((c) => <i key={c} style={{ background: c }} />)}</span>
                          <span className="tx"><strong>{n}</strong><span>{h}</span></span>
                          <Mark />
                        </label>
                      ))}
                    </div>
                    <Err k="style" />
                  </fieldset>
                  <div className="card">
                    <fieldset>
                      <legend className="q-label">Do you have a logo?</legend>
                      <div className="seg">
                        {[["have", "Yes"], ["update", "Needs a refresh"], ["need", "No, I need one"]].map(([v, t]) => (
                          <label key={v}><input type="radio" name="logo" checked={d.logo === v} onChange={() => set("logo", v)} /><span>{t}</span></label>
                        ))}
                      </div>
                      <Err k="logo" />
                      {(d.logo === "need" || d.logo === "update") && (
                        <fieldset className="q">
                          <legend className="q-label">Logo design is a separate service. Have you already paid our team for it?</legend>
                          <div className="seg">
                            <label><input type="radio" name="logoPaid" checked={d.logoPaid === "no"} onChange={() => set("logoPaid", "no")} /><span>No, not yet</span></label>
                            <label><input type="radio" name="logoPaid" checked={d.logoPaid === "yes"} onChange={() => set("logoPaid", "yes")} /><span>Yes, I already paid</span></label>
                          </div>
                          <Err k="logoPaid" />
                        </fieldset>
                      )}
                      {(d.logo === "need" || d.logo === "update") && d.logoPaid === "no" && <div className="note">{ICONS.info}<span>Logo design is a separate creative service. Your project manager will message you with options and a clear price. Your website won’t wait on it.</span></div>}
                      {(d.logo === "need" || d.logo === "update") && d.logoPaid === "yes" && <div className="note">{ICONS.trust}<span><strong>Your logo design is already paid for.</strong> No extra charge. Our designer will reach out to get started.</span></div>}
                    </fieldset>
                    <div className="field q"><label htmlFor="inspo">Websites you like <span className="opt">(optional)</span></label><input type="text" id="inspo" value={d.inspo} onChange={(e) => set("inspo", e.target.value)} placeholder="Paste a link or two" /></div>
                  </div>
                  <div className="card">
                    <div className="field">
                      <label htmlFor="colors">Your brand colours <span className="opt">(optional)</span></label>
                      <input type="text" id="colors" value={d.colors} onChange={(e) => set("colors", e.target.value)} placeholder="For example: navy blue and gold, or #0B2545, #C9A227" maxLength={200} />
                      <p className="hint">Not sure? Leave it empty and our designer will match your logo and style.</p>
                    </div>
                  </div>
                </>
              )}

              {/* STEP 4 (end): quick check before sending */}
              {step === 4 && (
                <>
                  <p className="q-label" style={{ marginTop: 26 }}>Quick check before you send</p>
                  <div className="rv">
                    <Rv ic="biz" t="Your business" s={1} go={go} body={[d.bizName, plan ? `${PLANS[plan].name} plan` : "", bt ? (bt.id === "other" ? d.businessTypeOther : bt.label) : "", d.phone, d.email].filter(Boolean).join(" · ")} />
                    <Rv ic="pages" t={`Pages (${pageCount})`} s={2} go={go} body={allPages.join(", ")} />
                    <Rv ic="words" t="Your words" s={3} go={go} body={d.headline ? `“${d.headline}”` : "Skipped. We’ll ask you on WhatsApp."} />
                  </div>
                  <div className="summary">
                    <h3>What happens next</h3>
                    <p>Your {plan ? PLANS[plan].name : ""} website goes live in <strong>{plan ? PLANS[plan].live : "a few days"}</strong> once we have your content and approvals.</p>
                    {domainFee || extras.length ? (
                      <>
                        <div className="total"><span>Extras your project manager will go over with you</span><span>{domainFee ? `$${domainFee}+` : "TBC"}</span></div>
                        {domainFee ? <p>Domain purchase and setup: ${domainFee}</p> : null}
                        {extras.length ? <p>Features outside your plan: {extras.map((f) => f.title).join(", ")}</p> : null}
                      </>
                    ) : <div className="total"><span>No extras</span><span>$0</span></div>}
                  </div>
                  <div className="note">{ICONS.trust}<span><strong>Nothing is charged by sending this form.</strong> It just tells your project manager what you need, so they can go over it with you.</span></div>
                </>
              )}
            </section>
          </div>

          <div className="actions">
            <div className="actions-in">
              {step > 1 && <button type="button" className="btn btn-ghost" onClick={() => go(step - 1)}>Back</button>}
              <span className="saved">{ICONS.check}Progress saved on this device</span>
              <p className="form-error" role="alert">{formError}</p>
              <button type="submit" className="btn btn-primary" disabled={sending}>
                {step === TOTAL ? (sending ? "Sending…" : "Send my details") : "Continue"}{ICONS.arrow}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------- Pieces ---------------- */

function Side({ step, maxStep, go, planName, fit }: { step: number; maxStep: number; go: (n: number) => void; planName: string; fit: string }) {
  return (
    <aside className="side" aria-label="Your progress">
      <div className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="" />
        <div><b>BizzOne Digital</b><span>Website project setup</span></div>
      </div>
      <div className="side-intro">
        <div className="paid">{ICONS.check}Payment confirmed</div>
        <h2>Let’s build your website.</h2>
        <p>About 5 minutes. Short answers are perfect.</p>
      </div>
      <ol className="steps">
        {STEPS.map((s, i) => {
          const n = i + 1;
          return (
            <li key={n} className={n < step || step > TOTAL ? "done" : ""} aria-current={n === step ? "step" : undefined}>
              <button type="button" disabled={n > maxStep || step > TOTAL} onClick={() => go(n)}>
                <span className="dot">{n}</span><span>{s[0]}<small>{s[1]}</small></span>
              </button>
            </li>
          );
        })}
      </ol>
      <section className="fit">
        <h3>Your plan</h3>
        <b className="planname">{planName}</b>
        <p className="fit-status" aria-live="polite">{fit}</p>
      </section>
      <div className="side-help">
        <p>Need help? Message us</p>
        <div className="side-links">
          <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener" aria-label="Message us on WhatsApp">{ICONS.wa}</a>
          <a href="https://ig.me/m/bizzonedigital" target="_blank" rel="noopener" aria-label="Message us on Instagram">{ICONS.ig}</a>
          <a href="https://m.me/Bizzonedigital" target="_blank" rel="noopener" aria-label="Message us on Facebook Messenger">{ICONS.fb}</a>
        </div>
      </div>
      <div className="side-secure">{ICONS.lock}Your details are private and only used for your project.</div>
    </aside>
  );
}

function TopBar({ step }: { step: number }) {
  return (
    <div className="topbar" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <div className="row"><img src="/logo.jpg" alt="" /><b>BizzOne Digital</b><span className="stepx">Step {step} of {TOTAL}</span></div>
      <div className="track"><div className="fill" style={{ width: Math.round((step / TOTAL) * 100) + "%" }} /></div>
    </div>
  );
}

function Channels({ waText }: { waText: string }) {
  return (
    <div className="channels">
      <a className="channel wa" href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener"><span className="cico">{ICONS.wa}</span><span className="ctx"><strong>WhatsApp</strong><span>Fastest reply</span></span></a>
      <a className="channel ig" href="https://ig.me/m/bizzonedigital" target="_blank" rel="noopener"><span className="cico">{ICONS.ig}</span><span className="ctx"><strong>Instagram</strong><span>@bizzonedigital</span></span></a>
      <a className="channel fb" href="https://m.me/Bizzonedigital" target="_blank" rel="noopener"><span className="cico">{ICONS.fb}</span><span className="ctx"><strong>Messenger</strong><span>BizzOne Digital</span></span></a>
    </div>
  );
}

function TextField(p: { id: string; label: string; value: string; onChange: (v: string) => void; err?: string; type?: string; placeholder?: string; optional?: boolean; full?: boolean; hint?: string; auto?: string }) {
  return (
    <div className={"field" + (p.full ? " full" : "")}>
      <label htmlFor={p.id}>{p.label}{p.optional && <> <span className="opt">(optional)</span></>}</label>
      <input type={p.type || "text"} id={p.id} value={p.value} onChange={(e) => p.onChange(e.target.value)} placeholder={p.placeholder} autoComplete={p.auto} aria-invalid={p.err ? true : undefined} />
      {p.hint && <p className="hint">{p.hint}</p>}
      <p className="error">{p.err || ""}</p>
    </div>
  );
}

function TextArea(p: { id: string; label: string; value: string; onChange: (v: string) => void; err?: string; placeholder?: string }) {
  return (
    <div className="field full">
      <label htmlFor={p.id}>{p.label}</label>
      <textarea id={p.id} value={p.value} onChange={(e) => p.onChange(e.target.value)} placeholder={p.placeholder} aria-invalid={p.err ? true : undefined} />
      <p className="error">{p.err || ""}</p>
    </div>
  );
}

function DetailField({ f, value, onChange, err }: { f: FieldDef; value: string | string[] | undefined; onChange: (v: string | string[]) => void; err?: string }) {
  const label = <>{f.label}{f.optional && <> <span className="opt">(optional)</span></>}</>;
  if (f.type === "choice" || f.type === "multi") {
    const arr = Array.isArray(value) ? value : value ? [value] : [];
    return (
      <fieldset className="q">
        <legend className="q-label">{label}{f.type === "multi" && <> <span className="opt">(pick all that apply)</span></>}</legend>
        {f.type === "choice" ? (
          <div className="seg">
            {f.options!.map((o) => <label key={o}><input type="radio" checked={value === o} onChange={() => onChange(o)} /><span>{o}</span></label>)}
          </div>
        ) : (
          <div className="pchips">
            {f.options!.map((o) => {
              const on = arr.includes(o);
              return <label className="pchip" key={o}><input type="checkbox" checked={on} onChange={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])} /><span>{o}</span></label>;
            })}
          </div>
        )}
        <p className="error">{err || ""}</p>
      </fieldset>
    );
  }
  const v = typeof value === "string" ? value : "";
  return (
    <div className="field q">
      <label htmlFor={"d_" + f.id}>{label}</label>
      {f.type === "textarea"
        ? <textarea id={"d_" + f.id} value={v} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} aria-invalid={err ? true : undefined} />
        : <input type="text" id={"d_" + f.id} value={v} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} aria-invalid={err ? true : undefined} />}
      <p className="error">{err || ""}</p>
    </div>
  );
}

function Rv({ ic, t, s, body, go }: { ic: string; t: string; s: number; body: string; go: (n: number) => void }) {
  return (
    <div className="rv-item">
      <span className="ico">{ICONS[ic]}</span>
      <div className="rv-body"><h3>{t}</h3><p>{body || "—"}</p></div>
      <button type="button" className="edit" onClick={() => go(s)}>Edit</button>
    </div>
  );
}
