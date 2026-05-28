interface PageContainerProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function PageContainer({ title, description, action, children }: PageContainerProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}
