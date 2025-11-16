export const metadata = {
  title: 'Ad Choices — NewsTodayForYou',
  description: 'Learn about advertising practices and your choices regarding personalized ads.'
}

export default function AdsPage() {
  return (
    <div className="container" style={{ padding: '24px 0', maxWidth: '800px' }}>
      <h1>Ad Choices</h1>
      <p>
        NewsTodayForYou планира да користи трети страни рекламни мрежи, вклучувајќи Google AdSense, за да финансира нашиот сервис и да обезбеди бесплатна содржина за нашите корисници.
      </p>
      <p>
        Овие рекламни мрежи може да користат колачиња (cookies) и слични технологии за персонализација на рекламите според вашите интереси. Рекламите може да се прикажуваат врз основа на вашата историја на прегледување, локација и други фактори.
      </p>
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Управување со рекламни преференци</h2>
      <p>
        Можете да управувате со вашите рекламни преференци на неколку начини:
      </p>
      <ul style={{ lineHeight: '1.8' }}>
        <li><strong>Преку вашиот прелистувач</strong> – прилагодете ги подесувањата за колачиња и реклами</li>
        <li><strong>Преку Google Ad Settings</strong> – посетете го <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">Google Ad Settings</a> за управување со персонализирани реклами</li>
        <li><strong>Преку подесувањата на уредот</strong> – мобилните уреди често имаат опции за ограничување на рекламирање</li>
      </ul>
      <p>
        За повеќе детали за тоа како ги обработуваме вашите податоци, ве молиме погледнете ја нашата <a href="/privacy">Политика за приватност</a> и <a href="/cookies">Политика за колачиња</a>.
      </p>
    </div>
  )
}


