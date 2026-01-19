# Appointment Cancellation System

## Overview

A hybrid cancellation system has been implemented allowing public users to cancel appointments without requiring an account. Users can cancel via:

1. **Magic Link** - One-click link included in confirmation email
2. **Lookup Page** - Enter reference number + email as fallback

Cancellations use soft delete (status = 'cancelled') with a separate `CancellationLog` audit table for complete audit trail.

---

## What Was Implemented

### 1. Database Changes

#### New Fields in `AppointmentRequest`
- `cancellationToken` (String?, unique) - Secure token for magic link cancellation
- `cancellation` (CancellationLog?) - Relation to audit log

#### New Table: `CancellationLog`
Complete audit trail storing:
- Snapshot of appointment data (customer info, services, scheduled dates)
- Optional reason for cancellation
- Cancellation method (magic_link or lookup_page)
- IP address
- Timestamp

### 2. Token Generation
- **File**: `lib/cancellation-token.ts`
- Generates 64-character hex strings (256 bits of entropy)
- Uses `crypto.randomBytes(32)` for security

### 3. API Routes

#### GET `/api/appointments/[token]`
- Fetches appointment by cancellation token
- Returns appointment details if valid
- Checks if already cancelled

#### POST `/api/appointments/lookup`
- Lookup by reference number + email (both must match)
- Case-insensitive email matching
- Returns appointment details if found

#### POST `/api/appointments/cancel`
- Executes cancellation in transaction:
  - Updates appointment status to 'cancelled'
  - Creates CancellationLog with snapshot
  - Tracks cancellation method and IP
- Sends cancellation confirmation email

### 4. Public Pages

#### `/cancel` Page
- Magic link landing page
- Displays appointment details from token
- Optional reason field
- Confirmation UI with warning

#### `/manage` Page
- Lookup form (reference + email)
- Shows appointment if match found
- Same cancellation UI as magic link flow

### 5. Email Updates

#### Confirmation Email
- Now includes prominent "Cancel Appointment" button/link
- Magic link uses cancellation token
- Fallback mentions /manage page
- Beautiful HTML template with proper styling

#### New: Cancellation Confirmation Email
- Confirms cancellation to customer
- Lists cancelled services
- Provides link to book new appointment
- Professional, empathetic tone

### 6. Updated Confirmation Page
- Added link to `/manage` page for appointment management
- Mentions cancellation link in email
- User-friendly messaging

---

## Environment Variables Required

Add to your `.env` file:

```env
# Application URL (for email links)
# In production, set this to your actual domain
# In development, use http://localhost:3000
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

---

## User Flows

### Flow 1: Magic Link (Primary)
1. User books appointment
2. Receives confirmation email with cancellation link
3. Clicks link → lands on `/cancel?token=xxx`
4. Sees appointment details
5. (Optional) Enters reason
6. Confirms cancellation
7. Receives cancellation confirmation email

### Flow 2: Lookup (Fallback)
1. User visits `/manage`
2. Enters reference number + email
3. System validates both match
4. Shows appointment details
5. (Optional) Enters reason
6. Confirms cancellation
7. Receives cancellation confirmation email

---

## Security Features

- **256-bit entropy tokens** - Unguessable cancellation links
- **Dual verification** - Lookup requires both reference AND email
- **IP tracking** - Audit trail includes IP address
- **Soft delete** - Preserves data for audit
- **Complete snapshot** - Original appointment data saved before cancellation
- **Case-insensitive email** - Better UX without compromising security

---

## Files Created/Modified

### Created
- `lib/cancellation-token.ts` - Token generator
- `app/api/appointments/[token]/route.ts` - Fetch by token
- `app/api/appointments/lookup/route.ts` - Lookup endpoint
- `app/api/appointments/cancel/route.ts` - Cancellation endpoint
- `app/(public)/cancel/page.tsx` - Magic link page
- `app/(public)/manage/page.tsx` - Lookup page

### Modified
- `prisma/schema.prisma` - Added CancellationLog model, cancellationToken field
- `app/api/requests/route.ts` - Generate and store cancellation token
- `lib/server/email.ts` - Updated confirmation email, added cancellation email
- `app/(public)/confirmation/page.tsx` - Added link to /manage

---

## Testing Checklist

### Database
- [x] Schema updated with cancellationToken and CancellationLog
- [x] Migration applied successfully

### Booking Flow
- [ ] New bookings generate cancellation token
- [ ] Confirmation email includes cancel link
- [ ] Magic link in email is clickable

### Magic Link Cancellation
- [ ] Click link in email → loads appointment details
- [ ] Can enter optional reason
- [ ] Cancellation succeeds
- [ ] Receives cancellation email
- [ ] Appointment status = 'cancelled'
- [ ] CancellationLog created with snapshot
- [ ] CancellationLog.cancelledVia = 'magic_link'

### Lookup Cancellation
- [ ] Visit /manage page
- [ ] Enter reference + email → finds appointment
- [ ] Wrong email → shows error
- [ ] Can enter optional reason
- [ ] Cancellation succeeds
- [ ] Receives cancellation email
- [ ] CancellationLog.cancelledVia = 'lookup_page'

### Edge Cases
- [ ] Already cancelled appointment → shows error
- [ ] Invalid token → shows error
- [ ] Expired/non-existent reference → shows error
- [ ] Email mismatch → shows error

### Email Verification
- [ ] Confirmation email has proper styling
- [ ] Cancel button is prominent
- [ ] Cancellation email received
- [ ] All links work properly
- [ ] Links use correct base URL

---

## Future Enhancements

Potential improvements for consideration:

1. **Rate Limiting** - Add rate limiting to lookup endpoint to prevent enumeration
2. **Cancellation Deadlines** - Prevent cancellation within X hours of appointment
3. **Rescheduling** - Allow users to reschedule instead of just cancel
4. **Cancellation Analytics** - Dashboard showing cancellation reasons and trends
5. **Admin Notifications** - Alert staff when appointments are cancelled
6. **Automated Waitlist** - Offer cancelled slots to waitlisted customers
7. **Two-step Confirmation** - Require email confirmation for cancellations
8. **Cancellation Policy** - Display policy before cancellation

---

## Support

For questions or issues with the cancellation system, refer to:
- API documentation in route files
- Email templates in `lib/server/email.ts`
- Schema definitions in `prisma/schema.prisma`
