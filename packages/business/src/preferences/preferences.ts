import { startPages, type StartPage } from "@workspace/domain"

export function toStartPage(value: string): StartPage {
  return (startPages as readonly string[]).includes(value)
    ? (value as StartPage)
    : "/"
}
