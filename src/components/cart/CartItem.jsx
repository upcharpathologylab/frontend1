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
    <div className="inline-flex h-8 overflow-hidden rounded-md border border-blue-100 bg-white shadow-sm sm:h-11 sm:rounded-lg">
      <button
        type="button"
        className="flex w-6 items-center justify-center text-navy-700 transition hover:bg-blue-50 disabled:opacity-40 sm:w-11"
        onClick={() => onChange(quantity - 1)}
        disabled={quantity <= 1}
        aria-label="Decrease quantity"
      >
        <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
      </button>
      <span className="flex w-7 items-center justify-center border-x border-blue-100 text-xs font-black text-navy-900 sm:w-14 sm:text-base">
        {quantity}
      </span>
      <button
        type="button"
        className="flex w-6 items-center justify-center text-upchar-blue transition hover:bg-blue-50 sm:w-11"
        onClick={() => onChange(quantity + 1)}
        aria-label="Increase quantity"
      >
        <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
      </button>
    </div>
  );
}

function CartItem({ item, onQuantityChange, onRemove }) {
  const quantity = Number(item.quantity || 1);
  const itemTotal = Number(item.price || 0) * quantity;

  return (
    <article className="grid grid-cols-[44px_minmax(0,1fr)_64px_74px_34px] items-center gap-2 rounded-lg border border-blue-100 bg-white px-2 py-2 shadow-sm sm:grid-cols-[82px_minmax(0,1fr)_210px_148px_48px] sm:gap-5 sm:px-5 sm:py-4 lg:grid-cols-[96px_minmax(0,1fr)_280px_148px_48px]">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl sm:h-20 sm:w-20 lg:h-24 lg:w-24 ${item.image ? "bg-green-50" : colorStyles[item.color] || colorStyles.green}`}>
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
          <Icon name={item.icon} className="h-6 w-6 sm:h-11 sm:w-11" />
        )}
      </div>

      <div className="min-w-0">
        <h3 className="line-clamp-2 text-[12px] font-black leading-tight text-navy-900 sm:text-xl sm:leading-snug">{item.name}</h3>
        <p className="mt-0.5 truncate text-[11px] font-black text-upchar-blue sm:mt-1 sm:text-base">{item.subtitle}</p>
        <div className="mt-1 flex min-w-0 items-center gap-1 sm:mt-2 sm:flex-wrap sm:gap-x-2 sm:gap-y-1">
          {item.badge ? (
            <span className="inline-flex max-w-[72px] shrink-0 items-center gap-1 truncate rounded-md bg-green-100 px-1.5 py-0.5 text-[9px] font-black text-upchar-green sm:max-w-none sm:px-2 sm:py-1 sm:text-[11px]">
              <Star className="h-2.5 w-2.5 shrink-0 fill-current sm:h-3 sm:w-3" />
              {item.badge}
            </span>
          ) : null}
          {item.description ? (
            <span className="min-w-0 truncate text-[10px] font-semibold text-navy-500 sm:text-sm">
              {item.badge ? <span className="mr-2 text-navy-400">|</span> : null}
              {item.description}
            </span>
          ) : null}
        </div>
      </div>

      <div className="min-w-0 sm:col-span-1 sm:block sm:border-t-0 sm:pt-0">
        <div>
          <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-4 sm:gap-y-1">
            <p className="truncate text-sm font-black leading-none text-upchar-green sm:text-2xl sm:leading-normal">{price(item.price)}</p>
            <p className="truncate text-[10px] font-bold leading-none text-navy-400 line-through sm:text-sm sm:leading-normal">{price(item.oldPrice)}</p>
            <p className="truncate text-[9px] font-black uppercase leading-none text-upchar-green sm:text-sm sm:leading-normal">{item.discount}</p>
          </div>
        </div>
        <p className="mt-1 truncate text-[10px] font-semibold leading-tight text-navy-500 sm:mt-2 sm:text-base sm:leading-normal">Total ({quantity} item): <span className="font-black">{price(itemTotal)}</span></p>
      </div>

      <div className="justify-self-center sm:col-start-auto">
        <QuantityStepper quantity={quantity} onChange={(nextQuantity) => onQuantityChange(item, nextQuantity)} />
      </div>

      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center justify-self-end rounded-md border border-red-400 text-red-500 transition hover:bg-red-50 sm:col-start-auto sm:h-12 sm:w-12 sm:rounded-lg"
        onClick={() => onRemove(item)}
        aria-label={`Remove ${item.name}`}
      >
        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>
    </article>
  );
}

export default CartItem;
