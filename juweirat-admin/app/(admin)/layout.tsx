import Sidebar from '@/components/Sidebar';
import ChatWidget from '@/components/ChatWidget';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full print:block print:h-auto">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-y-auto print:block print:h-auto print:overflow-visible">
        {children}
      </main>
      <ChatWidget />
    </div>
  );
}
