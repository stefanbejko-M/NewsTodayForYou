export const metadata = {
  title: 'Contact — NewsTodayForYou',
  description: 'Get in touch with the NewsTodayForYou team.'
}

export default function ContactPage() {
  return (
    <div className="container" style={{ padding: '24px 0', maxWidth: '800px' }}>
      <h1>Contact</h1>
      <p>
        Добредојдовте да се контактирате со нас. Ве молиме да го користите следниот емаил за сите прашања и барања.
      </p>
      <p>
        <strong>Емаил:</strong> <a href="mailto:office@newstoday4u.com">office@newstoday4u.com</a>
      </p>
      <p>
        Овој емаил е достапен за:
      </p>
      <ul style={{ lineHeight: '1.8' }}>
        <li><strong>Деловна соработка</strong> – партнерства, рекламирање, спонзорства</li>
        <li><strong>Известување за грешки</strong> – технички проблеми, неточни информации</li>
        <li><strong>Барање за отстранување на содржина</strong> – DMCA барања, авторски права</li>
        <li><strong>Општи прашања</strong> – повратни информации, предлози</li>
      </ul>
      <p>
        Се стремиме да одговориме што е можно побрзо, обично во рок од 48 часа.
      </p>
    </div>
  )
}


