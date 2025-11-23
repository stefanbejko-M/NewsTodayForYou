export const metadata = {
  title: 'Ad Choices — NewsTodayForYou',
  description: 'Learn about advertising practices and your choices regarding personalized ads.'
}

export default function AdsPage() {
  return (
    <div className="container" style={{ padding: '24px 0', maxWidth: '800px' }}>
      <h1>Ad Choices</h1>
      <p>
        NewsTodayForYou plans to use third-party advertising networks, including Google AdSense, to fund our service and provide free content for our users.
      </p>
      <p>
        These advertising networks may use cookies and similar technologies to personalize ads based on your interests. Ads may be displayed based on your browsing history, location, and other factors.
      </p>
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Managing Ad Preferences</h2>
      <p>
        You can manage your advertising preferences in several ways:
      </p>
      <ul style={{ lineHeight: '1.8' }}>
        <li><strong>Through your browser</strong> – adjust cookie and advertising settings</li>
        <li><strong>Through Google Ad Settings</strong> – visit <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">Google Ad Settings</a> to manage personalized ads</li>
        <li><strong>Through device settings</strong> – mobile devices often have options to limit advertising</li>
      </ul>
      <p>
        For more details about how we process your data, please see our <a href="/privacy">Privacy Policy</a> and <a href="/cookies">Cookie Policy</a>.
      </p>
    </div>
  )
}


