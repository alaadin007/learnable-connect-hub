
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import AcceptInvitation from "@/components/auth/AcceptInvitation";

const TeacherInvitation = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light flex items-center justify-center py-10 px-4">
        <AcceptInvitation />
      </main>
      <Footer />
    </div>
  );
};

export default TeacherInvitation;
