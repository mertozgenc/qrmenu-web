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

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE || "https://qrmenu-api-om05.onrender.com";

function normalize(s: string) {
  return (s || "").trim().toLowerCase();
}

function formatTRY(value: number) {
  const v = Number.isFinite(value) ? value : 0;
  return `${v.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
}

type SortMode = "default" | "price_asc" | "price_desc" | "name_asc";

export default function AdminPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Admin key gate
  const [adminKey, setAdminKey] = useState("");
  const [rememberKey, setRememberKey] = useState(true);
  const [unlocked, setUnlocked] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("Tümü");
  const [sortMode, setSortMode] = useState<SortMode>("default");

  // Create form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [category, setCategory] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);

  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editCategory, setEditCategory] = useState("");
  const [editAvailable, setEditAvailable] = useState(true);
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Load remembered key
  useEffect(() => {
    try {
      const saved = localStorage.getItem("qrmenu_admin_key") || "";
      if (saved) setAdminKey(saved);
    } catch {}
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/Menu`, { cache: "no-store" });
      const data = await res.json();
      setMenu(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (unlocked) load();
  }, [unlocked]);

  const categories = useMemo(() => {
    const set = new Set(menu.map((x) => x.category).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "tr"));
  }, [menu]);

  const stats = useMemo(() => {
    const total = menu.length;
    const active = menu.filter((x) => x.isAvailable).length;
    const passive = total - active;
    const catCount = new Set(menu.map((x) => normalize(x.category))).size;
    return { total, active, passive, catCount };
  }, [menu]);

  function validateItem(n: string, c: string, p: number) {
    if (!n.trim()) return "Ürün adı boş olamaz.";
    if (!c.trim()) return "Kategori boş olamaz.";
    if (!Number.isFinite(p)) return "Fiyat sayı olmalı.";
    if (p < 0) return "Fiyat negatif olamaz.";
    return null;
  }

  async function createItem(e: React.FormEvent) {
    e.preventDefault();

    const err = validateItem(name, category, price);
    if (err) return alert(err);

    const res = await fetch(`${BASE_URL}/api/Menu`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
      },
      body: JSON.stringify({
        name: name.trim(),
        price,
        category: category.trim(),
        isAvailable,
        imageUrl: imageUrl.trim() || null,
        description: description.trim() || null,
      }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      alert(`Ekleme başarısız!\nStatus: ${res.status}\n${msg || ""}`);
      return;
    }

    setName("");
    setPrice(0);
    setCategory("");
    setIsAvailable(true);
    setImageUrl("");
    setDescription("");

    await load();
  }

  function openEditModal(item: MenuItem) {
    setEditing(item);
    setEditName(item.name);
    setEditPrice(Number(item.price) || 0);
    setEditCategory(item.category);
    setEditAvailable(!!item.isAvailable);
    setEditImageUrl(item.imageUrl ?? "");
    setEditDescription(item.description ?? "");
    setEditOpen(true);
  }

  function closeEditModal() {
    setEditOpen(false);
    setEditing(null);
  }

  async function saveEdit() {
    if (!editing) return;

    const err = validateItem(editName, editCategory, editPrice);
    if (err) return alert(err);

    const res = await fetch(`${BASE_URL}/api/Menu/${editing.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
      },
      body: JSON.stringify({
        id: editing.id,
        name: editName.trim(),
        price: editPrice,
        category: editCategory.trim(),
        isAvailable: editAvailable,
        imageUrl: editImageUrl.trim() || null,
        description: editDescription.trim() || null,
      }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      alert(`Güncelleme başarısız!\nStatus: ${res.status}\n${msg || ""}`);
      return;
    }

    closeEditModal();
    await load();
  }

  async function deleteItem(id: number) {
    const ok = confirm("Silmek istediğine emin misin?");
    if (!ok) return;

    const res = await fetch(`${BASE_URL}/api/Menu/${id}`, {
      method: "DELETE",
      headers: { "X-Admin-Key": adminKey },
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      alert(`Silme başarısız!\nStatus: ${res.status}\n${msg || ""}`);
      return;
    }

    await load();
  }

  async function toggleAvailable(item: MenuItem) {
    const res = await fetch(`${BASE_URL}/api/Menu/${item.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
      },
      body: JSON.stringify({
        id: item.id,
        name: item.name,
        price: item.price,
        category: item.category,
        isAvailable: !item.isAvailable,
        imageUrl: item.imageUrl ?? null,
        description: item.description ?? null,
      }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      alert(`Güncelleme başarısız!\nStatus: ${res.status}\n${msg || ""}`);
      return;
    }

    await load();
  }

  const filteredMenu = useMemo(() => {
    let items = [...menu];

    const q = normalize(search);
    if (q) {
      items = items.filter((x) => {
        const n = normalize(x.name);
        const c = normalize(x.category);
        return n.includes(q) || c.includes(q);
      });
    }

    if (categoryFilter !== "Tümü") {
      const cf = normalize(categoryFilter);
      items = items.filter((x) => normalize(x.category) === cf);
    }

    if (sortMode === "price_asc") {
      items.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortMode === "price_desc") {
      items.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortMode === "name_asc") {
      items.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    } else {
      // default: aktifler üstte, sonra kategori, sonra isim
      items.sort((a, b) => {
        if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
        const c = a.category.localeCompare(b.category, "tr");
        if (c !== 0) return c;
        return a.name.localeCompare(b.name, "tr");
      });
    }

    return items;
  }, [menu, search, categoryFilter, sortMode]);

  // 🔒 Gate ekranı
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-6 shadow w-full max-w-sm space-y-3">
          <h1 className="text-xl font-bold">🔒 101 CLUP Admin</h1>
          <p className="text-sm text-gray-600">Admin paneli için şifre gir.</p>

          <input
            className="w-full border rounded-xl px-3 py-2"
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Admin şifre"
          />

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={rememberKey}
              onChange={(e) => setRememberKey(e.target.checked)}
            />
            Şifreyi hatırla (bu cihaz)
          </label>

          <button
            className="w-full bg-black text-white rounded-xl px-4 py-2"
            onClick={() => {
              if (!adminKey.trim()) return alert("Şifre gir");
              try {
                if (rememberKey) localStorage.setItem("qrmenu_admin_key", adminKey.trim());
              } catch {}
              setUnlocked(true);
            }}
          >
            Giriş
          </button>

          <p className="text-xs text-gray-500">
            (Not: Bu basit koruma. Sonra login/jwt yaparız.)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 max-w-5xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">🛠️ 101 CLUP Admin</h1>
          <p className="text-sm text-gray-600 mt-1">Ürünleri yönet • Foto/İçerik ekle • Aktif/Pasif</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => load()}
            className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm"
          >
            Yenile
          </button>
          <button
            onClick={() => setUnlocked(false)}
            className="px-4 py-2 rounded-xl bg-black text-white text-sm"
          >
            Çıkış
          </button>
        </div>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard title="Toplam Ürün" value={loading ? "…" : String(stats.total)} />
        <StatCard title="Aktif" value={loading ? "…" : String(stats.active)} />
        <StatCard title="Pasif" value={loading ? "…" : String(stats.passive)} />
        <StatCard title="Kategori" value={loading ? "…" : String(stats.catCount)} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-gray-600">Ara</label>
            <input
              className="w-full border rounded-xl px-3 py-2 mt-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ürün / kategori ara…"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Kategori</label>
            <select
              className="w-full border rounded-xl px-3 py-2 mt-1 bg-white"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="Tümü">Tümü</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600">Sırala</label>
            <select
              className="w-full border rounded-xl px-3 py-2 mt-1 bg-white"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
            >
              <option value="default">Varsayılan</option>
              <option value="price_asc">Fiyat: Artan</option>
              <option value="price_desc">Fiyat: Azalan</option>
              <option value="name_asc">İsim: A → Z</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>{loading ? "Yükleniyor…" : `${filteredMenu.length} ürün`}</span>
          <button
            className="underline"
            type="button"
            onClick={() => {
              setSearch("");
              setCategoryFilter("Tümü");
              setSortMode("default");
            }}
          >
            Filtreleri temizle
          </button>
        </div>
      </div>

      {/* Create form */}
      <form onSubmit={createItem} className="bg-white rounded-2xl p-4 shadow mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">➕ Yeni Ürün</h2>
          {loading && <span className="text-sm text-gray-500">Kaydediliyor / yükleniyor…</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">Ürün adı</label>
            <input
              className="w-full border rounded-xl px-3 py-2 mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Hamburger"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Fiyat (₺)</label>
            <input
              className="w-full border rounded-xl px-3 py-2 mt-1"
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value === "" ? 0 : Number(e.target.value))}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Kategori</label>
            <input
              className="w-full border rounded-xl px-3 py-2 mt-1"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Burger"
              list="cats"
            />
            <datalist id="cats">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">Fotoğraf URL (opsiyonel)</label>
            <input
              className="w-full border rounded-xl px-3 py-2 mt-1"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://...jpg / png"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">Açıklama / içerik (opsiyonel)</label>
            <input
              className="w-full border rounded-xl px-3 py-2 mt-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Örn: Dana köfte, cheddar, özel sos…"
            />
          </div>
        </div>

        {!!imageUrl.trim() && (
          <div className="border rounded-2xl p-3 bg-gray-50">
            <div className="text-xs text-gray-500 mb-2">Foto önizleme</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl.trim()}
              alt="preview"
              className="w-full max-w-md h-40 object-cover rounded-xl border"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="text-xs text-gray-500 mt-2">
              Eğer resim görünmüyorsa URL hatalı olabilir.
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
            Aktif (menüde görünsün)
          </label>

          <button className="bg-black text-white rounded-xl px-5 py-2 font-semibold">
            Ürün Ekle
          </button>
        </div>
      </form>

      {/* List */}
      <div className="bg-white rounded-2xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">📦 Ürünler</h2>
          <span className="text-xs text-gray-500">
            {loading ? "…" : `${filteredMenu.length} sonuç`}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredMenu.map((item) => (
            <div key={item.id} className="border rounded-2xl p-4 hover:shadow-sm transition bg-white">
              <div className="flex items-start gap-3">
                <div className="w-20 h-16 shrink-0 rounded-xl bg-gray-100 border overflow-hidden flex items-center justify-center">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">No фото</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold truncate">{item.name}</div>
                    <div className="font-extrabold">{formatTRY(Number(item.price))}</div>
                  </div>

                  <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 border text-xs">
                      {item.category}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-xs border ${
                        item.isAvailable
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      {item.isAvailable ? "Aktif" : "Pasif"}
                    </span>
                  </div>

                  {item.description?.trim() ? (
                    <div className="text-xs text-gray-500 mt-2 line-clamp-2">
                      {item.description}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 mt-2">Açıklama yok</div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  onClick={() => toggleAvailable(item)}
                  className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50"
                  title="Aktif/Pasif değiştir"
                >
                  {item.isAvailable ? "Pasif Yap" : "Aktif Yap"}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(item)}
                    className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50"
                  >
                    Düzenle
                  </button>

                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-sm px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredMenu.length === 0 && !loading && (
            <div className="text-sm text-gray-500">Hiç ürün yok.</div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editOpen && editing ? (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-3"
          onClick={closeEditModal}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold">✏️ Ürünü Düzenle</div>
                <div className="text-sm text-gray-600 mt-1">
                  #{editing.id} • {editing.name}
                </div>
              </div>

              <button
                className="text-gray-500 hover:text-black text-xl"
                onClick={closeEditModal}
                type="button"
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600">Ürün adı</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 mt-1"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Fiyat (₺)</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 mt-1"
                  type="number"
                  min={0}
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value === "" ? 0 : Number(e.target.value))}
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Kategori</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 mt-1"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  list="cats"
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600">Fotoğraf URL</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 mt-1"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                />
                {!!editImageUrl.trim() && (
                  <div className="mt-2 border rounded-2xl p-2 bg-gray-50">
                    <div className="text-xs text-gray-500 mb-2">Önizleme</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editImageUrl.trim()}
                      alt="preview"
                      className="w-full h-44 object-cover rounded-xl border"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-600">Açıklama / içerik</label>
                <textarea
                  className="w-full border rounded-xl px-3 py-2 mt-1 min-h-[120px]"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Örn: Dana köfte, cheddar, özel sos…"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editAvailable}
                  onChange={(e) => setEditAvailable(e.target.checked)}
                />
                Aktif
              </label>

              <div className="flex gap-2">
                <button
                  onClick={closeEditModal}
                  type="button"
                  className="px-4 py-2 rounded-xl border hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={saveEdit}
                  type="button"
                  className="px-4 py-2 rounded-xl bg-black text-white font-semibold"
                >
                  Kaydet
                </button>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Kapatmak için: dışarı tıkla • ESC
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow border">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-2xl font-extrabold mt-1">{value}</div>
    </div>
  );
}
