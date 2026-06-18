import { BadgeCheck, LockKeyhole, QrCode } from "lucide-react";
import { paymentMethods } from "../../data/paymentData.js";
import { price } from "../../utils.js";

function PaymentButton({ amount, loading, cashOnDelivery = false }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-md bg-upchar-green px-5 py-4 text-base font-black text-white shadow-lg shadow-green-900/15 transition hover:bg-upchar-greenDark disabled:cursor-wait disabled:opacity-80"
    >
      <LockKeyhole className="h-5 w-5" />
      {loading ? "Processing Payment..." : cashOnDelivery ? "Confirm Booking" : `Pay ${price(amount)}`}
    </button>
  );
}

function RazorpayPaymentFields({ amount, loading }) {
  return (
    <>
      <div className="mt-7 rounded-lg border border-blue-100 bg-blue-50/50 p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white text-upchar-green">
            <QrCode className="h-8 w-8" />
          </span>
          <div>
            <p className="text-base font-black text-navy-900">Pay securely with Scanner</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-navy-700">
              Open any UPI app and scan the QR code.
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-navy-700">
              Complete the payment in the app.
            </p>
          </div>
        </div>
      </div>
      <div className="mt-6 rounded-lg border border-green-100 bg-green-50 p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-upchar-green">
            <BadgeCheck className="h-7 w-7" />
          </span>
          <div>
            <p className="font-black text-upchar-green">Booking is confirmed only after payment verification.</p>
            <p className="mt-1 text-sm font-semibold text-navy-700">Payment verification happens on our server.</p>
          </div>
        </div>
      </div>
      <PaymentButton amount={amount} loading={loading} />
    </>
  );
}

function AlternatePaymentFields({ selectedMethod, amount, loading }) {
  const method = paymentMethods.find((item) => item.id === selectedMethod);

  return (
    <>
      <div className="mt-7 rounded-lg border border-blue-100 bg-blue-50/50 p-5">
        <p className="text-base font-black text-navy-900">{method?.label || "Cash on Delivery"}</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-navy-700">
          Continue to confirm your booking and complete payment at your convenience.
        </p>
      </div>
      <PaymentButton amount={amount} loading={loading} cashOnDelivery={selectedMethod === "cod"} />
    </>
  );
}

function CardPaymentForm({ selectedMethod, amount, loading, onPay }) {
  const method = paymentMethods.find((item) => item.id === selectedMethod) || paymentMethods[0];

  return (
    <form
      className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm lg:p-7"
      onSubmit={(event) => {
        event.preventDefault();
        onPay();
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-navy-900">
            {selectedMethod === "razorpay" ? "Pay using Scanner" : `Pay using ${method.label}`}
          </h2>
          <p className="mt-3 text-sm font-semibold text-navy-600">
            {selectedMethod === "razorpay" ? "Scan QR code using any UPI app to pay securely" : method.subtitle}
          </p>
        </div>
      </div>

      {selectedMethod === "razorpay" ? (
        <RazorpayPaymentFields amount={amount} loading={loading} />
      ) : (
        <AlternatePaymentFields
          selectedMethod={selectedMethod}
          amount={amount}
          loading={loading}
        />
      )}

      <p className="mt-5 flex items-center justify-center gap-2 text-center text-sm font-semibold text-navy-700">
        <BadgeCheck className="h-4 w-4 text-upchar-green" />
        By proceeding, you agree to our{" "}
        <a href="/terms-conditions" className="font-black text-upchar-blue">
          Terms & Conditions.
        </a>
      </p>
    </form>
  );
}

export default CardPaymentForm;
