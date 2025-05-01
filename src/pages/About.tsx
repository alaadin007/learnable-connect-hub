
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const AboutPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold mb-8 gradient-text">About LearnAble</h1>
            
            <div className="prose lg:prose-xl">
              <p className="text-lg leading-relaxed mb-6">
                LearnAble is an AI-powered learning platform designed specifically for educational institutions. 
                Our mission is to revolutionize the way students learn by providing personalized, AI-assisted 
                education that adapts to each student's unique needs.
              </p>
              
              <p className="text-lg leading-relaxed mb-6">
                Founded in 2023 by a team of educators and technologists, LearnAble combines cutting-edge 
                artificial intelligence with proven educational methodologies to create a learning experience 
                that is both effective and engaging.
              </p>
              
              <h2 className="text-2xl font-bold mt-10 mb-4">Our Vision</h2>
              <p className="text-lg leading-relaxed mb-6">
                We believe that every student deserves access to high-quality, personalized education. 
                Our vision is to create a world where AI-assisted learning is available to every student, 
                regardless of their background or location.
              </p>
              
              <h2 className="text-2xl font-bold mt-10 mb-4">Our Team</h2>
              <p className="text-lg leading-relaxed mb-6">
                LearnAble is built by a dedicated team of educators, developers, and AI specialists who are 
                passionate about improving education. Our diverse backgrounds and expertise allow us to 
                approach educational challenges from multiple perspectives.
              </p>
              
              <h2 className="text-2xl font-bold mt-10 mb-4">Get in Touch</h2>
              <p className="text-lg leading-relaxed">
                We're always looking to improve and expand our platform. If you have questions, feedback, 
                or would like to discuss how LearnAble can benefit your institution, please don't hesitate 
                to contact us.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AboutPage;
