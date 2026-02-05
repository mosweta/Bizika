import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from 'react';

import {Globe, Shield, Users } from 'lucide-react';

export default function Footer() {
      const handleLogin = () => {
    navigate("/login");
  };
    const navigate = useNavigate();


return (
    <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              {/* Logo - Simple replacement */}

  
    
   
              <div className="flex items-center mb-6">
                <div className="h-10 w-10 bg-gray-200 rounded-xl flex items-center justify-center">
                  <img 
                    src="/logo4.png" 
                    alt="Pavoc LMS Logo" 
                    className="h-12 w-10 rounded-xl object-cover"
                    />
                </div>
                <span className="text-xl font-bold text-white ml-3">Pavoc LMS</span>
              </div>
              <p className="text-gray-400">
                Empowering professionals with practical and relevant education for real-world success across domains.
              </p>
            </div>
            
            
            
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-3">
                
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms and Conditions</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Connect</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>Global Community</span>
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Secure Platform</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>10+ Students</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500">
            <p>© {new Date().getFullYear()} Pavoc LMS. All rights reserved.</p>
          </div>
        </div>
      </footer>
)}