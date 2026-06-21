import { Minus, Plus, Star, Trash2 } from "lucide-react";
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
    <div className="inline-flex h-11 overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-11 items-center justify-center text-navy-700 transition hover:bg-blue-50 disabled:opacity-40"
        onClick={() => onChange(quantity - 1)}
        disabled={quantity <= 1}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="flex w-14 items-center justify-center border-x border-blue-100 text-base font-black text-navy-900">
        {quantity}
      </span>
      <button
        type="button"
        className="flex w-11 items-center justify-center text-upchar-blue transition hover:bg-blue-50"
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
    <article className="grid grid-cols-[64px_minmax(0,1fr)_44px] items-center gap-3 rounded-lg border border-blue-100 bg-white px-3 py-3 shadow-sm sm:grid-cols-[82px_minmax(0,1fr)_210px_148px_48px] sm:gap-5 sm:px-5 sm:py-4 lg:grid-cols-[96px_minmax(0,1fr)_280px_148px_48px]">
      <div className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl sm:h-20 sm:w-20 lg:h-24 lg:w-24 ${item.image ? "bg-green-50" : colorStyles[item.color] || colorStyles.green}`}>
        {item.image ? (
          <SmartImage
            src={item.image}
            alt={item.name}
            className="h-full w-full object-cover"
            fallbackClassName="h-full min-h-0 rounded-xl"
            width="96"
            height="96"
            sizes="96px"
          />
        ) : (
          <Icon name={item.icon} className="h-9 w-9 sm:h-11 sm:w-11" />
        )}
      </div>

      <div className="min-w-0">
        <h3 className="line-clamp-2 text-base font-black leading-snug text-navy-900 sm:text-xl">{item.name}</h3>
        <p className="mt-1 truncate text-sm font-black text-upchar-blue sm:text-base">{item.subtitle}</p>
        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {item.badge ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-[11px] font-black text-upchar-green">
              <Star className="h-3 w-3 fill-current" />
              {item.badge}
            </span>
          ) : null}
          {item.description ? (
            <span className="min-w-0 truncate text-xs font-semibold text-navy-500 sm:text-sm">
              {item.badge ? <span className="mr-2 text-navy-400">|</span> : null}
              {item.description}
            </span>
          ) : null}
        </div>
      </div>

      <div className="col-span-3 grid grid-cols-[1fr_auto] items-center gap-3 border-t border-blue-50 pt-2 sm:col-span-1 sm:block sm:border-t-0 sm:pt-0">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="text-xl font-black text-upchar-green sm:text-2xl">{price(item.price)}</p>
            <p className="text-sm font-bold text-navy-400 line-through">{price(item.oldPrice)}</p>
            <p className="text-xs font-black uppercase text-upchar-green sm:text-sm">{item.discount}</p>
          </div>
        </div>
        <p className="mt-2 text-sm font-semibold text-navy-500 sm:text-base">Total ({quantity} item): <span className="font-black">{price(itemTotal)}</span></p>
      </div>

      <div className="col-start-2 sm:col-start-auto">
        <QuantityStepper quantity={quantity} onChange={(nextQuantity) => onQuantityChange(item, nextQuantity)} />
      </div>

      <button
        type="button"
        className="col-start-3 flex h-11 w-11 items-center justify-center rounded-lg border border-red-400 text-red-500 transition hover:bg-red-50 sm:col-start-auto sm:h-12 sm:w-12"
        onClick={() => onRemove(item)}
        aria-label={`Remove ${item.name}`}
      >
        <Trash2 className="h-5 w-5" />
      </button>
    </article>
  );
}

export default CartItem;
