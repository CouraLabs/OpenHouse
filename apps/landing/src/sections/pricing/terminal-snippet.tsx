import { WindowChrome } from '@/components/window-chrome.js'

export function TerminalSnippet({ commands }: { commands: string[] }) {
  return (
    <WindowChrome title="zsh" className="bg-bone">
      <pre className="bg-bone text-ink overflow-x-auto p-5 font-mono text-[13px] leading-7">
        {commands.map((command) => (
          <div key={command}>
            <span className="text-muted select-none">$ </span>
            {command}
          </div>
        ))}
      </pre>
    </WindowChrome>
  )
}
