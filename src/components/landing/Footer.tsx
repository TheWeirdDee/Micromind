export function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-border bg-bg">
      <div className="container mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center gap-8">
        <span className="font-serif text-xl text-text-primary">MicroMind</span>
        
        <div className="flex gap-8 font-mono text-[10px] tracking-widest uppercase text-text-muted">
          <span>Built on Celo</span>
          <span>Open Source</span>
          <span>© 2025</span>
        </div>
      </div>
    </footer>
  );
}
