import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import CartItem from "../components/cart/CartItem.jsx";
import CartOfferBanner from "../components/cart/CartOfferBanner.jsx";
import CartSummary from "../components/cart/CartSummary.jsx";
import CartTrustStrip from "../components/cart/CartTrustStrip.jsx";
import CouponBox from "../components/cart/CouponBox.jsx";
import RecommendedItems from "../components/cart/RecommendedItems.jsx";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";
import { applyCoupon as applyCouponApi } from "../api/api.js";
import { AUTH_TOKEN_KEY, getStoredUser } from "../components/auth/authStorage.js";
import { defaultCartItems, recommendedCartItems, trustStripItems } from "../data/cartData.js";
import { fallbackHomeData } from "../data/homeData.js";
import {
  addCartItem,
  cartEventName,
  getCartItems,
  hasCartItem,
  hasStoredCart,
  removeCartItem,
  setCartItems,
  updateCartItemQuantity
} from "../utils/cart.js";
import { buildOrderSummary, saveCheckoutData } from "../utils/checkout.js";

const firstImage = (value) => (Array.isArray(value) ? value.find(Boolean) : "");
const AUTH_RETURN_TO_KEY = "upchar_auth_return_to";

const cartImageValue = (item = {}) => {
  if (item.type === "package") {
    return item.image || item.imageUrl || item.packageImage || item.thumbnail || item.bannerImage || item.coverImage || firstImage(item.images) || "";
  }
  if (item.type === "test") {
    return item.testImage || item.image || item.imageUrl || item.thumbnail || item.bannerImage || item.coverImage || firstImage(item.images) || "";
  }
  return item.image || item.imageUrl || item.packageImage || item.testImage || item.thumbnail || item.bannerImage || item.coverImage || firstImage(item.images) || "";
};

const normalizeCartItem = (item) => {
  const price = item.finalPrice ?? item.discountedPrice ?? item.price ?? 0;
  const oldPrice = item.oldPrice ?? item.originalPrice ?? item.price ?? price;

  return {
    ...item,
    image: cartImageValue(item),
    price,
    oldPrice,
    subtitle: item.subtitle || item.testCount || item.testsIncluded || "Health item",
    description: item.description || "Trusted diagnostic service with easy booking.",
    discount: item.discount || "Best Price",
    icon: item.icon || "TestTube2",
    color: item.color || "green",
    quantity: Math.max(1, Number(item.quantity || 1))
  };
};

const couponPayloadItems = (items = []) =>
  items.map((item) => ({
    id: item.id || item._id || "",
    _id: item._id || item.id || "",
    name: item.name || item.title || item.testName || item.packageName || "",
    title: item.title || item.name || "",
    type: item.type || item.itemType || "",
    finalPrice: Number(item.price || 0),
    originalPrice: Number(item.oldPrice || item.price || 0),
    price: Number(item.price || 0),
    oldPrice: Number(item.oldPrice || item.price || 0),
    quantity: Number(item.quantity || 1)
  }));

function CartPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    document.title = "Your Cart | Upchar Pathology";

    if (!hasStoredCart()) {
      setCartItems(defaultCartItems);
      setItems(defaultCartItems.map(normalizeCartItem));
    } else {
      setItems(getCartItems().map(normalizeCartItem));
    }

    const handleCartChange = () => {
      setCouponDiscount(0);
      setAppliedCoupon(null);
      setItems(getCartItems().map(normalizeCartItem));
    };

    window.addEventListener(cartEventName, handleCartChange);
    window.addEventListener("storage", handleCartChange);

    return () => {
      window.removeEventListener(cartEventName, handleCartChange);
      window.removeEventListener("storage", handleCartChange);
    };
  }, []);

  const summary = useMemo(() => buildOrderSummary(items, couponDiscount), [couponDiscount, items]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const refreshItems = () => {
    setItems(getCartItems().map(normalizeCartItem));
  };

  const resetCoupon = () => {
    setCouponDiscount(0);
    setAppliedCoupon(null);
  };

  const handleQuantityChange = (item, quantity) => {
    updateCartItemQuantity(item.id, item.type, quantity);
    resetCoupon();
    refreshItems();
  };

  const handleRemove = (item) => {
    removeCartItem(item.id, item.type);
    resetCoupon();
    refreshItems();
    showToast(`${item.name} removed from cart.`);
  };

  const handleCouponApply = async () => {
    const couponBaseSummary = buildOrderSummary(items, 0);
    const subtotal = couponBaseSummary.payableBeforeCoupon;
    const normalizedCouponCode = couponCode.trim().toUpperCase();

    try {
      const result = await applyCouponApi({ couponCode: normalizedCouponCode, subtotal, items: couponPayloadItems(items) });
      setCouponDiscount(Number(result.discountAmount || 0));
      setAppliedCoupon(result);
      showToast(result.message || "Coupon applied successfully");
    } catch (error) {
      setCouponDiscount(0);
      setAppliedCoupon(null);
      showToast(error?.response?.data?.message || error?.message || "Could not apply coupon");
    }
  };

  const handleRecommendedAdd = (item) => {
    if (hasCartItem(item.id, item.type)) {
      refreshItems();
      return;
    }
    addCartItem({ ...item, quantity: 1 });
    resetCoupon();
    refreshItems();
    showToast(`${item.name} added to cart.`);
  };

  const handleCheckout = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (!items.length) {
      showToast("Your cart is empty. Add a package or test first.");
      return;
    }

    saveCheckoutData(items, summary, appliedCoupon);
    const paymentPath = "/payment";
    if (!localStorage.getItem(AUTH_TOKEN_KEY) || !getStoredUser()) {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(AUTH_RETURN_TO_KEY, paymentPath);
      }
      navigate(`/cart?auth=signin&returnTo=${encodeURIComponent(paymentPath)}`);
      return;
    }

    navigate(paymentPath);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-blue-50/70 via-white to-white">
      <Header data={fallbackHomeData} />
      <main className="pt-[68px] md:pt-[104px] lg:pt-[108px]">
        <section className="container-page pb-44 pt-8 sm:py-8 lg:py-10">
          <p className="text-sm font-black text-navy-800">
            <a href="/" className="text-upchar-blue">Home</a>
            <span className="mx-2 text-navy-400">&gt;</span>
            Cart
          </p>
          <h1 className="mt-5 text-4xl font-black text-navy-900 sm:text-5xl">Your Cart</h1>
          <p className="mt-4 text-base font-semibold text-navy-700">Review your selected tests / packages before proceeding.</p>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
            <div className="min-w-0">
              <section className="rounded-lg border border-blue-100 bg-white p-3 shadow-sm sm:p-4 lg:p-5">
                <h2 className="text-2xl font-black text-navy-900">Cart Items ({summary.itemCount})</h2>

                {items.length ? (
                  <div className="mt-4 grid gap-2">
                    {items.map((item) => (
                      <CartItem
                        item={item}
                        key={`${item.type}-${item.id}`}
                        onQuantityChange={handleQuantityChange}
                        onRemove={handleRemove}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50/40 p-8 text-center">
                    <h3 className="text-xl font-black text-navy-900">Your cart is empty</h3>
                    <p className="mt-2 text-sm font-semibold text-navy-700">Add a package or test to continue.</p>
                    <a href="/packages" className="mt-5 inline-flex rounded-md bg-upchar-green px-6 py-3 text-sm font-black text-white">
                      Continue Shopping
                    </a>
                  </div>
                )}

                <CouponBox couponCode={couponCode} onCouponChange={setCouponCode} onApply={handleCouponApply} />
                <CartTrustStrip items={trustStripItems} />
              </section>
            </div>

            <aside className="fixed inset-x-0 bottom-0 z-[90] grid gap-5 border-t border-blue-100 bg-white/95 p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur sm:static sm:border-t-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0 xl:self-start">
              <CartSummary summary={summary} onCheckout={handleCheckout} />
            </aside>
          </div>

          <RecommendedItems items={recommendedCartItems} onAdd={handleRecommendedAdd} cartItems={items} />
          <CartOfferBanner />
        </section>
      </main>
      <div className="cart-profile-mobile-hidden-footer">
        <Footer data={fallbackHomeData} />
      </div>

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

export default CartPage;
