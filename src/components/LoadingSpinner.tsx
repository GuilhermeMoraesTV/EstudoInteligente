const LoadingSpinner = ({ texto = "Carregando..." }: { texto?: string }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 animate-spin-slow" />
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 animate-spin"
          style={{ animationDuration: "0.8s" }}
        />
        <div className="absolute inset-2 rounded-full bg-violet-500/10" />
      </div>
      <p className="text-sm text-muted-foreground">{texto}</p>
    </div>
  );
};

export default LoadingSpinner;