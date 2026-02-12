import sgMail from '@sendgrid/mail'
import type { AppointmentRequest } from '@prisma/client'

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
} else {
  console.warn('SENDGRID_API_KEY is not set - emails will fail to send')
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@bla.gov.bb'
const COMPANY_NAME = process.env.COMPANY_NAME || 'Barbados Licensing Authority'

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface EmailOptions {
  to: string | string[]
  subject: string
  text: string
  html: string
  from?: string
}

export interface EmailContent {
  subject: string
  text: string
  html: string
}

// ============================================================================
// Core Email Sending Function
// ============================================================================

/**
 * Generic email sending function that can be used for any email type
 * @param options - Email options including recipient, subject, and content
 * @returns Promise that resolves when email is sent
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const msg = {
    to: options.to,
    from: options.from || FROM_EMAIL,
    subject: options.subject,
    text: options.text,
    html: options.html,
  }

  try {
    await sgMail.send(msg)
    const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to
    console.log(`Email sent to: ${recipients} - Subject: ${options.subject}`)
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

// ============================================================================
// Email Template Functions
// ============================================================================

/**
 * Creates email content for appointment confirmation
 */
export function createConfirmationEmailContent(
  request: AppointmentRequest & { 
    serviceBookings?: Array<{ serviceName: string; scheduledDate: Date; scheduledTime: string; location?: string | null }> 
  }
): EmailContent {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const cancellationUrl = request.cancellationToken 
    ? `${baseUrl}/cancel?token=${request.cancellationToken}`
    : `${baseUrl}/manage`
  
  // Format service bookings if available
  const servicesList = request.serviceBookings && request.serviceBookings.length > 0
    ? request.serviceBookings.map(b => {
        const locationText = b.location ? ` at ${b.location}` : ''
        return `${b.serviceName}${locationText} - ${new Date(b.scheduledDate).toLocaleDateString('en-US', { timeZone: 'UTC' })} at ${b.scheduledTime}`
      }).join('\n- ')
    : request.servicesRequested.join(', ')
  
  const servicesHtml = request.serviceBookings && request.serviceBookings.length > 0
    ? request.serviceBookings.map(b => {
        const locationText = b.location ? ` <span style="color: #6b7280;">at ${b.location}</span>` : ''
        return `<li><strong>${b.serviceName}</strong>${locationText} - ${new Date(b.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })} at ${b.scheduledTime}</li>`
      }).join('')
    : `<li>${request.servicesRequested.join(', ')}</li>`

  return {
    subject: `Appointment Confirmed - ${request.referenceNumber}`,
    text: `Dear ${request.customerName},

Your appointment has been confirmed!

Reference Number: ${request.referenceNumber}

Scheduled Services:
- ${servicesList}


NEED TO CANCEL?
If you need to cancel your appointment, click the link below:
${cancellationUrl}

Or visit ${baseUrl}/manage and enter your reference number and email.

Please arrive 10 minutes before your scheduled time.

Thank you,
${COMPANY_NAME}`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">✓ Appointment Confirmed</h1>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #374151;">Dear ${request.customerName},</p>
        <p style="font-size: 16px; color: #374151;">Your appointment has been confirmed!</p>
        
        <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0; font-size: 14px; color: #1e40af;"><strong>Reference Number:</strong></p>
          <p style="margin: 5px 0 0 0; font-size: 20px; color: #1e3a8a; font-family: monospace; font-weight: bold;">${request.referenceNumber}</p>
        </div>
        
        <h3 style="color: #1f2937; margin-top: 25px;">Scheduled Services:</h3>
        <ul style="background: #f9fafb; padding: 20px; border-radius: 5px; line-height: 1.8;">
          ${servicesHtml}
        </ul>
        
        <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; margin: 25px 0; border-radius: 5px;">
          <p style="margin: 0 0 10px 0; color: #92400e; font-weight: bold;">Need to cancel?</p>
          <a href="${cancellationUrl}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Cancel Appointment</a>
          <p style="margin: 10px 0 0 0; font-size: 13px; color: #92400e;">Or visit <a href="${baseUrl}/manage" style="color: #92400e;">our website</a> and enter your reference number.</p>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">Please arrive 10 minutes before your scheduled time.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #9ca3af; margin: 0;">Thank you,<br/><strong>${COMPANY_NAME}</strong></p>
      </div>
    </div>`
  }
}

/**
 * Creates email content for appointment approval
 */
export function createApprovalEmailContent(request: AppointmentRequest): EmailContent {
  return {
    subject: `Appointment Request Approved - ${request.referenceNumber}`,
    text: `Dear ${request.customerName},

Good news! Your appointment request has been approved.

Appointment Details:
- Reference Number: ${request.referenceNumber}
- Services: ${request.servicesRequested.join(', ')}
${request.preferredDate ? `- Date/Time: ${new Date(request.preferredDate).toLocaleDateString('en-US', { timeZone: 'UTC' })} at ${request.preferredTime}` : ''}

${request.staffNotes ? `\nStaff Notes:\n${request.staffNotes}\n` : ''}

Please arrive 10 minutes before your scheduled time.

If you need to cancel or reschedule, please contact us as soon as possible.

Thank you,
${COMPANY_NAME}`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #22c55e;">Appointment Request Approved</h2>
      <p>Dear ${request.customerName},</p>
      <p><strong>Good news!</strong> Your appointment request has been approved.</p>
      <h3>Appointment Details:</h3>
      <ul>
        <li><strong>Reference Number:</strong> ${request.referenceNumber}</li>
        <li><strong>Services:</strong> ${request.servicesRequested.join(', ')}</li>
        ${request.preferredDate ? `<li><strong>Date/Time:</strong> ${new Date(request.preferredDate).toLocaleDateString('en-US', { timeZone: 'UTC' })} at ${request.preferredTime}</li>` : ''}
      </ul>
      ${request.staffNotes ? `<div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;"><strong>Staff Notes:</strong><br/>${request.staffNotes}</div>` : ''}
      <p>Please arrive 10 minutes before your scheduled time.</p>
      <p>If you need to cancel or reschedule, please contact us as soon as possible.</p>
      <p>Thank you,<br/>${COMPANY_NAME}</p>
    </div>`
  }
}

/**
 * Creates email content for appointment denial
 */
export function createDenialEmailContent(request: AppointmentRequest): EmailContent {
  return {
    subject: `Appointment Request Update - ${request.referenceNumber}`,
    text: `Dear ${request.customerName},

We regret to inform you that we are unable to accommodate your appointment request at this time.

Request Details:
- Reference Number: ${request.referenceNumber}
${request.preferredDate ? `- Requested Date/Time: ${new Date(request.preferredDate).toLocaleDateString('en-US', { timeZone: 'UTC' })} at ${request.preferredTime}` : ''}

${request.staffNotes ? `\nReason:\n${request.staffNotes}\n` : ''}

Please feel free to submit a new request with alternative dates, or contact us directly to discuss available options.

Thank you for your understanding.

${COMPANY_NAME}`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Appointment Request Update</h2>
      <p>Dear ${request.customerName},</p>
      <p>We regret to inform you that we are unable to accommodate your appointment request at this time.</p>
      <h3>Request Details:</h3>
      <ul>
        <li><strong>Reference Number:</strong> ${request.referenceNumber}</li>
        ${request.preferredDate ? `<li><strong>Requested Date/Time:</strong> ${new Date(request.preferredDate).toLocaleDateString('en-US', { timeZone: 'UTC' })} at ${request.preferredTime}</li>` : ''}
      </ul>
      ${request.staffNotes ? `<div style="background: #fef2f2; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ef4444;"><strong>Reason:</strong><br/>${request.staffNotes}</div>` : ''}
      <p>Please feel free to submit a new request with alternative dates, or contact us directly to discuss available options.</p>
      <p>Thank you for your understanding.</p>
      <p>${COMPANY_NAME}</p>
    </div>`
  }
}

// ============================================================================
// Convenience Wrapper Functions (Backward Compatibility)
// ============================================================================

/**
 * Sends a confirmation email for a new appointment request
 * @param request - The appointment request object with optional serviceBookings
 */
export async function sendConfirmationEmail(
  request: AppointmentRequest & { 
    serviceBookings?: Array<{ serviceName: string; scheduledDate: Date; scheduledTime: string; location?: string | null }> 
  }
): Promise<void> {
  const content = createConfirmationEmailContent(request)
  await sendEmail({
    to: request.customerEmail,
    ...content
  })
}

/**
 * Sends an approval email for an approved appointment request
 * @param request - The appointment request object
 */
export async function sendApprovalEmail(request: AppointmentRequest): Promise<void> {
  const content = createApprovalEmailContent(request)
  await sendEmail({
    to: request.customerEmail,
    ...content
  })
}

/**
 * Sends a denial email for a denied appointment request
 * @param request - The appointment request object
 */
export async function sendDenialEmail(request: AppointmentRequest): Promise<void> {
  const content = createDenialEmailContent(request)
  await sendEmail({
    to: request.customerEmail,
    ...content
  })
}

/**
 * Creates email content for appointment cancellation
 */
export function createCancellationEmailContent(data: {
  customerName: string
  customerEmail: string
  referenceNumber: string
  serviceBookings: Array<{ serviceName: string; scheduledDate: Date; scheduledTime: string; location?: string | null }>
}): EmailContent {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  const servicesList = data.serviceBookings.map(b => {
    const locationText = b.location ? ` at ${b.location}` : ''
    return `${b.serviceName}${locationText} - ${new Date(b.scheduledDate).toLocaleDateString('en-US', { timeZone: 'UTC' })} at ${b.scheduledTime}`
  }).join('\n- ')
  
  const servicesHtml = data.serviceBookings.map(b => {
    const locationText = b.location ? ` <span style="color: #6b7280;">at ${b.location}</span>` : ''
    return `<li><strong>${b.serviceName}</strong>${locationText} - ${new Date(b.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })} at ${b.scheduledTime}</li>`
  }).join('')

  return {
    subject: `Appointment Cancelled - ${data.referenceNumber}`,
    text: `Dear ${data.customerName},

Your appointment has been cancelled as requested.

Reference Number: ${data.referenceNumber}

Cancelled Services:
- ${servicesList}

If you cancelled by mistake or would like to reschedule, please visit ${baseUrl} to book a new appointment.

We're sorry to see you go, but we hope to serve you again in the future.

Thank you,
${COMPANY_NAME}`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">Appointment Cancelled</h1>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #374151;">Dear ${data.customerName},</p>
        <p style="font-size: 16px; color: #374151;">Your appointment has been cancelled as requested.</p>
        
        <div style="background: #f3f4f6; border-left: 4px solid #6b7280; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0; font-size: 14px; color: #4b5563;"><strong>Reference Number:</strong></p>
          <p style="margin: 5px 0 0 0; font-size: 20px; color: #1f2937; font-family: monospace; font-weight: bold;">${data.referenceNumber}</p>
        </div>
        
        <h3 style="color: #1f2937; margin-top: 25px;">Cancelled Services:</h3>
        <ul style="background: #f9fafb; padding: 20px; border-radius: 5px; line-height: 1.8;">
          ${servicesHtml}
        </ul>
        
        <div style="background: #dbeafe; border: 1px solid #3b82f6; padding: 15px; margin: 25px 0; border-radius: 5px;">
          <p style="margin: 0 0 10px 0; color: #1e40af; font-weight: bold;">Need to reschedule?</p>
          <p style="margin: 0 0 15px 0; font-size: 14px; color: #1e40af;">We'd be happy to help you book a new appointment.</p>
          <a href="${baseUrl}/request" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Book New Appointment</a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">We're sorry to see you go, but we hope to serve you again in the future.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #9ca3af; margin: 0;">Thank you,<br/><strong>${COMPANY_NAME}</strong></p>
      </div>
    </div>`
  }
}

/**
 * Sends a cancellation confirmation email
 * @param data - Cancellation data including customer info and service bookings
 */
export async function sendCancellationEmail(data: {
  customerName: string
  customerEmail: string
  referenceNumber: string
  serviceBookings: Array<{ serviceName: string; scheduledDate: Date; scheduledTime: string; location?: string | null }>
}): Promise<void> {
  const content = createCancellationEmailContent(data)
  await sendEmail({
    to: data.customerEmail,
    ...content
  })
}

/**
 * Creates email content for new staff user welcome message
 */
export function createWelcomeEmailContent(data: {
  name: string
  email: string
  temporaryPassword: string
}): EmailContent {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const loginUrl = `${baseUrl}/login`
  
  return {
    subject: `Welcome to ${COMPANY_NAME} - Your Account Details`,
    text: `Dear ${data.name},

Welcome to ${COMPANY_NAME}!

Your staff account has been created. Below are your login credentials:

Login URL: ${loginUrl}
Email: ${data.email}
Temporary Password: ${data.temporaryPassword}

IMPORTANT: For security reasons, you will be required to change your password when you first log in.

Your new password must meet the following requirements:
- At least 6 characters
- One uppercase letter
- One number
- One special character (!@#$%^&*...)

If you have any questions or issues accessing your account, please contact your administrator.

Thank you,
${COMPANY_NAME}`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">Welcome to ${COMPANY_NAME}</h1>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #374151;">Dear ${data.name},</p>
        <p style="font-size: 16px; color: #374151;">Your staff account has been created. Below are your login credentials:</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; color: #6b7280;"><strong>Login URL:</strong></p>
          <p style="margin: 0 0 15px 0;"><a href="${loginUrl}" style="color: #3b82f6; text-decoration: none; font-weight: bold;">${loginUrl}</a></p>
          
          <p style="margin: 0 0 10px 0; color: #6b7280;"><strong>Email:</strong></p>
          <p style="margin: 0 0 15px 0; font-family: monospace; color: #1f2937;">${data.email}</p>
          
          <p style="margin: 0 0 10px 0; color: #6b7280;"><strong>Temporary Password:</strong></p>
          <p style="margin: 0; font-family: monospace; font-size: 18px; color: #1f2937; background: #ffffff; padding: 10px; border-radius: 3px; border: 1px solid #d1d5db;">${data.temporaryPassword}</p>
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; margin: 25px 0; border-radius: 5px;">
          <p style="margin: 0 0 10px 0; color: #92400e; font-weight: bold;">⚠️ IMPORTANT: Password Change Required</p>
          <p style="margin: 0; font-size: 14px; color: #92400e;">For security reasons, you will be required to change your password when you first log in.</p>
        </div>
        
        <div style="background: #dbeafe; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #3b82f6;">
          <p style="margin: 0 0 10px 0; color: #1e40af; font-weight: bold;">Your new password must meet these requirements:</p>
          <ul style="margin: 0; padding-left: 20px; color: #1e40af;">
            <li>At least 6 characters</li>
            <li>One uppercase letter</li>
            <li>One number</li>
            <li>One special character (!@#$%^&*...)</li>
          </ul>
        </div>
        
        <a href="${loginUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Log In Now</a>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 25px;">If you have any questions or issues accessing your account, please contact your administrator.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #9ca3af; margin: 0;">Thank you,<br/><strong>${COMPANY_NAME}</strong></p>
      </div>
    </div>`
  }
}

/**
 * Sends a welcome email to a newly created staff user with their login credentials
 * @param data - User data including name, email, and temporary password
 */
export async function sendWelcomeEmail(data: {
  name: string
  email: string
  temporaryPassword: string
}): Promise<void> {
  const content = createWelcomeEmailContent(data)

  await sendEmail({
    to: data.email,
    ...content
  })
}

/**
 * Creates email content for appointment rescheduling notification
 */
export function createReschedulingEmailContent(data: {
  customerName: string
  customerEmail: string
  referenceNumber: string
  serviceName: string
  oldDate: Date
  oldTime: string
  newDate: string
  newTime: string
  staffNotes?: string
  cancellationToken?: string
}): EmailContent {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const cancellationUrl = data.cancellationToken 
    ? `${baseUrl}/cancel?token=${data.cancellationToken}`
    : `${baseUrl}/manage`
  
  const oldDateFormatted = new Date(data.oldDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'UTC'
  })
  const newDateFormatted = (() => {
    const [year, month, day] = data.newDate.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    })
  })()

  const staffNotesText = data.staffNotes ? `\n\nStaff Notes:\n${data.staffNotes}` : ''
  const staffNotesHtml = data.staffNotes 
    ? `<div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <p style="margin: 0 0 10px 0; color: #1f2937; font-weight: bold;">Staff Notes:</p>
        <p style="margin: 0; color: #4b5563;">${data.staffNotes}</p>
      </div>`
    : ''

  return {
    subject: `Appointment Rescheduled - ${data.referenceNumber}`,
    text: `Dear ${data.customerName},

Your appointment has been rescheduled.

Reference Number: ${data.referenceNumber}
Service: ${data.serviceName}

PREVIOUS APPOINTMENT:
Date: ${oldDateFormatted}
Time: ${data.oldTime}

NEW APPOINTMENT:
Date: ${newDateFormatted}
Time: ${data.newTime}${staffNotesText}

NEED TO CANCEL?
If you need to cancel your appointment, click the link below:
${cancellationUrl}

Or visit ${baseUrl}/manage and enter your reference number and email.

Please arrive 10 minutes before your scheduled time.

Thank you,
${COMPANY_NAME}`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">📅 Appointment Rescheduled</h1>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #374151;">Dear ${data.customerName},</p>
        <p style="font-size: 16px; color: #374151;">Your appointment has been rescheduled.</p>
        
        <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0; font-size: 14px; color: #1e40af;"><strong>Reference Number:</strong></p>
          <p style="margin: 5px 0 0 0; font-size: 20px; color: #1e3a8a; font-family: monospace; font-weight: bold;">${data.referenceNumber}</p>
        </div>
        
        <div style="background: #fef2f2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 0 0 10px 0; color: #991b1b; font-weight: bold;">Previous Appointment:</p>
          <p style="margin: 0; color: #7f1d1d;"><strong>Service:</strong> ${data.serviceName}</p>
          <p style="margin: 5px 0 0 0; color: #7f1d1d;"><strong>Date:</strong> ${oldDateFormatted}</p>
          <p style="margin: 5px 0 0 0; color: #7f1d1d;"><strong>Time:</strong> ${data.oldTime}</p>
        </div>
        
        <div style="background: #d1fae5; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p style="margin: 0 0 10px 0; color: #065f46; font-weight: bold;">New Appointment:</p>
          <p style="margin: 0; color: #064e3b;"><strong>Service:</strong> ${data.serviceName}</p>
          <p style="margin: 5px 0 0 0; color: #064e3b;"><strong>Date:</strong> ${newDateFormatted}</p>
          <p style="margin: 5px 0 0 0; color: #064e3b;"><strong>Time:</strong> ${data.newTime}</p>
        </div>
        
        ${staffNotesHtml}
        
        <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; margin: 25px 0; border-radius: 5px;">
          <p style="margin: 0 0 10px 0; color: #92400e; font-weight: bold;">Need to cancel?</p>
          <a href="${cancellationUrl}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Cancel Appointment</a>
          <p style="margin: 10px 0 0 0; font-size: 13px; color: #92400e;">Or visit <a href="${baseUrl}/manage" style="color: #92400e;">our website</a> and enter your reference number.</p>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">Please arrive 10 minutes before your scheduled time.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #9ca3af; margin: 0;">Thank you,<br/><strong>${COMPANY_NAME}</strong></p>
      </div>
    </div>`
  }
}

/**
 * Sends a rescheduling notification email
 * @param data - Rescheduling data including customer info, old and new appointment details
 */
export async function sendReschedulingEmail(data: {
  customerName: string
  customerEmail: string
  referenceNumber: string
  serviceName: string
  oldDate: Date
  oldTime: string
  newDate: string
  newTime: string
  staffNotes?: string
  cancellationToken?: string
}): Promise<void> {
  const content = createReschedulingEmailContent(data)
  await sendEmail({
    to: data.customerEmail,
    ...content
  })
}

/**
 * Creates email content for staff-initiated cancellation (day block or no-show)
 */
export function createStaffCancellationEmailContent(data: {
  customerName: string
  referenceNumber: string
  publicNote: string
  serviceBookings: Array<{ serviceName: string; scheduledDate: Date; scheduledTime: string; location?: string | null }>
}): EmailContent {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const rebookUrl = `${baseUrl}/request`
  
  const servicesList = data.serviceBookings.map(b => {
    const locationText = b.location ? ` at ${b.location}` : ''
    return `${b.serviceName}${locationText} - ${new Date(b.scheduledDate).toLocaleDateString('en-US', { timeZone: 'UTC' })} at ${b.scheduledTime}`
  }).join('\n- ')
  
  const servicesHtml = data.serviceBookings.map(b => {
    const locationText = b.location ? ` <span style="color: #6b7280;">at ${b.location}</span>` : ''
    return `<li><strong>${b.serviceName}</strong>${locationText} - ${new Date(b.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })} at ${b.scheduledTime}</li>`
  }).join('')

  return {
    subject: `Appointment Cancellation - ${data.referenceNumber}`,
    text: `Dear ${data.customerName},

We sincerely apologize, but we must cancel your scheduled appointment due to unforeseen circumstances.

Reference Number: ${data.referenceNumber}

Cancelled Services:
- ${servicesList}

REASON FOR CANCELLATION:
${data.publicNote}

We deeply regret any inconvenience this may cause. We would be grateful for the opportunity to serve you at another time.

RESCHEDULE YOUR APPOINTMENT:
Please visit ${rebookUrl} to book a new appointment at your convenience.

We appreciate your understanding and look forward to serving you soon.

Sincerely,
${COMPANY_NAME}`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">Appointment Cancellation</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">We apologize for the inconvenience</p>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #374151;">Dear ${data.customerName},</p>
        <p style="font-size: 16px; color: #374151;">We sincerely apologize, but we must cancel your scheduled appointment due to unforeseen circumstances.</p>
        
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0; font-size: 14px; color: #991b1b;"><strong>Reference Number:</strong></p>
          <p style="margin: 5px 0 0 0; font-size: 20px; color: #7f1d1d; font-family: monospace; font-weight: bold;">${data.referenceNumber}</p>
        </div>
        
        <h3 style="color: #1f2937; margin-top: 25px;">Cancelled Services:</h3>
        <ul style="background: #f9fafb; padding: 20px; border-radius: 5px; line-height: 1.8;">
          ${servicesHtml}
        </ul>
        
        <div style="background: #fff7ed; border: 2px solid #fb923c; padding: 20px; margin: 25px 0; border-radius: 8px;">
          <p style="margin: 0 0 10px 0; color: #9a3412; font-weight: bold; font-size: 16px;">Reason for Cancellation:</p>
          <p style="margin: 0; color: #9a3412; font-size: 15px; line-height: 1.6;">${data.publicNote}</p>
        </div>
        
        <p style="font-size: 15px; color: #4b5563; margin: 25px 0;">We deeply regret any inconvenience this may cause. We would be grateful for the opportunity to serve you at another time.</p>
        
        <div style="background: #dbeafe; border: 2px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 15px 0; color: #1e40af; font-weight: bold; font-size: 16px;">Reschedule Your Appointment</p>
          <a href="${rebookUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">Book New Appointment</a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 25px; text-align: center; font-style: italic;">We appreciate your understanding and look forward to serving you soon.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #9ca3af; margin: 0; text-align: center;">Sincerely,<br/><strong>${COMPANY_NAME}</strong></p>
      </div>
    </div>`
  }
}

/**
 * Sends a staff-initiated cancellation email
 * @param data - Cancellation data including customer info, reason, and service bookings
 */
export async function sendStaffCancellationEmail(data: {
  customerName: string
  customerEmail: string
  referenceNumber: string
  publicNote: string
  serviceBookings: Array<{ serviceName: string; scheduledDate: Date; scheduledTime: string; location?: string | null }>
}): Promise<void> {
  const content = createStaffCancellationEmailContent(data)
  await sendEmail({
    to: data.customerEmail,
    ...content
  })
}





