import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { useParams } from "react-router-dom";
import { imageUrl, getPackages } from "../api/api.js";
import { PackageCard } from "../components/listing/CatalogCard.jsx";
import { matchesSearch, sortCatalogItems } from "../components/listing/catalogUtils.js";
import Header from "../components/Header.jsx";
import { fallbackHomeData } from "../data/homeData.js";
import { addCartItem, cartEventName, cartItemKey, getCartItems, hasCartItem } from "../utils/cart.js";

const booleanValue = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "yes", "available"].includes(value.trim().toLowerCase());
  return value == null ? fallback : Boolean(value);
};

const normalizePackage = (item, index) => {
  const originalPrice = item.price ?? item.originalPrice ?? item.oldPrice ?? 0;
  const discountedPrice = item.finalPrice ?? item.discountedPrice ?? originalPrice;
  const hasDiscountPercent = item.discountPercent !== undefined && item.discountPercent !== null && item.discountPercent !== "";

  return {
    ...item,
    id: item.id || item.slug || item._id || `package-${index}`,
    name: item.packageName || item.name || "Health Package",
    packageName: item.packageName || item.name || "Health Package",
    packageCode: item.packageCode || "",
    description: item.description || "Curated health package with home sample collection.",
    testCount: item.testsIncluded || item.testCount || "30+ Tests",
    testsIncluded: item.testsIncluded || item.testCount || "30+ Tests",
    image: imageUrl(item.packageImage || item.image || item.imageUrl || item.thumbnail || "", item.updatedAt || item.createdAt),
    icon: item.icon || "Gift",
    color: item.color || "green",
    badge: item.badge || "",
    discountedPrice,
    originalPrice,
    discount: hasDiscountPercent ? `${item.discountPercent}% OFF` : item.discount || "Best Price",
    gender: item.gender || "all",
    homeCollection: booleanValue(item.homeCollection ?? item.isHomeCollectionAvailable ?? item.homeCollectionAvailable, false),
    reportTime: item.reportTime || "24 - 36 hrs",
    popularity: item.popularity ?? index,
    status: item.status || (item.isActive === false ? "Inactive" : "Active"),
    isActive: item.isActive !== false,
    buttonText: "Add to Cart",
    buttonLink: ""
  };
};

const cartKeys = () => new Set(getCartItems().map((item) => cartItemKey(item.id, item.type)));
const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function PackagesPage() {
  const { slug } = useParams();
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const sort = "popular";
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addedKeys, setAddedKeys] = useState(() => cartKeys());

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    getPackages()
      .then((data) => {
        if (mounted) {
          const sourceRows = Array.isArray(data) ? data : data?.data || [];
          const rows = sourceRows.filter((item) => item.isActive !== false && item.status !== "Inactive").map(normalizePackage);
          setItems(rows);
        }
      })
      .catch((requestError) => {
        if (mounted) {
          setItems([]);
          setError(requestError?.response?.data?.message || "Could not load packages. Please try again.");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const syncCart = () => setAddedKeys(cartKeys());
    window.addEventListener(cartEventName, syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener(cartEventName, syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  const filteredItems = useMemo(() => {
    const values = slug
      ? items.filter((item) => [item.slug, item.id, item.packageCode, item.name].some((value) => slugify(value) === slug))
      : items.filter((item) => matchesSearch(item, searchTerm));

    return sortCatalogItems(values, sort);
  }, [items, searchTerm, slug, sort]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };

  const handleAddToCart = (item) => {
    if (hasCartItem(item.id, "package")) {
      setAddedKeys(cartKeys());
      return;
    }
    addCartItem({
      id: item.id,
      type: "package",
      name: item.name,
      subtitle: item.testCount,
      description: item.description,
      price: item.discountedPrice,
      oldPrice: item.originalPrice,
      discount: item.discount,
      badge: item.badge,
      icon: item.icon,
      image: item.image,
      imageUrl: item.imageUrl,
      packageImage: item.packageImage,
      thumbnail: item.thumbnail,
      bannerImage: item.bannerImage,
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
            <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 rounded-full border-2 border-upchar-green bg-green-50/40 px-4 py-2 shadow-sm focus-within:ring-4 focus-within:ring-green-100 sm:h-[72px] sm:px-5">
              <Search className="h-6 w-6 shrink-0 text-upchar-green" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-full min-w-0 flex-1 border-0 bg-transparent text-center text-sm font-black text-navy-900 outline-none placeholder:text-navy-500 sm:text-base"
                placeholder={slug ? "Search all packages..." : "Search for packages..."}
              />
              <button type="button" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-upchar-green text-white shadow-sm transition hover:bg-upchar-greenDark sm:h-14 sm:w-14" aria-label="Search packages">
                <Search className="h-6 w-6" />
              </button>
            </div>

            {loading ? (
              <div className="mt-6 rounded-lg border border-blue-100 bg-white p-8 text-center shadow-sm">
                <h3 className="text-xl font-black text-navy-900">Loading packages...</h3>
                <p className="mt-2 text-sm font-semibold text-navy-600">Fetching the latest active packages.</p>
              </div>
            ) : null}

            {error ? (
              <div className="mt-6 rounded-lg border border-red-100 bg-red-50 p-8 text-center shadow-sm">
                <h3 className="text-xl font-black text-upchar-red">Unable to load packages</h3>
                <p className="mt-2 text-sm font-semibold text-navy-700">{error}</p>
              </div>
            ) : null}

            {!loading && !error ? (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredItems.map((item) => (
                  <PackageCard
                    item={item}
                    viewMode="grid"
                    key={item.id}
                    onAddToCart={handleAddToCart}
                    onDetails={() => showToast("Details page coming soon.")}
                    isAdded={addedKeys.has(cartItemKey(item.id, "package"))}
                  />
                ))}
              </div>
            ) : null}

            {!loading && !error && !filteredItems.length ? (
              <div className="mt-6 rounded-lg border border-blue-100 bg-white p-8 text-center shadow-sm">
                <h3 className="text-xl font-black text-navy-900">No packages found</h3>
                <p className="mt-2 text-sm font-semibold text-navy-600">{slug ? "This package is not available right now." : "Try searching another package name."}</p>
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

export default PackagesPage;
