import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AuthModal from "../components/auth/AuthModal.jsx";
import { getStoredUser } from "../components/auth/authStorage.js";
import Icon from "../components/Icon.jsx";
import { price } from "../utils.js";
import { addCartItem, cartEventName, cartItemKey, getCartItems, hasCartItem } from "../utils/cart.js";

const cartKeys = () => new Set(getCartItems().map((item) => cartItemKey(item.id, item.type)));

function SearchSection({ quickCards, whatsappNumber, tests, packages }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [addedKeys, setAddedKeys] = useState(() => cartKeys());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];

    return [
      ...tests.map((item) => ({ ...item, resultType: "Test" })),
      ...packages.map((item) => ({ ...item, resultType: "Package" }))
    ]
      .filter((item) => `${item.name} ${item.subtitle || ""} ${item.description || ""} ${item.testCount || ""}`.toLowerCase().includes(term))
      .slice(0, 10);
  }, [packages, query, tests]);

  useEffect(() => {
    const syncCart = () => setAddedKeys(cartKeys());
    window.addEventListener(cartEventName, syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener(cartEventName, syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  const quickLink = (title) => {
    if (title === "Popular Tests") return "#popular-tests";
    if (title === "Health Packages") return "#packages";
    if (title === "Download Report") return "/my-account/reports";
    return "#booking";
  };

  const uploadPrescriptionPath = "/my-account?tab=upload-prescription";

  const openUploadPrescription = () => {
    if (getStoredUser()) {
      navigate(uploadPrescriptionPath);
      return;
    }
    navigate(`/?auth=signin&returnTo=${encodeURIComponent(uploadPrescriptionPath)}`);
  };

  const openReports = () => {
    if (getStoredUser()) {
      navigate("/my-account/reports");
      return;
    }
    setAuthMode("signin");
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    setAuthModalOpen(false);
    navigate("/my-account/reports");
  };

  const resultKey = (item) => `${item.resultType}-${item.id}`;
  const itemSlug = (item) =>
    String(item.slug || item.packageSlug || item.testSlug || item.id || item.name || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const resultPath = (item) => `/${item.resultType.toLowerCase() === "test" ? "tests" : "packages"}/${itemSlug(item)}`;

  const openResult = (item) => {
    const path = resultPath(item);
    if (path.endsWith("/")) return;
    navigate(path);
  };

  const addResultToCart = (event, item) => {
    event.stopPropagation();
    const type = item.resultType.toLowerCase();
    if (hasCartItem(item.id, type)) {
      setAddedKeys(cartKeys());
      return;
    }
    addCartItem({
      ...item,
      type,
      price: item.discountedPrice,
      oldPrice: item.originalPrice
    });
    setAddedKeys(cartKeys());
  };

  return (
    <section className="border-b border-blue-100 bg-navy-950 pb-7 pt-4">
      <div className="container-page">
        <div className="rounded-xl border border-white/25 bg-navy-900/60 p-3 shadow-2xl backdrop-blur">
          <div className="grid gap-4 lg:grid-cols-[minmax(420px,560px)_1fr] lg:items-center">
            <div className="relative">
              <div className="flex h-[50px] overflow-hidden rounded-md bg-white shadow-card">
                <span className="flex w-14 items-center justify-center text-black">
                  <Search className="h-7 w-7" />
                </span>
                <input
                  id="home-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="focus-ring h-[50px] flex-1 border-0 px-1 text-base font-medium text-navy-900 outline-none placeholder:text-neutral-600"
                  placeholder="Search for tests eg. CBC, Thyroid, Diabetes..."
                />
                <button className="flex h-[50px] w-[118px] items-center justify-center bg-upchar-green text-lg font-bold text-white transition hover:bg-upchar-greenDark" aria-label="Search">
                  Search
                </button>
              </div>
              {query.trim() && (
                <div className="absolute inset-x-0 top-full z-40 mt-2 max-h-[430px] overflow-y-auto rounded-lg border border-blue-100 bg-white p-3 text-navy-900 shadow-soft">
                  {results.map((item) => {
                    const key = resultKey(item);
                    const type = item.resultType.toLowerCase();
                    const isAdded = addedKeys.has(cartItemKey(item.id, type));
                    const description = item.description || item.subtitle || item.testCount || item.testsIncluded || "";
                    return (
                      <div
                        role="button"
                        tabIndex={0}
                        className="grid w-full cursor-pointer gap-3 border-b border-blue-100 px-2 py-3 text-left transition last:border-0 hover:bg-green-50/45 sm:grid-cols-[76px_minmax(0,1fr)_160px] sm:items-center"
                        key={key}
                        onClick={() => openResult(item)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") openResult(item);
                        }}
                      >
                        <span className="inline-flex h-7 w-fit items-center justify-center rounded-md bg-green-50 px-4 text-[11px] font-black uppercase text-upchar-green sm:w-[58px] sm:px-0">
                          {item.resultType}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black text-navy-900">{item.name}</span>
                          {description ? <span className="mt-1 block truncate text-xs font-semibold text-navy-500">{description}</span> : null}
                        </span>
                        <span className="flex items-center justify-between gap-3 sm:justify-end">
                          <span className="text-lg font-black text-upchar-green">{price(item.discountedPrice)}</span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!isAdded) addResultToCart(event, item);
                            }}
                            className={`inline-flex h-9 min-w-[86px] items-center justify-center gap-1 rounded-md border px-3 text-xs font-black transition ${
                              isAdded
                                ? "border-upchar-green bg-green-50 text-upchar-green"
                                : "border-upchar-green bg-white text-upchar-green hover:bg-upchar-green hover:text-white"
                            }`}
                          >
                            {isAdded ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            {isAdded ? "Added ✓" : "Add"}
                          </button>
                        </span>
                      </div>
                    );
                  })}
                  {!results.length && <p className="px-3 py-5 text-center text-sm font-bold text-navy-600">No matching tests or packages.</p>}
                  <a href={`/tests?search=${encodeURIComponent(query.trim())}`} className="mt-1 flex items-center justify-center gap-2 rounded-md px-3 py-3 text-sm font-black text-upchar-green hover:bg-green-50">
                    View All Results <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {quickCards.map((card, index) => (
                card.title === "Upload Prescription" ? (
                  <button
                    type="button"
                    onClick={openUploadPrescription}
                    className={`group flex h-[50px] items-center justify-center gap-3 px-2 text-base font-bold text-white transition hover:text-upchar-green ${
                      index ? "xl:border-l xl:border-white/25" : ""
                    }`}
                    key={card.title}
                  >
                    <Icon
                      name={card.icon}
                      className={`h-8 w-8 ${
                        card.color === "red" ? "text-upchar-red" : card.color === "blue" ? "text-upchar-blue" : "text-upchar-green"
                      }`}
                    />
                    <span>{card.title}</span>
                  </button>
                ) : card.title === "Download Report" ? (
                  <button
                    type="button"
                    onClick={openReports}
                    className={`group flex h-[50px] items-center justify-center gap-3 px-2 text-base font-bold text-white transition hover:text-upchar-green ${
                      index ? "xl:border-l xl:border-white/25" : ""
                    }`}
                    key={card.title}
                  >
                    <Icon
                      name={card.icon}
                      className={`h-8 w-8 ${
                        card.color === "red" ? "text-upchar-red" : card.color === "blue" ? "text-upchar-blue" : "text-upchar-green"
                      }`}
                    />
                    <span>{card.title}</span>
                  </button>
                ) : (
                  <a
                    href={quickLink(card.title)}
                    className={`group flex h-[50px] items-center justify-center gap-3 px-2 text-base font-bold text-white transition hover:text-upchar-green ${
                      index ? "xl:border-l xl:border-white/25" : ""
                    }`}
                    key={card.title}
                  >
                    <Icon
                      name={card.icon}
                      className={`h-8 w-8 ${
                        card.color === "red" ? "text-upchar-red" : card.color === "blue" ? "text-upchar-blue" : "text-upchar-green"
                      }`}
                    />
                    <span>{card.title}</span>
                  </a>
                )
              ))}
            </div>
          </div>
        </div>
      </div>
      <AuthModal
        isOpen={authModalOpen}
        mode={authMode}
        onModeChange={setAuthMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </section>
  );
}

export default SearchSection;
