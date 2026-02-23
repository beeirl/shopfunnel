// @ts-nocheck
import { Body, Button, Container, Head, Html, Img, Link, Preview } from 'jsx-email'
import { A, Fonts, Text, Title } from '../components'
import { body, button, buttonText, container, contentText, footerText, headingText, linkText, logo } from '../styles'

const APP_URL = 'https://shopfunnel.com/'

interface VerifyEmailProps {
  verifyUrl: string
  assetsUrl: string
}

export const templateName = 'VerifyEmail'

export const Template = ({
  verifyUrl = `${APP_URL}verify?token=example-token`,
  assetsUrl = `${APP_URL}email`,
}: VerifyEmailProps) => {
  const messagePlain = 'Verify your email address for Shopfunnel.'
  return (
    <Html lang="en">
      <Head>
        <Title>{`Shopfunnel — ${messagePlain}`}</Title>
      </Head>
      <Fonts assetsUrl={assetsUrl} />
      <Preview>{messagePlain}</Preview>
      <Body style={body}>
        <Container alignment="left" style={container}>
          <A href={APP_URL} style={logo}>
            <Img
              height="22"
              alt="Shopfunnel"
              src={`${assetsUrl}/shopfunnel-logo.png`}
              style={{ display: 'block', outline: 'none', border: 'none', textDecoration: 'none' }}
            />
          </A>

          <Text style={headingText}>Verify your Email</Text>

          <Text style={contentText}>
            Click the button below to verify your email address. If you didn't ask to verify this email address, you can
            ignore this email.
          </Text>

          <Button style={button} href={verifyUrl}>
            <Text style={buttonText}>{'Verify email \u2192'}</Text>
          </Button>

          <Text style={footerText}>Button not working? Copy the following link into your browser:</Text>
          <Link href={verifyUrl}>
            <Text style={{ ...footerText, ...linkText, marginTop: 0 }}>{verifyUrl}</Text>
          </Link>
        </Container>
      </Body>
    </Html>
  )
}

export default Template
