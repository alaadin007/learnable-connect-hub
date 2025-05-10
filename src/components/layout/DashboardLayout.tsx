
import React, { ReactNode, memo } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/landing/Footer';

interface DashboardLayoutProps {
  children: ReactNode;
}

// Using memo to prevent re-renders when only children change
const DashboardLayout = memo(({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
});

DashboardLayout.displayName = 'DashboardLayout';

export default DashboardLayout;
