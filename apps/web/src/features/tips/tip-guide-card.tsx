import { useTranslation } from 'react-i18next'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Progress } from '@workspace/ui/components/progress'

import type { TipGuide } from './tip-guides.js'

/**
 * One tip guide as a card: its title and description, then every item —
 * a numbered tip with its body, or, when the item carries a percent, a
 * labeled progress bar showing that share of income.
 */
export function TipGuideCard({ guide }: { guide: TipGuide }) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(`tips.${guide.key}.title`)}</CardTitle>
        <CardDescription>{t(`tips.${guide.key}.description`)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {guide.items.map((item, index) =>
          item.percent !== undefined ? (
            <div key={item.key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">
                  {t(`tips.${guide.key}.items.${item.key}.title`)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {item.percent}%
                </span>
              </div>
              <Progress
                value={item.percent}
                aria-label={t(`tips.${guide.key}.items.${item.key}.title`)}
              />
              <p className="text-sm text-muted-foreground">
                {t(`tips.${guide.key}.items.${item.key}.body`)}
              </p>
            </div>
          ) : (
            <div key={item.key} className="flex gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {index + 1}
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">
                  {t(`tips.${guide.key}.items.${item.key}.title`)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t(`tips.${guide.key}.items.${item.key}.body`)}
                </p>
              </div>
            </div>
          )
        )}
      </CardContent>
    </Card>
  )
}
