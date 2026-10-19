import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@workspace/ui/components/button'
import { Check, Copy, Share2 } from 'lucide-react'

import { inviteLinkFor } from './use-invite-codes.js'

/**
 * A generated invite, ready to hand over: the code and the sign-up link
 * that prefills it, with Copy and — where the browser has one — the native
 * Share sheet. Nothing is emailed; the owner shares it however they like.
 */
export function InviteShare({ code }: { code: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const link = inviteLinkFor(code)
  const canShare = typeof navigator.share === 'function'

  const copy = async () => {
    await navigator.clipboard.writeText(link)
    setCopied(true)
  }

  const share = async () => {
    try {
      await navigator.share({
        title: t('settings.invite.share-title'),
        url: link,
      })
    } catch {
      // Dismissing the share sheet rejects; there is nothing to report.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">
          {t('settings.invite.code')}
        </p>
        <code className="rounded-lg bg-muted px-3 py-2 font-mono text-sm break-all">
          {code}
        </code>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">
          {t('settings.invite.link')}
        </p>
        <code className="rounded-lg bg-muted px-3 py-2 font-mono text-xs break-all">
          {link}
        </code>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={() => void copy()}>
          {copied ? <Check /> : <Copy />}
          {copied ? t('settings.invite.copied') : t('settings.invite.copy')}
        </Button>
        {canShare ? (
          <Button type="button" variant="outline" onClick={() => void share()}>
            <Share2 />
            {t('settings.invite.share')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
