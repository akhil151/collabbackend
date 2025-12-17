// Email notification service
// In production, integrate with SendGrid, AWS SES, or similar

const sendEmail = async ({ to, subject, text, html }) => {
  // For now, just log emails (replace with actual email service in production)
  console.log('📧 Email Notification:')
  console.log(`To: ${to}`)
  console.log(`Subject: ${subject}`)
  console.log(`Body: ${text}`)
  
  // TODO: Integrate actual email service
  // Example with SendGrid:
  // const sgMail = require('@sendgrid/mail')
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  // await sgMail.send({ to, from: 'noreply@collabboard.com', subject, text, html })
  
  return { success: true, message: 'Email logged (not sent in development)' }
}

export const sendInvitationEmail = async ({ recipientEmail, senderName, boardName, invitationLink }) => {
  const subject = `You've been invited to join "${boardName}"`
  const text = `${senderName} has invited you to collaborate on the board "${boardName}". Log in to accept or reject this invitation.`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Board Invitation</h2>
      <p><strong>${senderName}</strong> has invited you to join the board <strong>"${boardName}"</strong>.</p>
      <p>Log in to CollabBoard to accept or reject this invitation.</p>
      ${invitationLink ? `<p><a href="${invitationLink}" style="background: #8b5cf6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Invitation</a></p>` : ''}
    </div>
  `
  return await sendEmail({ to: recipientEmail, subject, text, html })
}

export const sendJoinRequestEmail = async ({ recipientEmail, requesterName, boardName }) => {
  const subject = `Join request for "${boardName}"`
  const text = `${requesterName} has requested to join your board "${boardName}". Log in to approve or reject this request.`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Join Request</h2>
      <p><strong>${requesterName}</strong> wants to join your board <strong>"${boardName}"</strong>.</p>
      <p>Log in to CollabBoard to review and respond to this request.</p>
    </div>
  `
  return await sendEmail({ to: recipientEmail, subject, text, html })
}

export const sendRequestAcceptedEmail = async ({ recipientEmail, boardName, acceptedBy }) => {
  const subject = `Your request to join "${boardName}" was accepted`
  const text = `Great news! ${acceptedBy} has accepted your request to join "${boardName}".`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Request Accepted ✅</h2>
      <p>Great news! <strong>${acceptedBy}</strong> has accepted your request to join <strong>"${boardName}"</strong>.</p>
      <p>You can now access the board and start collaborating.</p>
    </div>
  `
  return await sendEmail({ to: recipientEmail, subject, text, html })
}

export const sendRequestRejectedEmail = async ({ recipientEmail, boardName, rejectedBy, reason }) => {
  const subject = `Your request to join "${boardName}" was declined`
  const text = `${rejectedBy} has declined your request to join "${boardName}".${reason ? ` Reason: ${reason}` : ''}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Request Declined</h2>
      <p><strong>${rejectedBy}</strong> has declined your request to join <strong>"${boardName}"</strong>.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
    </div>
  `
  return await sendEmail({ to: recipientEmail, subject, text, html })
}

export const sendRemovalEmail = async ({ recipientEmail, boardName, removedBy, reason }) => {
  const subject = `You've been removed from "${boardName}"`
  const text = `${removedBy} has removed you from "${boardName}".${reason ? ` Reason: ${reason}` : ''}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Board Access Removed</h2>
      <p><strong>${removedBy}</strong> has removed you from the board <strong>"${boardName}"</strong>.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
    </div>
  `
  return await sendEmail({ to: recipientEmail, subject, text, html })
}

export const sendCollaborationRequestEmail = async ({ recipientEmail, requesterName, boardName }) => {
  const subject = `Admin collaboration request for "${boardName}"`
  const text = `Admin ${requesterName} wants to collaborate on your board "${boardName}".`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Collaboration Request</h2>
      <p>Admin <strong>${requesterName}</strong> wants to collaborate on your board <strong>"${boardName}"</strong>.</p>
      <p>Log in to review and respond to this request.</p>
    </div>
  `
  return await sendEmail({ to: recipientEmail, subject, text, html })
}
