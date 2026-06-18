import { BadgeCheck, LockKeyhole, QrCode } from "lucide-react";
import { paymentMethods } from "../../data/paymentData.js";
import { price } from "../../utils.js";

const qrUpiId = import.meta.env.VITE_QR_UPI_ID || import.meta.env.VITE_UPI_ID || "";

function PaymentButton({ amount, loading, cashOnDelivery = false, qrPayment = false }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-md bg-upchar-green px-5 py-4 text-base font-black text-white shadow-lg shadow-green-900/15 transition hover:bg-upchar-greenDark disabled:cursor-wait disabled:opacity-80"
    >
      <LockKeyhole className="h-5 w-5" />
      {loading ? "Processing Payment..." : cashOnDelivery ? "Confirm Booking" : qrPayment ? "I have paid" : `Pay ${price(amount)}`}
    </button>
  );
}

function QrPaymentFields({ amount, loading }) {
  return (
    <>
      <div className="mt-7 grid gap-5 lg:grid-cols-[220px_1fr]">
        <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-5">
          <div className="grid h-full w-full place-items-center rounded-md bg-white text-navy-700 shadow-sm">
            <QrCode className="h-28 w-28 text-navy-900" strokeWidth={1.8} />
          </div>
        </div>
        <div className="rounded-lg border border-green-100 bg-green-50 p-5">
          <p className="text-sm font-black uppercase tracking-wide text-upchar-green">Payable Amount</p>
          <p className="mt-2 text-4xl font-black text-navy-900">{price(amount)}</p>
          {qrUpiId ? (
            <p className="mt-4 text-sm font-bold text-navy-700">
              UPI ID: <span className="text-navy-950">{qrUpiId}</span>
            </p>
          ) : null}
          <p className="mt-4 text-sm font-semibold leading-6 text-navy-700">
            Scan the QR code with any UPI app. After completing payment, tap the button below so our team can verify it.
          </p>
        </div>
      </div>
      <div className="mt-6 rounded-lg border border-green-100 bg-green-50 p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-upchar-green">
            <BadgeCheck className="h-7 w-7" />
          </span>
          <div>
            <p className="font-black text-upchar-green">Payment will stay pending until verified.</p>
            <p className="mt-1 text-sm font-semibold text-navy-700">We will confirm your booking after admin verification.</p>
          </div>
        </div>
      </div>
      <PaymentButton amount={amount} loading={loading} qrPayment />
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
            {selectedMethod === "qr" ? "Pay using QR Payment" : `Pay using ${method.label}`}
          </h2>
          <p className="mt-3 text-sm font-semibold text-navy-600">
            {method.subtitle}
          </p>
        </div>
      </div>

      {selectedMethod === "qr" ? (
        <QrPaymentFields amount={amount} loading={loading} />
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
