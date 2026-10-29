// Single source for Rafey's contact details: used by the home terminal (`contact`, `open ...`)

export const EMAIL = 'abdurrafeym@gmail.com'
export const LINKEDIN_URL = 'https://www.linkedin.com/in/arafeymasood/'
export const LINKEDIN_NAME = 'A. Rafey Masood'

export const DEFAULT_MAIL = Object.freeze({
  subject: 'Hi👋',
  body: "Hi Rafey, i'm ___ and I work in ___. Would love to chat!",
})

export const mailtoHref = ({ subject, body }) =>
  `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

/** What the home terminal's `contact` shows: HTML, so the usage's angle brackets are escaped */
export const contactHtml = `email: ${EMAIL}
linkedin: ${LINKEDIN_NAME}

Usage: open &lt;contact-option&gt; (e.g. open email)`
