import { createFileRoute, Link } from '@tanstack/react-router'
import { useI18n } from '../i18n/i18n'

export const Route = createFileRoute('/methodology')({
  head: () => ({ meta: [{ title: 'Methodology — Bharat Pulse' }] }),
  component: Methodology,
})

function Methodology() {
  const { t } = useI18n()
  return <>
    <a className="skip-link" href="#main">{t('app.skip')}</a>
    <header className="method-header"><Link className="btn" to="/" search={{}}>{t('method.back')}</Link></header>
    <main id="main" className="methodology" tabIndex={-1}>
      <h1>{t('method.title')}</h1>
      {(['ranking', 'clustering', 'wire', 'sources', 'map'] as const).map((topic) => <section key={topic}><h2>{t(`method.${topic}`)}</h2><p>{t(`method.${topic}Body`)}</p></section>)}
    </main>
  </>
}
