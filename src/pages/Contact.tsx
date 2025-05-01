
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const ContactPage = () => {
  const { toast } = useToast();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message sent",
      description: "We've received your message and will get back to you soon.",
    });
    // Reset the form
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow bg-gray-50">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-4 gradient-text text-center">Contact Us</h1>
            <p className="text-lg text-center text-gray-600 mb-12">
              Have questions or feedback? We'd love to hear from you.
            </p>
            
            <div className="grid md:grid-cols-2 gap-12">
              <div className="bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-6">Send us a message</h2>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <Input id="name" name="name" required />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <Input id="email" name="email" type="email" required />
                    </div>
                    
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <Input id="subject" name="subject" required />
                    </div>
                    
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                      <Textarea id="message" name="message" rows={5} required />
                    </div>
                    
                    <Button type="submit" className="w-full gradient-bg">
                      Send Message
                    </Button>
                  </div>
                </form>
              </div>
              
              <div>
                <div className="bg-white p-8 rounded-lg shadow-md mb-8">
                  <h2 className="text-xl font-bold mb-4">Our Office</h2>
                  <p className="mb-2">123 Education Lane</p>
                  <p className="mb-2">Learning City, LE4 5RN</p>
                  <p className="mb-2">United States</p>
                </div>
                
                <div className="bg-white p-8 rounded-lg shadow-md">
                  <h2 className="text-xl font-bold mb-4">Contact Information</h2>
                  <p className="mb-2">Email: info@learnable.edu</p>
                  <p className="mb-2">Phone: +1 (555) 123-4567</p>
                  <p>Support Hours: 9AM-5PM EST, Monday-Friday</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ContactPage;
