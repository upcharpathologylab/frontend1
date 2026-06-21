import { Minus, Plus, X } from "lucide-react";
import Icon from "../Icon.jsx";
import SmartImage from "../SmartImage.jsx";
import { price } from "../../utils.js";

const colorStyles = {
  green: "bg-green-50 text-upchar-green",
  blue: "bg-blue-50 text-upchar-blue",
  purple: "bg-violet-50 text-upchar-purple",
  red: "bg-red-50 text-upchar-red",
  orange: "bg-orange-50 text-upchar-orange",
  teal: "bg-teal-50 text-upchar-teal"
};

function QuantityStepper({ quantity, onChange }) {
  return (
    <div className="inline-flex h-9 overflow-hidden rounded-md border border-blue-100 bg-white">
      <button
        type="button"
        className="flex w-9 items-center justify-center text-navy-700 transition hover:bg-blue-50 disabled:opacity-40"
        onClick={() => onChange(quantity - 1)}
        disabled={quantity <= 1}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="flex w-11 items-center justify-center border-x border-blue-100 text-sm font-black text-navy-900">
        {quantity}
      </span>
      <button
        type="button"
        className="flex w-9 items-center justify-center text-upchar-blue transition hover:bg-blue-50"
        onClick={() => onChange(quantity + 1)}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function CartItem({ item, onQuantityChange, onRemove }) {
  const quantity = Number(item.quantity || 1);
  const itemTotal = Number(item.price || 0) * quantity;

  return (
    <article className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 border-t border-blue-100 py-3 first:border-t-0 sm:grid-cols-[56px_minmax(0,1fr)_150px_112px_36px] sm:gap-4 lg:grid-cols-[60px_minmax(0,1fr)_180px_122px_36px]">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg sm:h-14 sm:w-14 ${item.image ? "bg-blue-50" : colorStyles[item.color] || colorStyles.green}`}>
        {item.image ? (
          <SmartImage
            src={item.image}
            alt={item.name}
            className="h-full w-full object-cover"
            fallbackClassName="h-full min-h-0 rounded-lg"
            width="56"
            height="56"
            sizes="56px"
          />
        ) : (
          <Icon name={item.icon} className="h-7 w-7 sm:h-8 sm:w-8" />
        )}
      </div>

      <div className="min-w-0">
        <h3 className="line-clamp-2 text-sm font-black leading-snug text-navy-900 sm:text-base">{item.name}</h3>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="max-w-full truncate text-xs font-black text-upchar-blue sm:text-sm">{item.subtitle}</span>
          {item.badge ? (
            <span className="inline-flex shrink-0 rounded-md border border-upchar-green px-2 py-0.5 text-[10px] font-black text-upchar-green">
              {item.badge}
            </span>
          ) : null}
        </div>
      </div>

      <div className="col-span-3 grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg bg-blue-50/45 px-3 py-2 sm:col-span-1 sm:block sm:bg-transparent sm:p-0">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-sm font-black text-upchar-green sm:text-base">{price(item.price)}</p>
            <p className="text-xs font-bold text-navy-400 line-through">{price(item.oldPrice)}</p>
          </div>
          <p className="mt-0.5 text-xs font-black text-upchar-green">{item.discount}</p>
        </div>
        <div className="text-right sm:mt-1 sm:text-left">
          <p className="text-[10px] font-black uppercase text-navy-500 sm:hidden">Total</p>
          <p className="text-sm font-black text-navy-900 sm:text-upchar-green">{price(itemTotal)}</p>
        </div>
      </div>

      <div className="col-start-2 sm:col-start-auto">
        <QuantityStepper quantity={quantity} onChange={(nextQuantity) => onQuantityChange(item, nextQuantity)} />
      </div>

      <button
        type="button"
        className="col-start-3 flex h-9 w-9 items-center justify-center rounded-full border border-blue-100 text-navy-400 transition hover:border-upchar-red hover:text-upchar-red sm:col-start-auto"
        onClick={() => onRemove(item)}
        aria-label={`Remove ${item.name}`}
      >
        <X className="h-5 w-5" />
      </button>
    </article>
  );
}

export default CartItem;
