import nodemailer from "nodemailer"

type SendEmailInput = {
  to: string
  subject: string
  text: string
  html?: string
}

type SendEmailResult = {
  status: "SENT" | "SKIPPED" | "FAILED"
  errorMessage?: string
}

function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
  )
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!smtpConfigured()) {
    console.log("[email:dev]", {
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    })
    return { status: "SKIPPED" }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    })

    return { status: "SENT" }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[email:error]", message)
    return { status: "FAILED", errorMessage: message }
  }
}