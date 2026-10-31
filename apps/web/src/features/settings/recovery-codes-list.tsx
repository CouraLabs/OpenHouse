import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@workspace/ui/components/button'
import { Check, Copy, Download, Printer } from 'lucide-react'

function sheetOf(heading: string, note: string, codes: string[]): string {
  return [heading, note, '', ...codes, ''].join('\n')
}

export function RecoveryCodesList({ codes }: { codes: string[] }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const sheet = sheetOf(
    t('settings.recovery.sheet-heading'),
    t('settings.recovery.sheet-note'),
    codes
  )

  const copy = async () => {
    await navigator.clipboard.writeText(codes.join('\n'))
    setCopied(true)
  }

  const download = () => {
    const url = URL.createObjectURL(new Blob([sheet], { type: 'text/plain' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'kantim-recovery-codes.txt'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const print = () => {
    const sheetWindow = window.open('', '_blank', 'width=480,height=640')
    if (sheetWindow === null) {
      return
    }

    const pre = sheetWindow.document.createElement('pre')
    pre.textContent = sheet
    sheetWindow.document.title = t('settings.recovery.sheet-heading')
    sheetWindow.document.body.append(pre)
    sheetWindow.print()
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-destructive">
        {t('settings.recovery.shown-once')}
      </p>
      <ol className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-3 font-mono text-sm">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={() => void copy()}>
          {copied ? <Check /> : <Copy />}
          {copied ? t('settings.share.copied') : t('settings.recovery.copy')}
        </Button>
        <Button type="button" variant="outline" onClick={download}>
          <Download />
          {t('settings.recovery.download')}
        </Button>
        <Button type="button" variant="outline" onClick={print}>
          <Printer />
          {t('settings.recovery.print')}
        </Button>
      </div>
    </div>
  )
}
