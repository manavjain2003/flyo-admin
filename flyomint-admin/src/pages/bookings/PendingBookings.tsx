import BookingsList from "./BookingsList";

export default function PendingBookings() {
  return (
    <BookingsList
      title="Pending Bookings"
      description="Bookings that are currently pending."
      viewId="pndbkg"
      lockedStatus="PN"
    />
  );
}