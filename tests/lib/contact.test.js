import { describe, it, expect } from 'vitest'
import { EMAIL, LINKEDIN_URL, LINKEDIN_NAME, DEFAULT_MAIL, mailtoHref } from '@/lib/contact.js'

describe('contact constants', () => {
  it('keeps the strings the home terminal used before extraction', () => {
    expect(EMAIL).toBe('abdurrafeym@gmail.com')
    expect(LINKEDIN_URL).toBe('https://www.linkedin.com/in/arafeymasood/')
    expect(LINKEDIN_NAME).toBe('A. Rafey Masood')
    expect(DEFAULT_MAIL).toEqual({
      subject: 'Hi👋',
      body: "Hi Rafey, i'm ___ and I work in ___. Would love to chat!",
    })
  })

  it('freezes the default mail so callers cannot mutate it', () => {
    expect(Object.isFrozen(DEFAULT_MAIL)).toBe(true)
  })
})

describe('mailtoHref', () => {
  it('percent-encodes an emoji subject, spaces and reserved characters', () => {
    // Arrange
    const mail = { subject: 'Hi👋', body: 'a b&c=d?' }

    // Act
    const href = mailtoHref(mail)

    // Assert
    expect(href).toBe('mailto:abdurrafeym@gmail.com?subject=Hi%F0%9F%91%8B&body=a%20b%26c%3Dd%3F')
  })

  it('round-trips the default mail, apostrophe included', () => {
    const href = mailtoHref(DEFAULT_MAIL)

    const params = new URL(href).searchParams

    expect(href.startsWith(`mailto:${EMAIL}?`)).toBe(true)
    expect(href).toContain("i'm")
    expect(params.get('subject')).toBe(DEFAULT_MAIL.subject)
    expect(params.get('body')).toBe(DEFAULT_MAIL.body)
  })
})
