import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@workspace/ui/components/button'
import { Check, Copy, Share2 } from 'lucide-react'

interface CodeShareProps {
  code: string
  link: string
  labels: { code: string; link: string; shareTitle: string }
}

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
