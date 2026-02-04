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

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5150";

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

function normalize(s: string) {
  return (s || "").trim().toLowerCase();
}

export default function MenuPage() {
  const [all, setAll] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("Tümü");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MenuItem | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api/Menu`, {
          cache: "no-store",
        });
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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    if (selected) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const activeItems = useMemo(
    () => all.filter((x) => x.isAvailable),
    [all]
  );

  const filtered = useMemo(() => {
    let items = activeItems;

    if (activeCategory !== "Tümü") {
      const ac = normalize(activeCategory);
      items = items.filter(
        (x) => normalize(x.category) === ac
      );
    }

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

    const ordered = CATEGORY_ORDER.filter((c) =>
      map.has(c)
    ).map((c) => [c, map.get(c)!] as [string, MenuItem[]]);

    const extras = Array.from(map.keys())
      .filter((k) => !CATEGORY_ORDER.includes(k))
      .sort((a, b) => a.localeCompare(b, "tr"))
      .map((k) => [k, map.get(k)!] as [string, MenuItem[]]);

    return [...ordered, ...extras];
  }, [filtered]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-800">
      {/* HEADER */}
      <div className="sticky top-0 z-20 backdrop-blur bg-[#FAF7F2]/80 border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold">
                101 CLUP
              </h1>
              <p className="text-xs text-stone-500 mt-1">
                QR Menü • Güncel ürünler burada
              </p>
            </div>

            <div className="text-[11px] text-stone-500 text-right">
              <div className="font-medium text-stone-600">
                Toplam
              </div>
              <div>
                {loading ? "…" : `${filtered.length} ürün`}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <input
              className="w-full rounded-2xl px-4 py-3 bg-white border border-stone-200 outline-none
              focus:ring-2 focus:ring-[#E6B566]/60 placeholder:text-stone-400"
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
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition
                ${
                  activeCategory === cat
                    ? "bg-[#E6B566] text-white shadow-md"
                    : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50"
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
          <div className="text-center text-stone-500">
            Menü yükleniyor…
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center text-stone-500">
            Ürün bulunamadı.
          </div>
        ) : (
          grouped.map(([cat, items]) => (
            <section key={cat}>
              <div className="flex items-end justify-between mb-3">
                <h2 className="text-lg font-bold">{cat}</h2>
                <span className="text-xs text-stone-500">
                  {items.length} ürün
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className="text-left bg-white border border-stone-200 rounded-2xl p-4
                    hover:shadow-md hover:-translate-y-[1px] transition"
                  >
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-36 object-cover rounded-xl mb-3"
                      />
                    )}

                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-stone-500 mt-1">
                          {item.category}
                        </div>

                        {item.description?.trim() && (
                          <div className="text-xs text-stone-600 mt-2 line-clamp-2">
                            {item.description}
                          </div>
                        )}
                      </div>

                      <div className="font-extrabold text-lg text-[#E6B566]">
                        {formatTRY(item.price)}
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-stone-500">
                      Detay için tıkla →
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))
        )}

        <div className="pb-6 text-center text-xs text-stone-400">
          101 CLUP • Menü otomatik güncellenir
        </div>
        <div className="pb-6 text-center text-xs text-stone-400">
          Mert Özgenç tarafından yapılmıştır
        </div>
      </div>

      {/* MODAL */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between">
              <div>
                <div className="text-lg font-bold">
                  {selected.name}
                </div>
                <div className="text-sm text-stone-500 mt-1">
                  {selected.category} •{" "}
                  {formatTRY(selected.price)}
                </div>
              </div>

              <button
                className="text-xl"
                onClick={() => setSelected(null)}
              >
                ✕
              </button>
            </div>

            {selected.imageUrl && (
              <img
                src={selected.imageUrl}
                alt={selected.name}
                className="w-full h-56 object-cover rounded-xl mt-4"
              />
            )}

            <div className="mt-4">
              <div className="text-sm font-semibold">
                İçerik / Açıklama
              </div>
              <div className="text-sm text-stone-600 mt-1">
                {selected.description?.trim()
                  ? selected.description
                  : "Bu ürün için açıklama eklenmemiş."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
