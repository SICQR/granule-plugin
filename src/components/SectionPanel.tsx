/**
 * SectionPanel — Labelled panel wrapper for parameter groups
 */
interface SectionPanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function SectionPanel({ title, children, className = '' }: SectionPanelProps) {
  return (
    <div className={`bg-panel-bg border border-panel-border rounded-lg p-4 ${className}`}>
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#8888a0] mb-3 font-medium">
        {title}
      </h3>
      {children}
    </div>
  );
}
