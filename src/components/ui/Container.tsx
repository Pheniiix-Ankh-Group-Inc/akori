export default function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-315 mx-auto px-6">
      {children}
    </div>
  );
}