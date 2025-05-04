
import React from "react";
import { Link } from "react-router-dom";
import { Twitter, Linkedin, Github } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-2xl font-bold gradient-text mb-4">LearnAble</h3>
            <p className="text-gray-500 mb-4">
              Empowering education with AI-assisted learning tools designed specifically for schools.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li><Link to="/features" className="text-gray-600 hover:text-learnable-blue transition-colors">Features</Link></li>
              <li><Link to="/pricing" className="text-gray-600 hover:text-learnable-blue transition-colors">Pricing</Link></li>
              <li><Link to="#" className="text-gray-600 hover:text-learnable-blue transition-colors">Testimonials</Link></li>
              <li><Link to="#" className="text-gray-600 hover:text-learnable-blue transition-colors">Case Studies</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-gray-600 hover:text-learnable-blue transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="text-gray-600 hover:text-learnable-blue transition-colors">Contact</Link></li>
              <li><Link to="#" className="text-gray-600 hover:text-learnable-blue transition-colors">Blog</Link></li>
              <li><Link to="#" className="text-gray-600 hover:text-learnable-blue transition-colors">Careers</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link to="#" className="text-gray-600 hover:text-learnable-blue transition-colors">Privacy Policy</Link></li>
              <li><Link to="#" className="text-gray-600 hover:text-learnable-blue transition-colors">Terms of Service</Link></li>
              <li><Link to="#" className="text-gray-600 hover:text-learnable-blue transition-colors">Cookie Policy</Link></li>
              <li><Link to="#" className="text-gray-600 hover:text-learnable-blue transition-colors">GDPR</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} LearnAble. All rights reserved.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="text-gray-500 hover:text-learnable-blue transition-colors">
              <Twitter className="h-5 w-5" />
              <span className="sr-only">Twitter</span>
            </a>
            <a href="#" className="text-gray-500 hover:text-learnable-blue transition-colors">
              <Linkedin className="h-5 w-5" />
              <span className="sr-only">LinkedIn</span>
            </a>
            <a href="#" className="text-gray-500 hover:text-learnable-blue transition-colors">
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
