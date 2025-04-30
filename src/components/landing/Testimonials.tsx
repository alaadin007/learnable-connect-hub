
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const testimonials = [
  {
    quote: "LearnAble has transformed how our students engage with learning materials. The AI tutoring is incredibly helpful.",
    author: "Sarah Johnson",
    role: "High School Principal",
    avatar: "SJ",
  },
  {
    quote: "As a teacher, I love the insights I get into my students' learning patterns. It helps me tailor my lessons better.",
    author: "Michael Chen",
    role: "Science Teacher",
    avatar: "MC",
  },
  {
    quote: "The platform is intuitive and engaging. I can learn at my own pace with AI support whenever I need it.",
    author: "Emma Rodriguez",
    role: "Student",
    avatar: "ER",
  },
];

const Testimonials = () => {
  return (
    <div className="bg-learnable-super-light py-16 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4 gradient-text">
            What Our Users Say
          </h2>
          <p className="text-lg text-learnable-gray max-w-2xl mx-auto">
            Join the schools and educators already benefiting from LearnAble
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="card-hover">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="mb-6">
                  <svg
                    className="h-10 w-10 text-learnable-light-blue opacity-50"
                    fill="currentColor"
                    viewBox="0 0 32 32"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M10 8c-3.3 0-6 2.7-6 6v10h6V14h-4c0-2.2 1.8-4 4-4zm12 0c-3.3 0-6 2.7-6 6v10h6V14h-4c0-2.2 1.8-4 4-4z" />
                  </svg>
                </div>
                
                <p className="mb-6 text-lg">{testimonial.quote}</p>
                
                <div className="mt-auto flex items-center flex-col">
                  <Avatar className="h-12 w-12 mb-3">
                    <AvatarImage src="" alt={testimonial.author} />
                    <AvatarFallback className="bg-gradient-to-br from-learnable-blue to-learnable-green text-white">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <p className="font-medium">{testimonial.author}</p>
                    <p className="text-sm text-learnable-gray">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
