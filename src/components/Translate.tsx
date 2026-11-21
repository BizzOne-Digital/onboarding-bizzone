"use client";
import { useEffect } from "react";

// Google Translate language picker (every language Google supports).
// Google rewrites text nodes in the page, which can crash React when it later
// updates those nodes, so we make removeChild/insertBefore tolerant first.
declare global {
  interface Window { googleTranslateElementInit?: () => void; google?: any } // eslint-disable-line @typescript-eslint/no-explicit-any
}

function patchDom() {
  const p = Node.prototype as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (p.__bzPatched) return;
  p.__bzPatched = true;
  const remove = p.removeChild;
  p.removeChild = function (child: Node) {
    if (child.parentNode !== this) return child;
    return remove.call(this, child);
  };
  const insert = p.insertBefore;
  p.insertBefore = function (node: Node, ref: Node | null) {
    if (ref && ref.parentNode !== this) return node;
    return insert.call(this, node, ref);
  };
}

export default function Translate() {
  useEffect(() => {
    patchDom();
    if (document.getElementById("gt-script")) return;
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        { pageLanguage: "en", autoDisplay: false, layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE },
        "gt-el",
      );
    };
    const s = document.createElement("script");
    s.id = "gt-script";
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  return (
    <div className="gt-wrap notranslate" translate="no" aria-label="Translate this page">
      <span className="gt-label">Language</span>
      <div id="gt-el" />
    </div>
  );
}
