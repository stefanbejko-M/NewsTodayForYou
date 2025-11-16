export const metadata = {
  title: 'Privacy Policy — NewsTodayForYou',
  description: 'Learn how NewsTodayForYou collects, uses, and protects your information.'
}

export default function PrivacyPage() {
  return (
    <div className="container" style={{ padding: '24px 0', maxWidth: '800px' }}>
      <h1>Privacy Policy</h1>
      <p>
        NewsTodayForYou го цени вашето право на приватност. Оваа политика опишува како собираме, користиме и заштитуваме ваши информации.
      </p>
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Податоци што ги собираме</h2>
      <p>
        Собираме ограничени информации неопходни за работа и подобрување на нашиот сервис:
      </p>
      <ul style={{ lineHeight: '1.8' }}>
        <li><strong>Кориснички податоци</strong> – основна статистика за употреба, IP адреси (за безбедност и аналитика)</li>
        <li><strong>Колачиња (Cookies)</strong> – за преференци, аналитика и рекламирање</li>
        <li><strong>Логи</strong> – информации за пристап до страници и грешки</li>
      </ul>
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Како ги користиме податоците</h2>
      <p>
        Ги користиме податоците за:
      </p>
      <ul style={{ lineHeight: '1.8' }}>
        <li>Обезбедување и подобрување на нашиот сервис</li>
        <li>Прикажување релевантна содржина и реклами</li>
        <li>Мерење на перформансите и анализирање на трендови</li>
        <li>Заштита од злоупотреба и безбедност</li>
      </ul>
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Трети страни</h2>
      <p>
        Работиме со трети страни партнери, вклучувајќи рекламни мрежи (како Google AdSense) и аналитички провајдери, кои може да користат колачиња или слични технологии. Овие партнери имаат свои политики за приватност.
      </p>
      <p>
        <strong>Не продаваме ваши лични податоци.</strong> Можете да управувате со преференците за колачиња преку подесувањата на вашиот прелистувач.
      </p>
      <p>
        Ако имате прашања за оваа политика или нашите практики за податоци, ве молиме контактирајте не на <a href="mailto:office@newstoday4u.com">office@newstoday4u.com</a>.
      </p>
    </div>
  )
}


