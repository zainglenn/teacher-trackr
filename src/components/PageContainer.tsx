interface PageContainerProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function PageContainer({ title, description, action, children }: PageContainerProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 pb-1 border-b border-border/60">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {action && <div className="shrink-0 pt-1">{action}</div>}
      </div>
      {children}
    </div>
  );
}
