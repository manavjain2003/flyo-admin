import BookingsList from "./BookingsList";

export default function ConfirmedBookings() {
  return (
    <BookingsList
      title="Confirmed Bookings"
      description="Bookings that have been confirmed."
      viewId="cnfbkg"
      lockedStatus="CN"
    />
  );
}