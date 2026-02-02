"use client";

import { useEffect, useMemo, useState } from "react";

type MenuItem = {
  id: number;
  name: string;
  price: number;
  category: string;
  isAvailable: boolean;
  imageUrl?: string | null;
  description?: string | null;
};

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5150";

const CATEGORY_ORDER = [
  "Kahvaltı",
  "Burger",
  "Tost",
  "Atıştırmalık",
  "Soğuk İçecek",
  "Sıcak İçecek",
  "Wrap",
  "Tavuklar",
  "Makarna",
  "Kokteyller",
  "Nargile",
];

function formatTRY(value: number) {
  return `${Number(value || 0).toLocaleString("tr-TR")} ₺`;
}

// ✅ normalize: boşlukları kırp + küçült
function normalize(s: string) {
  return (s || "").trim().toLowerCase();
}

export default function MenuPage() {
  const [all, setAll] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("Tümü");
  const [search, setSearch] = useState("");

  // ✅ seçili ürün (modal)
  const [selected, setSelected] = useState<MenuItem | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api/Menu`, { cache: "no-store" });
        const data = await res.json();
        if (!ignore) setAll(Array.isArray(data) ? data : []);
      } catch {
        if (!ignore) setAll([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  // ✅ ESC ile kapat
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    if (selected) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const activeItems = useMemo(() => all.filter((x) => x.isAvailable), [all]);

  const filtered = useMemo(() => {
    let items = activeItems;

    // ✅ Kategori filtresi (case-insensitive + trim)
    if (activeCategory !== "Tümü") {
      const ac = normalize(activeCategory);
      items = items.filter((x) => normalize(x.category) === ac);
    }

    // ✅ Arama (normalize)
    const q = normalize(search);
    if (q) {
      items = items.filter((x) => {
        const n = normalize(x.name);
        const c = normalize(x.category);
        return n.includes(q) || c.includes(q);
      });
    }

    return items;
  }, [activeItems, activeCategory, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of filtered) {
      const key = (item.category || "Diğer").trim() || "Diğer";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }

    for (const [k, items] of map.entries()) {
      items.sort((a, b) => a.name.localeCompare(b.name, "tr"));
      map.set(k, items);
    }

    const ordered = CATEGORY_ORDER.filter((c) => map.has(c)).map(
      (c) => [c, map.get(c)!] as [string, MenuItem[]]
    );

    const extras = Array.from(map.keys())
      .filter((k) => !CATEGORY_ORDER.includes(k))
      .sort((a, b) => a.localeCompare(b, "tr"))
      .map((k) => [k, map.get(k)!] as [string, MenuItem[]]);

    return [...ordered, ...extras];
  }, [filtered]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* HEADER */}
      <div className="sticky top-0 z-20 backdrop-blur bg-slate-950/70 border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold leading-tight bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                101 CLUP
              </h1>
              <p className="text-xs text-slate-300 mt-1">
                QR Menü • Güncel ürünler burada
              </p>
            </div>

            <div className="text-[11px] text-slate-400 text-right">
              <div className="font-medium text-slate-300">Toplam</div>
              <div>{loading ? "…" : `${filtered.length} ürün`}</div>
            </div>
          </div>

          <div className="mt-4">
            <input
              className="w-full rounded-2xl px-4 py-3 bg-white/10 border border-white/10 outline-none
                         focus:ring-2 focus:ring-fuchsia-400/60 placeholder:text-slate-400"
              placeholder="Ürün veya kategori ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* CATEGORY BAR */}
        <div className="max-w-3xl mx-auto px-2 pb-4">
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap">
            {["Tümü", ...CATEGORY_ORDER].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200
                  ${
                    activeCategory === cat
                      ? "bg-gradient-to-r from-indigo-500 to-pink-500 text-white shadow-lg shadow-pink-500/20 scale-[1.03]"
                      : "bg-white/10 text-slate-200 border border-white/10 hover:bg-white/15"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {loading ? (
          <div className="text-center text-slate-300">Menü yükleniyor…</div>
        ) : grouped.length === 0 ? (
          <div className="text-center text-slate-300">Ürün bulunamadı.</div>
        ) : (
          grouped.map(([cat, items]) => (
            <section key={cat}>
              <div className="flex items-end justify-between mb-3">
                <h2 className="text-lg font-bold text-slate-100">{cat}</h2>
                <span className="text-xs text-slate-400">
                  {items.length} ürün
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item)}
                    className="text-left bg-white/10 backdrop-blur border border-white/10 rounded-2xl shadow-lg p-4
                               hover:scale-[1.01] hover:border-fuchsia-400/30 transition outline-none"
                  >
                    {/* Foto */}
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                        className="w-full h-36 object-cover rounded-xl border border-white/10 mb-3"
                      />
                    ) : null}

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-base truncate text-slate-50">
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {item.category}
                        </div>

                        {item.description?.trim() ? (
                          <div className="text-xs text-slate-300 mt-2 line-clamp-2">
                            {item.description}
                          </div>
                        ) : null}
                      </div>

                      <div className="shrink-0 font-extrabold text-lg text-pink-400">
                        {formatTRY(item.price)}
                      </div>
                    </div>

                    <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                    <div className="mt-3 text-xs text-slate-400">
                      Detay için tıkla →
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))
        )}

        <div className="pb-10 text-center text-xs text-slate-500">
          101 CLUP • Menü otomatik güncellenir
        </div>
        <br />
        <div className="pb-10 text-center text-xs text-slate-500">
          Mert özgenç tarafında yapılmıştır
        </div>
      </div>

      {/* MODAL */}
      {selected ? (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-3"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg bg-slate-950 border border-white/10 rounded-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-slate-50">
                  {selected.name}
                </div>
                <div className="text-sm text-slate-300 mt-1">
                  {selected.category} • {formatTRY(selected.price)}
                </div>
              </div>

              <button
                className="text-slate-300 hover:text-white text-lg"
                onClick={() => setSelected(null)}
                aria-label="Kapat"
                type="button"
              >
                ✕
              </button>
            </div>

            {selected.imageUrl ? (
              <img
                src={selected.imageUrl}
                alt={selected.name}
                loading="lazy"
                className="w-full h-56 object-cover rounded-xl border border-white/10 mt-4"
              />
            ) : null}

            <div className="mt-4">
              <div className="text-sm font-semibold text-slate-200">
                İçerik / Açıklama
              </div>
              <div className="text-sm text-slate-300 mt-1 whitespace-pre-line">
                {selected.description?.trim()
                  ? selected.description
                  : "Bu ürün için açıklama eklenmemiş."}
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Kapatmak için: dışarı tıkla • ESC
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
