export interface ApiEnvelope<T> {
  ServiceResponse: T;
  ServiceStatus: string;
}

export interface GetLoginOtpRequest {
  Mobile: string;
}

export interface GetLoginOtpResponse {
  OTP: string; 
  UserKey: string; 
  ErrorCode: string | null;
  Message: string | null;
}

export interface LoginRequest {
  Mobile: string;
  UserKey: string;
  OTP: string; 
}

export interface LoginResponse {
  UniqueKey: string; 
  Validity: string; 
  ErrorCode: string | null;
  Message: string | null;
}

export interface ProfileView {
  ViewName: string;
  ViewId: string;
  Permission: string[];
}

export interface ProfileResponse {
  Title: string;
  Name: string;
  Email: string;
  Phone: string;
  Views: ProfileView[];
  RoleName: string;
  ErrorCode: string | null;
  Message: string | null;
}

export interface RoleDetail {
  RoleId: number;
  RoleName: string;
  IsActive?: boolean;
}

export interface RoleGetResponse {
  RoleDetails: RoleDetail[];
  ErrorCode: string | null;
  Message: string | null;
}

export interface RoleAddRequest {
  RoleName: string;
}

export interface RoleUpdateRequest {
  RoleId: number;
  RoleName: string;
  IsActive: boolean;
}

export interface SimpleMessageResponse {
  ErrorCode: string | null;
  Message: string | null;
}

export interface UserDetail {
  UserId: number;
  Title: string;
  Name: string;
  Email: string;
  Phone: string;
  RoleName: string;
  RoleId: string;
  IsActive: boolean;
}

export interface UserGetResponse {
  UserDetails: UserDetail[];
  ErrorCode: string | null;
  Message: string | null;
}

export interface UserAddRequest {
  Title: string;
  Name: string;
  Email: string;
  Phone: string;
  RoleId: number;
  IsActive: boolean;
}

export interface ViewDetail {
  Id: number;
  ViewName: string;
  Permission: string[];
}

export interface ViewsGetResponse {
  Views: ViewDetail[];
  ErrorCode: string | null;
  Message: string | null;
}

export interface ViewsUpdatePermissionRequest {
  RoleId: string;
  Views: {
    Id: number;
    ViewName: string;
    Permission: string[];
  }[];
}

export interface UserUpdateRequest {
  UserId: number;
  RoleId: number;
  IsActive: boolean;
}

export interface ErrorPostRequest {
  Path: string;
  ErrorMessage: string;
}

export interface BookingHistoryRequest {
  PageNumber: number;
  PageSize: number;
  StartDate: string;
  EndDate: string;
  CurrentStatus: string; 
  PaymentStatus: string; 
}

export interface BookingSummary {
  Id: string;
  Reference: string;
  Status: string; 
  PaymentStatus?: string;
  TripType: string; 
  Source: string;
  Destination: string;
  Provider: string;
  Amount: number;
  PNR: string;
  BookedAt: string; 
}

export interface BookingHistoryResponse {
  Bookings: BookingSummary[];
  TotalCount: number;
  ErrorCode: string | null;
  Message: string | null;
}

export type SearchType = "BID" | "MON" | "EID" | "UID" | "PNR";

export interface SearchTransactionRequest {
  SearchType: SearchType;
  SearchValue: string;
}

export interface FlightSegment {
  AirlineCode: string;
  AirlineName: string;
  FlightNumber: string;
  Cabin: string;
  Source: string;
  SourceAirport: string;
  SourceTime: string;
  Destination: string;
  DestinationAirport: string;
  DestinationTime: string;
}

export interface PassengerDetail {
  SNo: number;
  PassengerName: string;
  AirlinePNR: string;
  GDSPNR: string;
  TicketNo: string;
  Fare: number;
  Status: string;
}

export interface BaggageDetail {
  Type: string;
  Sector: string;
  CheckInBaggage: string;
  CabinBaggage: string;
}

export interface FareRulesDetail {
  Refundability: string;
  FareCategory: string;
  DateChangePolicy: string;
  CancellationBeforeDeparture: string;
  RescheduleDateChange: string;
}

export interface BookingDetail {
  BookingId: string;
  BookedAt: string;
  BookingStatus: string;
  Provider: string;
  Airline: string;
  AirlinePNR: string;
  ProviderRef: string;
  TicketNumber: string;
  TicketIssued: boolean;
  CouponCode?: string;
  CashbackAmount?: string;
  EarnStatus?: string;
  AwaitingFreeCancellation?: string;
  InsuranceProvider?: string;
  SpecialInventory?: string;
  PublishedFareIdentifier?: string;
  TripType: string;
  International: boolean;
  Refunded: boolean;
  LastUpdated: string;
  OrderId: string;
  FareType: string;
  RefundBlockStatus: string;
  PartnerName: string;
  ProviderRefNo: string;
  TraceId?: string;
  Segments: FlightSegment[];
  Passengers: PassengerDetail[];
  TotalFare: number;
  Baggage: BaggageDetail[];
  FareRules: FareRulesDetail;
  ErrorCode: string | null;
  Message: string | null;
}


export interface TransactionLeg {
  TransactionId: number;
  BookingId: string;
  Sector: string;
  OnwardDate: string;
  BookingDate: string;
  GDSPNR: string;
  AirlinePNR: string;
  PaymentStatus: string;
  BookingStatus: string;
  CurrentStatus: string;
}

export interface TransactionContactInfo {
  UserKey: string;
  Name: string;
  Email: string;
  Mobile: string;
  LoginStatus: boolean;
}

export interface SearchTransactionResponse {
  Transactions: TransactionLeg[];
  BookingInfo: SearchTransactionBookingInfo | null;
  ContactInfo: TransactionContactInfo | null;
  BillingInfo: SearchTransactionBillingInfo | null;
  PaymentInfo: SearchTransactionPaymentInfo | null;
  ErrorCode: string | null;
  Message: string | null;
}

export interface GroupedBooking {
  BookingId: string;
  BookingDate: string;
  Legs: TransactionLeg[];
}

// Add these interfaces to types.ts

export interface BookingInfoPassenger {
  PassengerId: number;
  FirstName: string;
  LastName: string;
  TicketNumber: string | null;
  Title: string;
  DOB: string;
  Nationality: string;
  PassportNo: string;
  PaxType: string;
  BarCode: string | null;
}

export interface BookingInfoFlightDetail {
  SID: number;
  FlightNumber: string;
  AirlineCode: string;
  AirlineName: string;
  DepartureAirportCode: string;
  DepartureAirportName: string;
  ArrivalAirportCode: string;
  ArrivalAirportName: string;
  DepartureDateTime: string;
  ArrivalDateTime: string;
  Duration: string;
  CabinClass: string;
  BookingClass: string;
}

export interface BookingInfoFareDetails {
  AdultBaseFare: number;
  AdultTax: number;
  AdultTotalFare: number;
  ChildBaseFare: number;
  ChildTax: number;
  ChildTotalFare: number;
  InfantBaseFare: number;
  InfantTax: number;
  InfantTotalFare: number;
}

export interface BookingInfoJourney {
  Source: string;
  Destination: string;
  DepartureDate: string;
  FlightDetails: BookingInfoFlightDetail[];
  FareDetails: BookingInfoFareDetails;
  PassengerDetails: BookingInfoPassenger[];
  GDSPNR: string;
  AirlinePNR: string;
  BookingStatus: string;
  CurrentStatus: string;
  ProviderCode: string;
  ProviderRefId: string;
  SSRDetails: unknown | null;
}

export interface SearchTransactionBookingInfo {
  BookingId: string;
  InvoiceNumber: string;
  NumberOfAdult: number;
  NumberOfChild: number;
  NumberOfInfant: number;
  OnwardJourneyDetail: BookingInfoJourney | null;
  ReturnJourneyDetail: BookingInfoJourney | null;
  TotalFare: number;
  SearchType: string;
  PaymentStatus: string;
}

export interface SearchTransactionBillingInfo {
  TotalItineraryFare: number;
  TotalSSRAmount: number;
  ConvenienceFee: number;
  TotalAmountPaid: number;
  InstantDiscount: number;
}

export interface SearchTransactionPaymentInfo {
  PaymentMode: string;
  PaymentStatus: string;
  PaymentGatewayRefId: string;
  PaymentGatewayName: string;
  PaymentDateTime: string;
  AmountPaid: number;
}

