import React, { lazy, Suspense } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/landing/Hero";
import { Skeleton } from "@/components/ui/skeleton";

// Import the Testimonials component directly to avoid dynamic import issues
import Testimonials from "@/components/landing/Testimonials";

// Keep Features as lazy loaded
const Features = lazy(() => import("@/components/landing/Features"));

const LoadingFallback = () => (
  <div className="w-full py-12">
    <div className="container mx-auto px-4">
      <Skeleton className="h-8 w-3/4 mx-auto mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col space-y-3">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-3/6" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Home = () => {
  // Track page load analytics
  React.useEffect(() => {
    const pageLoadTime = performance.now();
    console.log(`Home component loaded in ${Math.round(pageLoadTime)}ms`);
    
    // Example of tracking visibility
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          console.log(`${entry.target.id} section is visible`);
        }
      });
    });
    
    // Observe important sections
    document.querySelectorAll('section[id]').forEach(section => {
      observer.observe(section);
    });
    
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <section id="hero">
          <Hero />
        </section>
        
        <Suspense fallback={<LoadingFallback />}>
          <section id="features">
            <Features />
          </section>
        </Suspense>
        
        <section id="testimonials">
          <Testimonials />
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Home;
