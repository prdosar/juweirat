import Sidebar from '@/components/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full print:block print:h-auto">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden print:block print:h-auto print:overflow-visible">
        {children}
      </main>
    </div>
  );
}
