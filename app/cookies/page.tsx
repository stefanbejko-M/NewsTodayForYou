export const metadata = {
  title: 'Cookie Policy — NewsTodayForYou',
  description: 'Information about how we use cookies and how you can manage them.'
}

export default function CookiesPage() {
  return (
    <div className="container" style={{ padding: '24px 0', maxWidth: '800px' }}>
      <h1>Cookie Policy</h1>
      <p>
        NewsTodayForYou користи колачиња (cookies) и слични технологии за да обезбеди основни функции на сајтот, да ги запамети вашите преференци, да анализира сообраќај и да го подобри нашиот сервис.
      </p>
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Типови на колачиња</h2>
      <p>
        Користиме неколку типови на колачиња:
      </p>
      <ul style={{ lineHeight: '1.8' }}>
        <li><strong>Неопходни колачиња</strong> – потребни за основна функционалност на сајтот</li>
        <li><strong>Преференци</strong> – за запаметување на вашите избори и подесувања</li>
        <li><strong>Аналитички колачиња</strong> – за мерење на употребата и подобрување на перформансите</li>
        <li><strong>Рекламни колачиња</strong> – користени од трети страни (како Google AdSense) за персонализирани реклами</li>
      </ul>
      <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>Управување со колачиња</h2>
      <p>
        Можете да управувате или оневозможите колачиња преку подесувањата на вашиот прелистувач. Ве молиме имајте предвид дека оневозможувањето на одредени колачиња може да влијае на вашето искуство при користење на нашиот сајт.
      </p>
      <p>
        За повеќе информации за тоа како ги обработуваме вашите податоци, ве молиме погледнете ја нашата <a href="/privacy">Политика за приватност</a>.
      </p>
    </div>
  )
}


