import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@workspace/ui/components/button'
import { Check, Copy, Share2 } from 'lucide-react'

/** The props `CodeShare` takes. */
interface CodeShareProps {
  code: string
  /** The link that carries the code to the page that redeems it. */
  link: string
  /** The labels that name what is being shared, translated by the caller. */
  labels: { code: string; link: string; shareTitle: string }
}

/**
 * A one-time code, ready to hand over: the code and the link that carries
 * it, with Copy and — where the browser has one — the native Share sheet.
 * Nothing is emailed; the owner shares it however they like. Invites and
 * password reset codes both pass through here.
 */
export function CodeShare({ code, link, labels }: CodeShareProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator.share === 'function'

  const copy = async () => {
    await navigator.clipboard.writeText(link)
    setCopied(true)
  }

  const share = async () => {
    try {
      await navigator.share({ title: labels.shareTitle, url: link })
    } catch {
      // Dismissing the share sheet rejects; there is nothing to report.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{labels.code}</p>
        <code className="rounded-lg bg-muted px-3 py-2 font-mono text-sm break-all">
          {code}
        </code>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{labels.link}</p>
        <code className="rounded-lg bg-muted px-3 py-2 font-mono text-xs break-all">
          {link}
        </code>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={() => void copy()}>
          {copied ? <Check /> : <Copy />}
          {copied ? t('settings.share.copied') : t('settings.share.copy')}
        </Button>
        {canShare ? (
          <Button type="button" variant="outline" onClick={() => void share()}>
            <Share2 />
            {t('settings.share.share')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
