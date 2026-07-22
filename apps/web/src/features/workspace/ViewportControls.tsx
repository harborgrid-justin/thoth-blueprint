export function ViewportControls() {
  return (
    <div className="absolute top-4 left-20 z-20 flex select-none items-center gap-2 font-cad text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-muted-foreground">
      <button className="hover:text-primary transition-colors">[-]</button>
      <span>|</span>
      <button className="hover:text-primary transition-colors">[Top]</button>
      <span>|</span>
      <button className="hover:text-primary transition-colors">[2D Wireframe]</button>
    </div>
  );
}
