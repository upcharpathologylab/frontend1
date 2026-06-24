import { BadgeCheck, LockKeyhole, RotateCcw, ShoppingCart, Sparkles, TicketCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { price } from "../../utils.js";

function SummaryRow({ label, value, highlight = false }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm font-semibold text-navy-800">
      <span>{label}</span>
      <span className={highlight ? "font-black text-upchar-green" : "font-black text-navy-900"}>{value}</span>
    </div>
  );
}

function CartSummary({ summary, onCheckout }) {
  return (
    <section className="rounded-lg border border-blue-100 bg-white p-3 shadow-sm sm:p-6 lg:sticky lg:top-32">
      <h2 className="hidden text-2xl font-black text-navy-900 sm:block">Order Summary</h2>

      <div className="hidden sm:mt-6 sm:grid sm:gap-4">
        <SummaryRow label={`Subtotal (${summary.itemCount} items)`} value={price(summary.subtotal)} />
        <SummaryRow label="Discount" value={`- ${price(summary.discount)}`} highlight />
        <SummaryRow label="Coupon Discount" value={`- ${price(summary.couponDiscount)}`} highlight />
      </div>

      <div className="hidden sm:my-6 sm:block sm:border-t sm:border-blue-100" />

      <div className="flex items-center justify-between gap-3 sm:items-end sm:gap-4">
        <div className="min-w-0">
          <span className="block text-xs font-black text-navy-700 sm:text-xl sm:text-navy-900">Total Amount</span>
          <span className="mt-1 block truncate text-[11px] font-bold text-navy-400 line-through sm:hidden">{price(summary.oldSubtotal || summary.subtotal)}</span>
        </div>
        <span className="shrink-0 text-2xl font-black text-upchar-green sm:hidden">{price(summary.mobileTotalPayable ?? summary.totalPayable)}</span>
        <span className="hidden shrink-0 text-4xl font-black text-upchar-green sm:block">{price(summary.totalPayable)}</span>
      </div>

      <p className="mt-2 flex items-center justify-start gap-2 text-xs font-bold text-upchar-green sm:mt-5 sm:justify-center sm:text-sm">
        <TicketCheck className="h-5 w-5" />
        <span className="sm:hidden">You save {price(summary.mobileTotalSavings ?? summary.totalSavings)} on this order</span>
        <span className="hidden sm:inline">You save {price(summary.totalSavings)} on this order</span>
      </p>

      <div className="mt-5 hidden rounded-lg border border-green-200 bg-green-50 p-4 sm:block">
        <p className="flex items-center gap-2 text-base font-black text-upchar-green">
          <Sparkles className="h-5 w-5" />
          Yay! You saved more!
        </p>
        <p className="mt-2 text-sm font-bold text-navy-800">Extra savings of {price(summary.totalSavings)} on this order.</p>
      </div>

      <button
        type="button"
        onClick={onCheckout}
        className="mt-3 flex h-11 w-full items-center justify-center gap-3 rounded-md bg-upchar-green text-sm font-black text-white shadow-lg shadow-green-900/15 transition hover:bg-upchar-greenDark sm:mt-5 sm:h-12"
      >
        <ShoppingCart className="h-5 w-5" />
        Proceed to Payment
      </button>
      <p className="my-3 hidden text-center text-sm font-bold text-navy-500 sm:block">or</p>
      <Link
        to="/packages"
        className="hidden h-11 w-full items-center justify-center gap-3 rounded-md border border-blue-100 bg-white text-sm font-black text-upchar-blue transition hover:bg-blue-50 sm:flex"
      >
        <ShoppingCart className="h-5 w-5" />
        Continue Shopping
      </Link>

      <div className="mt-7 hidden grid-cols-3 gap-2 text-center text-[11px] font-black text-navy-700 sm:grid">
        <span className="flex items-center justify-center gap-1">
          <BadgeCheck className="h-4 w-4 text-upchar-blue" />
          Secure Payment
        </span>
        <span className="flex items-center justify-center gap-1">
          <LockKeyhole className="h-4 w-4 text-upchar-blue" />
          100% Confidential
        </span>
        <span className="flex items-center justify-center gap-1">
          <RotateCcw className="h-4 w-4 text-upchar-blue" />
          Easy Returns
        </span>
      </div>
    </section>
  );
}

export default CartSummary;
