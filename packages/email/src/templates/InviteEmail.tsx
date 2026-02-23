// @ts-nocheck
import { Body, Button, Container, Head, Html, Img, Link, Preview } from 'jsx-email'
import { A, Fonts, Span, Text, Title } from '../components'
import {
  body,
  button,
  buttonText,
  container,
  contentHighlightText,
  contentText,
  footerText,
  headingText,
  linkText,
  logo,
} from '../styles'

const APP_URL = 'https://shopfunnel.com/'

interface InviteEmailProps {
  inviter: string
  workspaceId: string
  workspaceName: string
  assetsUrl: string
}

export const templateName = 'InviteEmail'

export const Template = ({
  inviter = 'test@shopfunnel.com',
  workspaceId = 'wrk_01K6XFY7V53T8XN0A7X8G9BTN3',
  workspaceName = 'acme',
  assetsUrl = `${APP_URL}email`,
}: InviteEmailProps) => {
  const messagePlain = `${inviter} invited you to join the ${workspaceName} workspace.`
  const url = `${APP_URL}workspace/${workspaceId}`
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

          <Text style={headingText}>Join your team's Shopfunnel workspace</Text>

          <Text style={contentText}>
            You have been invited by <Span style={contentHighlightText}>{inviter}</Span> to join the{' '}
            <Span style={contentHighlightText}>{workspaceName}</Span> workspace on Shopfunnel.
          </Text>

          <Button style={button} href={url}>
            <Text style={buttonText}>{'Join workspace \u2192'}</Text>
          </Button>

          <Text style={footerText}>Button not working? Copy the following link into your browser:</Text>
          <Link href={url}>
            <Text style={{ ...footerText, ...linkText, marginTop: 0 }}>{url}</Text>
          </Link>
        </Container>
      </Body>
    </Html>
  )
}

export default Template
