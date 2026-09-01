import { Text } from "react-email";

import type { NewDeviceProps } from "../types";
import { EmailLayout } from "./_layout";
import { Callout, Cta, Eyebrow, Lede, Panel, Title } from "./_parts";
import { palette } from "./theme";

/**
 * Sent the first time an account is signed into from a given browser + OS. A
 * calm heads-up, not an alarm — there is no password to change; the action, if
 * it wasn't them, is to sign out other devices from the account page.
 */
export default function NewDevice(props: NewDeviceProps) {
  const { brand, customerName } = props;
  return (
    <EmailLayout
      brand={brand}
      preview={`New sign-in to your ${brand.siteName} account`}
    >
      <Eyebrow>Security</Eyebrow>
      <Title>A new sign-in, {customerName}.</Title>
      <Lede>
        Your {brand.siteName} account was just signed into from a device we
        haven&rsquo;t seen before. If this was you, there&rsquo;s nothing to do.
      </Lede>

      <Panel heading="Sign-in details" tone="fill">
        <span style={{ color: palette.ink }}>{props.deviceLabel}</span>
        <br />
        {props.when} (IST)
        {props.ip ? (
          <>
            <br />
            IP address {props.ip}
          </>
        ) : null}
      </Panel>

      <Callout>
        Didn&rsquo;t sign in? Your account has no password to steal — open your
        account and use <strong>Sign out of all devices</strong>, then request a
        fresh code. Keep your phone number secure, since sign-in codes go there.
      </Callout>

      <Cta href={brand.accountUrl}>Review your account</Cta>

      <Text
        style={{
          margin: "14px 0 0",
          fontSize: "11px",
          lineHeight: "1.6",
          color: palette.muted,
          textAlign: "center",
        }}
      >
        You receive this only for sign-ins from a new device.
      </Text>
    </EmailLayout>
  );
}

NewDevice.PreviewProps = {
  brand: {
    siteName: "THE RARESKIN",
    legalName: "Velocity Ventures Group",
    supportEmail: "therareskinsupport@velocityventuresgroup.in",
    supportAddress:
      "Shop No. 04, Jija Mata Bachat Bhavan, Near S.T. Stand, Roha, Dist. Raigad – 402109",
    siteUrl: "https://therareskin.com",
    logoUrl: "https://therareskin.com/email/logo",
    accountUrl: "https://therareskin.com/account",
    orderUrl: "https://therareskin.com/account",
    invoiceUrl: "https://therareskin.com/account",
  },
  customerName: "Aditi",
  deviceLabel: "Chrome on Windows",
  ip: "203.0.113.42",
  when: "2 Sep 2026, 9:14 am",
} satisfies NewDeviceProps;
