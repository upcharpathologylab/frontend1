import { useEffect, useState } from "react";
import BookedItemsTable from "../components/booking/BookedItemsTable.jsx";
import BookingBenefitStrip from "../components/booking/BookingBenefitStrip.jsx";
import BookingDetails from "../components/booking/BookingDetails.jsx";
import BookingHelpRefer from "../components/booking/BookingHelpRefer.jsx";
import BookingSuccessHeader from "../components/booking/BookingSuccessHeader.jsx";
import BookingSummary from "../components/booking/BookingSummary.jsx";
import CartTrustStrip from "../components/cart/CartTrustStrip.jsx";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";
import WhatsNextTimeline from "../components/booking/WhatsNextTimeline.jsx";
import { confirmationBenefits } from "../data/paymentData.js";
import { fallbackHomeData } from "../data/homeData.js";
import { trustStripItems } from "../data/cartData.js";
import { getBookingLead } from "../api/api.js";
import { getStoredBookingData } from "../utils/checkout.js";

const pdfText = (value) =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n]+/g, " ");

const invoiceAmount = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const invoiceLines = (booking) => {
  const lines = [
    "Upchar Pathology Lab",
    "Invoice / Receipt",
    "",
    `Booking ID: ${booking.bookingId || "-"}`,
    `Booking Date: ${booking.bookingDate || booking.createdAt || "-"}`,
    `Customer Name: ${booking.customer?.name || booking.fullName || "-"}`,
    `Phone: ${booking.customer?.phone || booking.mobile || "-"}`,
    `Email: ${booking.customer?.email || booking.email || "-"}`,
    `Payment Mode: ${booking.paymentMode || booking.paymentMethod || "-"}`,
    `Payment Status: ${booking.paymentStatus || "-"}`,
    "",
    "Test / Package Details"
  ];

  (booking.items || []).forEach((item, index) => {
    const quantity = Number(item.quantity || 1);
    const amount = Number(item.price || item.discountedPrice || item.finalPrice || 0) * quantity;
    lines.push(`${index + 1}. ${item.name || item.title || "Test / Package"} | Qty: ${quantity} | Amount: ${invoiceAmount(amount)}`);
  });

  lines.push(
    "",
    `Total Paid: ${invoiceAmount(booking.summary?.totalPayable || 0)}`,
    "",
    "Contact Details",
    "Phone: 8882753539",
    "Email: upcharpathologylab@gmail.com"
  );

  return lines;
};

const createInvoicePdfBlob = (booking) => {
  const lines = invoiceLines(booking);
  const content = [
    "BT",
    "/F1 18 Tf",
    "50 790 Td",
    "(Upchar Pathology Lab) Tj",
    "/F1 11 Tf",
    "0 -24 Td",
    ...lines.slice(1).map((line) => `(${pdfText(line)}) Tj 0 -16 Td`),
    "ET"
  ].join("\n");
  const contentLength = new TextEncoder().encode(content).length;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${contentLength} >>\nstream\n${content}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
};

function BookingConfirmationPage() {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    document.title = "Booking Confirmed | Upchar Pathology";

    async function loadBooking() {
      const storedBooking = getStoredBookingData();
      if (!storedBooking?.bookingId) {
        setError("Booking not found.");
        setLoading(false);
        return;
      }

      try {
        const data = await getBookingLead(storedBooking.bookingId);
        if (active) setBooking(data);
      } catch {
        if (active) setError("Booking not found.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBooking();
    return () => {
      active = false;
    };
  }, []);

  const handleDownloadInvoice = () => {
    if (!booking) return;
    const url = URL.createObjectURL(createInvoicePdfBlob(booking));
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${booking.bookingId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-blue-50/70 via-white to-white">
      <Header data={fallbackHomeData} />
      <main className="pt-[68px] md:pt-[104px] lg:pt-[108px]">
        {loading ? (
          <section className="container-page py-16 text-center">
            <p className="text-lg font-black text-navy-800">Loading booking details...</p>
          </section>
        ) : error ? (
          <section className="container-page py-16 text-center">
            <div className="rounded-lg border border-red-100 bg-white p-8 shadow-sm">
              <h1 className="text-3xl font-black text-navy-900">Booking not found</h1>
              <p className="mt-3 text-sm font-semibold text-navy-700">{error}</p>
            </div>
          </section>
        ) : booking ? (
          <section className="container-page py-8 lg:py-10">
            <BookingSuccessHeader booking={booking} />

            <div className="mt-8">
              <BookingBenefitStrip items={confirmationBenefits} />
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_420px]">
              <div className="grid gap-6">
                <BookedItemsTable
                  items={booking.items}
                  summary={booking.summary}
                  title={`Booked Items (${booking.summary.itemCount})`}
                />
                <BookingDetails booking={booking} />
              </div>
              <aside className="grid gap-6 self-start xl:sticky xl:top-32">
                <BookingSummary booking={booking} onDownloadInvoice={handleDownloadInvoice} />
                <WhatsNextTimeline />
              </aside>
            </div>

            <BookingHelpRefer />
            <div className="mt-8 rounded-lg border border-blue-100 bg-white p-3 shadow-sm">
              <CartTrustStrip items={trustStripItems} />
            </div>
          </section>
        ) : null}
      </main>
      <Footer data={fallbackHomeData} />
    </div>
  );
}

export default BookingConfirmationPage;
