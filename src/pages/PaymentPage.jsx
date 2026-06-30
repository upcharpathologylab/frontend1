import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { createBookingLead, createRazorpayOrder, getUserAddresses, getUserProfile, verifyRazorpayPayment } from "../api/api.js";
import AccountToast from "../components/account/AccountToast.jsx";
import CardPaymentForm from "../components/payment/CardPaymentForm.jsx";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";
import PaymentHelpStrip from "../components/payment/PaymentHelpStrip.jsx";
import PaymentMethodTabs from "../components/payment/PaymentMethodTabs.jsx";
import PaymentOrderSummary from "../components/payment/PaymentOrderSummary.jsx";
import PaymentTrustSection from "../components/payment/PaymentTrustSection.jsx";
import { paymentMethods } from "../data/paymentData.js";
import { fallbackHomeData } from "../data/homeData.js";
import { getStoredUser } from "../components/auth/authStorage.js";
import {
  createBookingData,
  customerDetails,
  getCheckoutData,
  savePaymentFailureData,
  saveBookingData,
  saveCheckoutData
} from "../utils/checkout.js";

const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayCheckout() {
  if (typeof window === "undefined") return Promise.reject(new Error("Razorpay checkout can only run in the browser."));
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${RAZORPAY_CHECKOUT_SRC}"]`);

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Unable to load Razorpay Checkout.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Unable to load Razorpay Checkout."));
    document.body.appendChild(script);
  });
}

function openRazorpayCheckout(options) {
  return new Promise((resolve, reject) => {
    const razorpay = new window.Razorpay({
      ...options,
      handler: resolve,
      modal: {
        ondismiss: () => {
          const error = new Error("Payment cancelled. You can try again when ready.");
          error.cancelled = true;
          reject(error);
        }
      }
    });

    razorpay.on("payment.failed", (response) => {
      const error = new Error(response?.error?.description || "Razorpay payment failed.");
      error.failed = true;
      error.razorpayResponse = response;
      reject(error);
    });

    razorpay.open();
  });
}

function getPaymentErrorMessage(error) {
  const errors = error?.response?.data?.errors;
  if (errors && typeof errors === "object") {
    return Object.values(errors).filter(Boolean).join(" ");
  }
  return error?.response?.data?.message || error?.message || "Unable to process payment. Please try again.";
}

function validateBookingCustomer(customer = {}) {
  if (!String(customer.name || "").trim()) return "Please update your profile name before payment.";
  if (String(customer.phone || "").replace(/\D/g, "").slice(-10).length !== 10) return "Please update a valid phone number before payment.";
  if (!String(customer.email || "").trim()) return "Please update your email before payment.";
  if (!String(customer.address || "").trim()) return "Please add a primary address before payment.";
  if (!String(customer.pincode || "").trim()) return "Please add pincode in your address before payment.";
  return "";
}

function openBookingWhatsApp(booking, summary) {
  const whatsappNumber = String(fallbackHomeData.siteSettings.whatsappNumber || "8882753539").replace(/\D/g, "");
  const itemLines = booking.items.map((item) => `- ${item.name || item.title} x ${item.quantity}`).join("\n");
  const message = [
    "New Cash on Delivery Booking",
    `Booking ID: ${booking.bookingId}`,
    `Customer: ${booking.customer.name}`,
    `Mobile: ${booking.customer.phone}`,
    "Selected Tests/Packages:",
    itemLines,
    `Quantity: ${summary.itemCount}`,
    `Subtotal: Rs. ${summary.subtotal}`,
    `Discount: Rs. ${summary.totalSavings}`,
    `Total Payable: Rs. ${summary.totalPayable}`,
    "Payment Method: Cash on Delivery",
    "Payment Status: COD",
    "Booking Status: Pending Confirmation",
    "Upchar Pathology Lab"
  ].join("\n");
  window.open(`https://wa.me/91${whatsappNumber.slice(-10)}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

function getCheckoutCustomer() {
  const user = getStoredUser();
  if (!user) return customerDetails;

  return {
    ...customerDetails,
    name: user.fullName || user.name || customerDetails.name,
    phone: user.phone || customerDetails.phone,
    email: user.email || customerDetails.email
  };
}

const addressText = (address = {}) =>
  [address.addressLine1, address.addressLine2, address.landmark, address.city, address.state, address.country]
    .filter(Boolean)
    .join(", ");

function PaymentPage() {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState("razorpay");
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [toast, setToast] = useState("");
  const [checkoutData, setCheckoutData] = useState({ items: [], summary: null });
  const [customer, setCustomer] = useState(() => getCheckoutCustomer());

  useEffect(() => {
    document.title = "Payment | Upchar Pathology";
    const data = getCheckoutData();
    setCheckoutData(data);
    setCustomer(getCheckoutCustomer());
    if (data.items.length) {
      saveCheckoutData(data.items, data.summary, data.appliedCoupon);
    }
    if (!getStoredUser()) {
      navigate(`/payment?auth=signin&returnTo=${encodeURIComponent("/payment")}`, { replace: true });
    }
  }, []);

  const handlePayment = async () => {
    if (!checkoutData.items.length || loading) return;

    if (!getStoredUser()) {
      saveCheckoutData(checkoutData.items, checkoutData.summary);
      navigate(`/payment?auth=signin&returnTo=${encodeURIComponent("/payment")}`);
      return;
    }

    setLoading(true);
    setPaymentError("");

    const showToast = (message) => {
      setToast(message);
      window.setTimeout(() => setToast(""), 2600);
    };

    let failureCustomer = customer;

    try {
      const payableAmount = Number(checkoutData.summary?.totalPayable || 0);
      if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
        throw new Error("A valid payable amount is required.");
      }

      const [serverProfile, serverAddresses] = await Promise.all([
        getUserProfile(),
        getUserAddresses().catch(() => [])
      ]);
      const primaryAddress =
        (Array.isArray(serverAddresses) ? serverAddresses : []).find((address) => address.isPrimary || address.primary) ||
        (Array.isArray(serverAddresses) ? serverAddresses[0] : null);
      const bookingCustomer = {
        ...customer,
        name: serverProfile?.fullName || "",
        phone: serverProfile?.phone || "",
        email: serverProfile?.email || "",
        address: primaryAddress ? addressText(primaryAddress) : "",
        pincode: primaryAddress?.pincode || "",
        city: primaryAddress?.city || ""
      };
      failureCustomer = bookingCustomer;
      const validationMessage = validateBookingCustomer(bookingCustomer);
      if (validationMessage) throw new Error(validationMessage);

      const selectedTestOrPackage = checkoutData.items.map((item) => `${item.name || item.title} x ${item.quantity}`).join(", ");
      const bookingPayload = {
        fullName: bookingCustomer.name,
        mobile: bookingCustomer.phone.replace(/\D/g, "").slice(-10),
        email: bookingCustomer.email,
        address: bookingCustomer.address,
        pincode: bookingCustomer.pincode,
        collectionType: bookingCustomer.collectionType,
        collectionDate: bookingCustomer.date,
        timeSlot: bookingCustomer.timeSlot,
        city: bookingCustomer.city || "",
        selectedTestOrPackage,
        items: JSON.stringify(checkoutData.items),
        summary: JSON.stringify(checkoutData.summary),
        appliedCoupon: JSON.stringify(checkoutData.appliedCoupon || null),
        quantity: checkoutData.summary.itemCount,
        subtotal: checkoutData.summary.subtotal,
        discount: checkoutData.summary.totalSavings,
        couponCode: checkoutData.appliedCoupon?.couponCode || "",
        couponName: checkoutData.appliedCoupon?.couponName || checkoutData.appliedCoupon?.title || "",
        couponDiscount: checkoutData.summary.couponDiscount,
        totalPayable: checkoutData.summary.totalPayable
      };

      if (selectedMethod === "razorpay") {
        const order = await createRazorpayOrder({
          amount: payableAmount,
          currency: "INR",
          receipt: `upchar_${Date.now()}`,
          notes: {
            itemCount: checkoutData.summary.itemCount,
            paymentMode: "Razorpay Online Payment",
            source: "checkout-page"
          },
          bookingData: {
            ...bookingPayload,
            paymentMethod: "Razorpay Online Payment",
            source: "razorpay-checkout"
          }
        });

        await loadRazorpayCheckout();

        const paymentResponse = await openRazorpayCheckout({
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || order.key_id || order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "Upchar Pathology",
          description: "Lab test booking payment",
          order_id: order.order_id || order.orderId,
          prefill: {
            name: bookingCustomer.name,
            email: bookingCustomer.email,
            contact: bookingCustomer.phone.replace(/\D/g, "")
          },
          notes: {
            receipt: order.receipt,
            paymentMode: "Razorpay Online Payment"
          },
          theme: {
            color: "#099447"
          }
        });

        const verification = await verifyRazorpayPayment({
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          paymentMethod: "Razorpay Online Payment",
          bookingData: {
            ...bookingPayload,
            paymentMethod: "Razorpay Online Payment",
            source: "razorpay-checkout"
          }
        });

        const booking = createBookingData({
          items: checkoutData.items,
          summary: checkoutData.summary,
          status: "paid",
          paymentMode: "Razorpay Online Payment",
          paymentId: verification.paymentId,
          razorpayOrderId: verification.orderId,
          bookingId: verification.booking?.bookingId,
          bookingStatus: verification.booking?.bookingStatus || "Pending Confirmation",
          customer: bookingCustomer
        });

        saveBookingData(booking);
        navigate("/booking-confirmation");
        return;
      }

      const response = await createBookingLead({
          ...bookingPayload,
          paymentMethod: "Cash on Delivery",
          paymentStatus: "COD",
          bookingStatus: "Pending Confirmation",
          source: "cash-on-delivery-checkout"
        });

      const booking = {
        ...createBookingData({
          items: checkoutData.items,
          summary: checkoutData.summary,
          status: "pending",
          paymentMode: "Cash on Delivery",
          paymentId: "COD",
          bookingId: response.data?.bookingId,
          bookingStatus: response.data?.bookingStatus || "Pending Confirmation",
          customer: bookingCustomer
        }),
        paymentStatus: "COD"
      };

      saveBookingData(booking);
      openBookingWhatsApp(booking, checkoutData.summary);
      navigate("/booking-confirmation");
      return;
    } catch (error) {
      const errorMessage = getPaymentErrorMessage(error);
      setPaymentError(errorMessage);
      showToast(errorMessage);
      if (error.failed || error.cancelled) {
        savePaymentFailureData(createBookingData({
          items: checkoutData.items,
          summary: checkoutData.summary,
          status: "failed",
          paymentMode: "Razorpay Online Payment",
          failureReason: errorMessage,
          customer: failureCustomer
        }));
      }
      setLoading(false);
      return;
    }
  };

  const summary = checkoutData.summary;

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-blue-50/70 via-white to-white">
      <Header data={fallbackHomeData} />
      <main className="pt-[68px] md:pt-[104px] lg:pt-[108px]">
        <section className="container-page py-8 lg:py-10">
          <p className="text-sm font-black text-navy-800">
            <Link to="/" className="text-upchar-blue">Home</Link>
            <span className="mx-2 text-navy-400">&gt;</span>
            <Link to="/cart" className="text-upchar-blue">Cart</Link>
            <span className="mx-2 text-navy-400">&gt;</span>
            Payment
          </p>

          <h1 className="mt-5 text-4xl font-black text-navy-900 sm:text-5xl">Payment</h1>
          <p className="mt-4 text-base font-semibold text-navy-700">Complete your payment and confirm your booking.</p>

          <div className="mt-8 flex flex-wrap items-center gap-4 text-sm font-semibold text-navy-700">
            <p className="flex items-center gap-2 font-black text-upchar-green">
              <ShieldCheck className="h-5 w-5" />
              100% Secure Payment
            </p>
            <span className="hidden h-6 w-px bg-blue-100 sm:block" />
            <p>Your payment details are safe with us.</p>
          </div>

          {paymentError ? (
            <div className="mt-5 rounded-lg border border-red-100 bg-red-50 px-5 py-4 text-sm font-black text-upchar-red" role="alert">
              {paymentError}
            </div>
          ) : null}

          {summary && checkoutData.items.length ? (
            <>
              <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_390px]">
                <section className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm lg:p-6">
                  <div className="grid gap-6 xl:grid-cols-[285px_1fr]">
                    <PaymentMethodTabs
                      methods={paymentMethods}
                      selectedMethod={selectedMethod}
                      onSelect={setSelectedMethod}
                    />
                    <CardPaymentForm
                      selectedMethod={selectedMethod}
                      amount={summary.totalPayable}
                      loading={loading}
                      onPay={handlePayment}
                    />
                  </div>
                </section>

                <PaymentOrderSummary items={checkoutData.items} summary={summary} />
              </div>

              <PaymentTrustSection />
              <PaymentHelpStrip />
            </>
          ) : (
            <section className="mt-8 rounded-lg border border-blue-100 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-black text-navy-900">Your cart is empty</h2>
              <p className="mt-3 text-sm font-semibold text-navy-700">Add a package or test before continuing to payment.</p>
              <Link
                to="/packages"
                className="mt-6 inline-flex h-12 items-center justify-center rounded-md bg-upchar-green px-7 text-sm font-black text-white"
              >
                Continue Shopping
              </Link>
            </section>
          )}
        </section>
      </main>
      <Footer data={fallbackHomeData} />
      <AccountToast message={toast} />
    </div>
  );
}

export default PaymentPage;
