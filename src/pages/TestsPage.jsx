import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { useParams } from "react-router-dom";
import { imageUrl, getTests } from "../api/api.js";
import { TestCard } from "../components/listing/CatalogCard.jsx";
import { matchesSearch, sortCatalogItems } from "../components/listing/catalogUtils.js";
import Header from "../components/Header.jsx";
import { fallbackHomeData } from "../data/homeData.js";
import { addCartItem, cartEventName, cartItemKey, getCartItems, hasCartItem } from "../utils/cart.js";

const booleanValue = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "yes", "available"].includes(value.trim().toLowerCase());
  return value == null ? fallback : Boolean(value);
};

const sortTests = (items, sort) => {
  if (sort === "rating") return [...items].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  return sortCatalogItems(items, sort);
};

const cartKeys = () => new Set(getCartItems().map((item) => cartItemKey(item.id, item.type)));
const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeTest = (item, index) => {
  const originalPrice = item.price ?? item.originalPrice ?? item.oldPrice ?? 0;
  const discountedPrice = item.finalPrice ?? item.discountedPrice ?? originalPrice;
  const hasDiscountPercent = item.discountPercent !== undefined && item.discountPercent !== null && item.discountPercent !== "";

  const image = imageUrl(item.testImage || item.image || item.imageUrl || item.thumbnail || "", item.updatedAt || item.createdAt);

  return {
    ...item,
    id: item.id || item.slug || item._id || `test-${index}`,
    name: item.testName || item.name || "Pathology Test",
    subtitle: item.description || item.subtitle || item.category || "Pathology test",
    description: item.description || item.subtitle || "",
    image,
    icon: item.icon || "TestTube2",
    color: item.badgeType || item.color || "green",
    badge: item.badge || "",
    discountedPrice,
    originalPrice,
    discount: hasDiscountPercent ? `${item.discountPercent}% OFF` : item.discount || "Best Price",
    reportTime: item.reportTime || "24 hrs",
    homeCollection: booleanValue(item.homeCollection ?? item.isHomeCollectionAvailable ?? item.homeCollectionAvailable, false),
    fastingRequired: booleanValue(item.fastingRequired, false),
    rating: item.rating ?? 4.6,
    popularity: item.popularity ?? 0,
    sortOrder: item.sortOrder ?? 0,
    status: item.status || (item.isActive === false ? "Inactive" : "Active"),
    isActive: item.isActive !== false
  };
};

function TestsPage() {
  const { slug } = useParams();
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const sort = "popular";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [addedKeys, setAddedKeys] = useState(() => cartKeys());

  useEffect(() => {
    const syncCart = () => setAddedKeys(cartKeys());
    window.addEventListener(cartEventName, syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener(cartEventName, syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    getTests({ activeOnly: true, limit: 500, page: 1, sort: "popular" })
      .then((response) => {
        if (!mounted) return;
        const rows = Array.isArray(response) ? response : response?.data || [];
        const normalizedRows = rows.map(normalizeTest);
        setItems(normalizedRows);
      })
      .catch((requestError) => {
        if (!mounted) return;
        setItems([]);
        setError(requestError?.response?.data?.message || "Could not load tests. Please try again.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const values = slug
      ? items.filter((item) => [item.slug, item.id, item.testCode, item.name].some((value) => slugify(value) === slug))
      : items.filter((item) => matchesSearch(item, searchTerm));
    return sortTests(values, sort);
  }, [items, searchTerm, slug, sort]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };

  const handleAddToCart = (item) => {
    if (hasCartItem(item.id, "test")) {
      setAddedKeys(cartKeys());
      return;
    }
    addCartItem({
      id: item.id,
      type: "test",
      name: item.name,
      subtitle: item.subtitle,
      price: item.discountedPrice,
      oldPrice: item.originalPrice,
      discount: item.discount,
      icon: item.icon,
      image: item.image,
      color: item.color
    });
    setAddedKeys(cartKeys());
    showToast(`${item.name} added to cart.`);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <Header data={fallbackHomeData} />
      <main className="pt-[68px] md:pt-[104px] lg:pt-[108px]">
        <section className="bg-gradient-to-b from-white to-blue-50/50 py-8 lg:py-10">
          <div className="container-page min-w-0">
            <label className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 rounded-xl border border-blue-100 bg-white px-4 shadow-sm focus-within:border-upchar-green focus-within:ring-4 focus-within:ring-green-100">
              <Search className="h-5 w-5 shrink-0 text-upchar-green" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent text-sm font-bold text-navy-900 outline-none placeholder:text-navy-400"
                placeholder={slug ? "Search all tests..." : "Search for tests..."}
              />
            </label>

            {loading ? (
              <div className="mt-6 rounded-lg border border-blue-100 bg-white p-8 text-center shadow-sm">
                <h3 className="text-xl font-black text-navy-900">Loading tests...</h3>
                <p className="mt-2 text-sm font-semibold text-navy-600">Fetching the latest active tests.</p>
              </div>
            ) : null}

            {error ? (
              <div className="mt-6 rounded-lg border border-red-100 bg-red-50 p-8 text-center shadow-sm">
                <h3 className="text-xl font-black text-upchar-red">Unable to load tests</h3>
                <p className="mt-2 text-sm font-semibold text-navy-700">{error}</p>
              </div>
            ) : null}

            {!loading && !error ? (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredItems.map((item) => (
                  <TestCard
                    item={item}
                    viewMode="grid"
                    key={item.id}
                    onAddToCart={handleAddToCart}
                    onDetails={() => showToast("Coming Soon")}
                    isAdded={addedKeys.has(cartItemKey(item.id, "test"))}
                  />
                ))}
              </div>
            ) : null}

            {!loading && !error && !filteredItems.length ? (
              <div className="mt-6 rounded-lg border border-blue-100 bg-white p-8 text-center shadow-sm">
                <h3 className="text-xl font-black text-navy-900">No tests found</h3>
                <p className="mt-2 text-sm font-semibold text-navy-600">{slug ? "This test is not available right now." : "Try searching another test name."}</p>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <AnimatePresence>
        {toast ? (
          <motion.div
            className="fixed bottom-6 left-1/2 z-[120] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg bg-navy-950 px-5 py-3 text-center text-sm font-black text-white shadow-soft"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default TestsPage;
