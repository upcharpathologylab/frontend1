const CART_KEY = "upchar_cart";
const CART_EVENT = "upchar-cart-updated";

export const safeParseCart = (value) => {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CART_KEY);
    }
    return [];
  }
};

export const getCartItems = () => {
  if (typeof window === "undefined") return [];
  return safeParseCart(window.localStorage.getItem(CART_KEY));
};

export const getCartCount = () => getCartItems().reduce((total, item) => total + Number(item.quantity || 1), 0);

export const cartItemKey = (id, type) => `${String(type)}:${String(id)}`;

export const hasCartItem = (id, type) => getCartItems().some((item) => cartItemKey(item.id, item.type) === cartItemKey(id, type));

export const setCartItems = (items) => {
  if (typeof window === "undefined") return 0;
  const safeItems = Array.isArray(items) ? items : [];
  window.localStorage.setItem(CART_KEY, JSON.stringify(safeItems));
  const count = safeItems.reduce((total, item) => total + Number(item.quantity || 1), 0);
  window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: { count, items: safeItems } }));
  return count;
};

export const addCartItem = (item) => {
  if (typeof window === "undefined") return 0;

  const items = getCartItems();
  const existing = items.find((cartItem) => cartItem.id === item.id && cartItem.type === item.type);

  if (existing) {
    ["cartImage", "image", "imageUrl", "packageImage", "testImage", "thumbnail", "bannerImage", "coverImage", "images"].forEach((key) => {
      if (!existing[key] && item[key]) existing[key] = item[key];
    });
    existing.quantity = Number(existing.quantity || 1) + 1;
  } else {
    items.push({ ...item, quantity: Number(item.quantity || 1), addedAt: new Date().toISOString() });
  }

  return setCartItems(items);
};

export const updateCartItemQuantity = (id, type, quantity) => {
  const nextQuantity = Math.max(1, Number(quantity || 1));
  const items = getCartItems().map((item) =>
    item.id === id && item.type === type ? { ...item, quantity: nextQuantity } : item
  );
  return setCartItems(items);
};

export const removeCartItem = (id, type) => {
  const items = getCartItems().filter((item) => !(item.id === id && item.type === type));
  return setCartItems(items);
};

export const clearCart = () => setCartItems([]);

export const hasStoredCart = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CART_KEY) !== null;
};

export const cartEventName = CART_EVENT;
