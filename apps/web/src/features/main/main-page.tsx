/**
 * The page a signed-in user lands on. Deliberately bare — the application
 * shell owns the chrome (sidebar, header, sign-out); this is a page slot.
 */
export function MainPage() {
  return <main className="flex flex-1 flex-col gap-4 p-6" />
}
