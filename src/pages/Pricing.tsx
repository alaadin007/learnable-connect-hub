
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const PricingPage = () => {
  const pricingTiers = [
    {
      name: "Basic",
      price: "$29",
      period: "/month",
      description: "Perfect for small schools with limited needs.",
      features: [
        "Up to 5 teachers",
        "Up to 100 students",
        "Basic AI assistance",
        "PDF document uploads",
        "Email support",
      ],
      buttonText: "Get Started",
      highlighted: false,
    },
    {
      name: "Professional",
      price: "$89",
      period: "/month",
      description: "Ideal for growing schools that need more features.",
      features: [
        "Up to 25 teachers",
        "Up to 500 students",
        "Advanced AI assistance",
        "PDF and image uploads",
        "Voice interaction",
        "Priority support",
      ],
      buttonText: "Try Professional",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large institutions with specific requirements.",
      features: [
        "Unlimited teachers",
        "Unlimited students",
        "Premium AI assistance",
        "Unlimited file uploads",
        "Custom integrations",
        "Dedicated support manager",
      ],
      buttonText: "Contact Us",
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow bg-gray-50">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4 gradient-text">Simple, Transparent Pricing</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the plan that's right for your school. All plans include core LearnAble features.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <div 
                key={index} 
                className={`bg-white rounded-lg shadow-lg p-8 flex flex-col h-full border ${
                  tier.highlighted ? 'border-learnable-blue' : 'border-transparent'
                } ${tier.highlighted ? 'transform md:-translate-y-4' : ''}`}
              >
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                  <div className="flex items-end">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-gray-500 ml-1">{tier.period}</span>
                  </div>
                  <p className="text-gray-600 mt-3">{tier.description}</p>
                </div>
                
                <div className="flex-grow">
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Button 
                  className={tier.highlighted ? "gradient-bg w-full" : "w-full"} 
                  variant={tier.highlighted ? "default" : "outline"}
                >
                  {tier.buttonText}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PricingPage;
