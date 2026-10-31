export function TerminalSnippet({ commands }: { commands: string[] }) {
  return (
    <figure className="bg-chrome text-chrome-ink overflow-hidden rounded-[1.25rem]">
      <figcaption className="text-chrome-muted flex h-10 items-center border-b border-white/10 px-5 font-mono text-xs">
        zsh
      </figcaption>
      <pre className="overflow-x-auto p-5 font-mono text-[0.8125rem] leading-7">
        {commands.map((command) => (
          <div key={command}>
            <span className="text-chrome-muted select-none">$ </span>
            {command}
          </div>
        ))}
      </pre>
    </figure>
  )
}
