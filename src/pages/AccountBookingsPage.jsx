import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, XCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AccountLayout from "../components/account/AccountLayout.jsx";
import AccountToast from "../components/account/AccountToast.jsx";
import { AccountEmptyState, AccountLoadingState, AccountSyncNotice } from "../components/account/AccountState.jsx";
import BookingCard from "../components/account/bookings/BookingCard.jsx";
import ConfirmDeleteModal from "../components/account/ConfirmDeleteModal.jsx";
import FormModal from "../components/profile/FormModal.jsx";
import QuickActions from "../components/account/QuickActions.jsx";
import SummaryCard from "../components/account/SummaryCard.jsx";
import TabFilterBar from "../components/account/TabFilterBar.jsx";
import TrustStrip from "../components/account/TrustStrip.jsx";
import UserProfileCard from "../components/account/UserProfileCard.jsx";
import StatusBadge from "../components/account/StatusBadge.jsx";
import { price } from "../utils.js";
import { cancelUserBooking, getUserBooking, getUserBookings } from "../api/api.js";
import { getStoredUser } from "../components/auth/authStorage.js";

const bookingSummaryCards = [
  { title: "Total Bookings", icon: "ClipboardList", color: "blue" },
  { title: "Completed", icon: "BadgeCheck", color: "green" },
  { title: "Upcoming", icon: "Clock3", color: "orange" },
  { title: "Cancelled", icon: "CircleX", color: "red" }
];

const activeBookingStatuses = new Set([
  "Pending Confirmation",
  "Confirmed",
  "Sample Collection Scheduled",
  "Sample Collection Confirmed",
  "Testing In Progress",
  "Report Ready",
  "Upcoming"
]);

const bookingStatusStages = [
  "Pending Confirmation",
  "Confirmed",
  "Sample Collection Scheduled",
  "Sample Collection Confirmed",
  "Testing In Progress",
  "Report Ready",
  "Completed",
  "Cancelled"
];

function DetailRow({ label, value }) {
  return (
    <div className="rounded-md border border-blue-100 bg-blue-50/30 px-3 py-2">
      <span className="block text-[10px] font-black uppercase text-navy-500">{label}</span>
      <span className="mt-0.5 block text-sm font-bold leading-5 text-navy-900">{value || "-"}</span>
    </div>
  );
}

function BookingStatusTimeline({ status }) {
  const currentStatus = status || "Pending Confirmation";
  const currentIndex = bookingStatusStages.indexOf(currentStatus);
  const isCancelled = currentStatus === "Cancelled";

  return (
    <section className="rounded-lg border border-blue-100 bg-white p-3">
      <h3 className="text-sm font-black text-navy-900">Booking Status Stages</h3>
      <div className="mt-4 max-w-full overflow-x-auto sm:mt-3 sm:overflow-hidden">
        <div className="flex min-w-[760px] items-start gap-2 sm:grid sm:min-w-0 sm:grid-cols-4 lg:grid-cols-8">
          {bookingStatusStages.map((stage, index) => {
            const isDone = !isCancelled && currentIndex >= 0 && index <= currentIndex;
            const isLineDone = !isCancelled && currentIndex > index;
            const isCancelledStage = isCancelled && stage === "Cancelled";
            const circleClass = isCancelledStage
              ? "bg-red-50 text-upchar-red ring-2 ring-upchar-red ring-offset-2"
              : isDone
                ? "bg-green-50 text-upchar-green ring-2 ring-upchar-green ring-offset-2"
                : "bg-slate-100 text-navy-400";

            return (
              <article className="w-24 shrink-0 text-center sm:w-auto sm:min-w-0 sm:shrink" key={stage}>
                <div className="flex items-center">
                  <span className={`mx-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${circleClass}`}>
                    {isCancelledStage ? <XCircle className="h-4 w-4" /> : isDone ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                  </span>
                  {index < bookingStatusStages.length - 1 ? <span className={`h-1 flex-1 rounded-full sm:hidden lg:block ${isLineDone ? "bg-upchar-green" : "bg-slate-200"}`} /> : null}
                </div>
                <h4 className={`mt-1 text-[10px] font-black leading-4 ${isCancelledStage ? "text-upchar-red" : isDone ? "text-upchar-green" : "text-navy-700"}`}>{stage}</h4>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BookingDetailsModal({ booking, loading, onClose }) {
  const customer = booking?.customer || {};
  const summary = booking?.summary || {};
  const items = Array.isArray(booking?.items) ? booking.items : [];
  const status = booking?.currentStatus || booking?.bookingStatus || booking?.status || "Pending Confirmation";

  return (
    <FormModal title={booking?.bookingId ? `Booking ${booking.bookingId}` : "Booking Details"} onClose={onClose} panelClassName="max-w-5xl" bodyClassName="p-3 sm:p-4">
      {loading ? (
        <AccountLoadingState />
      ) : booking ? (
        <div className="grid gap-3">
          <div className="grid gap-3 lg:grid-cols-[1fr_260px] lg:items-stretch">
            <BookingStatusTimeline status={status} />
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/40 p-3 lg:flex-col lg:items-start lg:justify-center">
            <span>
              <span className="block text-xs font-black text-navy-500">Current Status</span>
              <span className="mt-1 block text-lg font-black text-navy-900">{status}</span>
            </span>
            <StatusBadge label={status} />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <DetailRow label="Booking ID" value={booking.bookingId} />
            <DetailRow label="Patient Name" value={customer.name} />
            <DetailRow label="Phone Number" value={customer.phone} />
            <DetailRow label="Quantity" value={summary.itemCount || items.reduce((total, item) => total + Number(item.quantity || 1), 0)} />
            <DetailRow label="Booking Date/Time" value={booking.bookingDate} />
            <DetailRow label="Collection Type" value={customer.collectionType} />
            <DetailRow label="Address" value={customer.address} />
            <DetailRow label="Payment Method" value={booking.paymentMode || booking.paymentMethod} />
            <DetailRow label="Total Amount" value={price(summary.totalPayable || 0)} />
          </div>
          <section className="rounded-lg border border-blue-100 bg-white p-3">
            <h3 className="text-sm font-black text-navy-900">Tests / Packages</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {items.length ? items.map((item) => (
                <div className="flex items-center justify-between gap-3 rounded-md bg-blue-50/40 px-3 py-2 text-xs font-bold text-navy-800 sm:text-sm" key={`${item.id}-${item.name}`}>
                  <span>{item.name || item.title}</span>
                  <span className="shrink-0">Qty {item.quantity || 1}</span>
                </div>
              )) : <p className="text-sm font-semibold text-navy-600">No items found.</p>}
            </div>
          </section>
        </div>
      ) : (
        <AccountEmptyState title="Booking not found" text="Please close this window and try again." />
      )}
    </FormModal>
  );
}

function AccountBookingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("All Bookings");
  const [toast, setToast] = useState("");
  const [bookings, setBookings] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [profile, setProfile] = useState(() => getStoredUser() || {});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailsBooking, setDetailsBooking] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    document.title = "My Bookings | Upchar Pathology";

    async function loadBookings() {
      if (!getStoredUser()) {
        navigate(`/?auth=signin&returnTo=${encodeURIComponent("/my-account/bookings")}`, { replace: true });
        return;
      }

      setProfile(getStoredUser() || {});
      setLoading(true);
      setError("");
      try {
        const data = await getUserBookings();
        if (active) setBookings(Array.isArray(data) ? data : []);
      } catch {
        if (active) {
          setBookings([]);
          setError("Could not load your bookings. Please try again.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBookings();
    return () => {
      active = false;
    };
  }, []);

  const filteredBookings = useMemo(() => {
    if (activeTab.startsWith("Upcoming")) return bookings.filter((item) => activeBookingStatuses.has(item.status));
    if (activeTab.startsWith("Completed")) return bookings.filter((item) => item.status === "Completed");
    if (activeTab.startsWith("Cancelled")) return bookings.filter((item) => item.status === "Cancelled");
    return bookings;
  }, [activeTab, bookings]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const summaryCards = useMemo(() => {
    const total = bookings.length;
    const upcoming = bookings.filter((item) => activeBookingStatuses.has(item.status)).length;
    const completed = bookings.filter((item) => item.status === "Completed").length;
    const cancelled = bookings.filter((item) => item.status === "Cancelled").length;
    const values = [total, completed, upcoming, cancelled];
    return bookingSummaryCards.map((card, index) => ({ ...card, value: String(values[index]) }));
  }, [bookings]);

  const tabs = useMemo(() => {
    const upcoming = bookings.filter((item) => activeBookingStatuses.has(item.status)).length;
    const completed = bookings.filter((item) => item.status === "Completed").length;
    const cancelled = bookings.filter((item) => item.status === "Cancelled").length;
    return [
      `All Bookings (${bookings.length})`,
      `Upcoming (${upcoming})`,
      `Completed (${completed})`,
      `Cancelled (${cancelled})`
    ];
  }, [bookings]);
  const selectedTab = tabs.find((tab) => tab.startsWith(activeTab.split(" (")[0])) || activeTab;

  const confirmDeleteBooking = async () => {
    if (!deleteTarget) return;
    try {
      const saved = await cancelUserBooking(deleteTarget._id || deleteTarget.id || deleteTarget.bookingId, { deleteRequest: true });
      setBookings((current) => current.map((booking) => (
        (booking._id || booking.id) === (deleteTarget._id || deleteTarget.id)
          ? { ...booking, ...saved, status: "Cancelled", bookingStatus: "Cancelled", canDelete: false }
          : booking
      )));
      setDeleteTarget(null);
      showToast("Booking moved to cancelled.");
    } catch (error) {
      showToast(error?.response?.data?.message || "Could not delete booking.");
    }
  };

  const openBookingDetails = async (booking) => {
    setDetailsBooking(booking);
    setDetailsLoading(true);
    try {
      const data = await getUserBooking(booking._id || booking.id || booking.bookingId);
      setDetailsBooking(data);
    } catch (error) {
      showToast(error?.response?.data?.message || "Could not load booking details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <AccountLayout
      active="bookings"
      breadcrumbCurrent="My Bookings"
      title="My Bookings"
      subtitle="View and manage all your test bookings"
    >
      <header className="mobile-bookings-header">
        <Link to="/my-account" aria-label="Back to profile">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1>My Bookings</h1>
        <span aria-hidden="true" />
      </header>

      <div className="mobile-bookings-summary-wrap grid gap-6 xl:grid-cols-[280px_1fr]">
        <UserProfileCard profile={profile} />
        <section className="mobile-bookings-summary rounded-lg border border-blue-100 bg-white p-5 shadow-sm lg:p-6">
          <h2 className="text-xl font-black text-navy-900">Booking Summary</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <SummaryCard key={card.title} {...card} />
            ))}
          </div>
        </section>
      </div>

      <AccountSyncNotice message={error} />

      <section className="mobile-bookings-panel rounded-lg border border-blue-100 bg-white p-4 shadow-sm lg:p-5">
        <TabFilterBar
          tabs={tabs}
          activeTab={selectedTab}
          onTabChange={setActiveTab}
          rightControl={
            <button type="button" className="inline-flex h-11 items-center gap-3 rounded-md border border-blue-100 px-4 text-sm font-black text-navy-800 hover:bg-blue-50">
              All Time
              <ChevronDown className="h-4 w-4" />
            </button>
          }
        />
        <div className="mt-5">
          {loading ? (
            <AccountLoadingState />
          ) : filteredBookings.length ? (
            <div className="mobile-bookings-list grid gap-4">
              {filteredBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onAction={openBookingDetails}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          ) : (
            <div className="mobile-bookings-empty">
              <AccountEmptyState title="No bookings found" text="Try a different tab or book a new test." />
              <Link to="/tests" className="mobile-bookings-empty-cta">Book a Test Now</Link>
            </div>
          )}
        </div>
      </section>

      <div className="mobile-bookings-pagination flex flex-col gap-4 text-sm font-semibold text-navy-700 sm:flex-row sm:items-center sm:justify-between">
        <p>Showing {filteredBookings.length ? `1 to ${filteredBookings.length}` : "0"} of {bookings.length} bookings</p>
        <div className="flex items-center gap-2">
          <button className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-100 text-navy-800" type="button" aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {[1, 2, 3].map((page) => (
            <button
              className={`flex h-10 w-10 items-center justify-center rounded-md border text-sm font-black ${
                page === 1 ? "border-upchar-green bg-upchar-green text-white" : "border-blue-100 text-navy-800"
              }`}
              type="button"
              key={page}
            >
              {page}
            </button>
          ))}
          <button className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-100 text-navy-800" type="button" aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <section className="mobile-bookings-cta grid gap-5 rounded-lg border border-blue-100 bg-blue-50/50 p-5 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h2 className="text-xl font-black text-navy-900">Need to book a new test?</h2>
          <p className="mt-2 text-sm font-semibold text-navy-700">Choose from our wide range of health packages and tests.</p>
        </div>
        <Link to="/tests" className="inline-flex h-11 items-center justify-center rounded-md bg-upchar-green px-6 text-sm font-black text-white transition hover:bg-upchar-greenDark">
          Book a Test Now
        </Link>
      </section>

      <QuickActions />
      <TrustStrip />
      {deleteTarget ? (
        <ConfirmDeleteModal
          title="Delete Booking"
          message={`Delete ${deleteTarget.bookingId}? This will mark the booking as cancelled and reflect in Admin.`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteBooking}
        />
      ) : null}
      {detailsBooking ? (
        <BookingDetailsModal booking={detailsBooking} loading={detailsLoading} onClose={() => setDetailsBooking(null)} />
      ) : null}
      <AccountToast message={toast} />
    </AccountLayout>
  );
}

export default AccountBookingsPage;
