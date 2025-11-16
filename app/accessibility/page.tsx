export const metadata = {
  title: 'Accessibility — NewsTodayForYou',
  description: 'Our commitment to accessibility and how to reach us for assistance.'
}

export default function AccessibilityPage() {
  return (
    <div className="container" style={{ padding: '24px 0', maxWidth: '800px' }}>
      <h1>Accessibility</h1>
      <p>
        NewsTodayForYou е посветен на обезбедување пристапно искуство за сите корисници. Нашата цел е континуирано да го подобруваме нашиот сајт и да обезбедиме дека нашата содржина може да биде пристапна за луѓе со различни способности и технологии.
      </p>
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Наши напори</h2>
      <p>
        Се стремиме да:
      </p>
      <ul style={{ lineHeight: '1.8' }}>
        <li>Користиме семантички HTML за подобро читање од екрани</li>
        <li>Обезбедуваме алтернативен текст за слики</li>
        <li>Обезбедуваме контраст на бои кој е достапен за читање</li>
        <li>Тестираме со различни алатки и прелистувачи</li>
      </ul>
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Повратни информации</h2>
      <p>
        Ако наидете на какви било бариери за пристапност или имате предлози за подобрување, ве молиме контактирајте не на <a href="mailto:office@newstoday4u.com">office@newstoday4u.com</a> за да можеме да ги адресираме вашите загрижености.
      </p>
      <p>
        Вашите повратни информации се важни за нас и ќе работиме на подобрување на пристапноста на нашиот сајт.
      </p>
    </div>
  )
}


