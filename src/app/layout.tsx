import React from 'react';
import type { Metadata, Viewport } from "next/types";
import "./globals.css";
import Navbar from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Changa_One } from 'next/font/google';
import WebVitalsScript from '@/components/web-vitals/WebVitalsScript';
import dynamic from 'next/dynamic';

// Composant pour charger le chatbot côté client
const ChatbotProvider = dynamic(() => 
  import('@/components/chatbot/ChatbotButton').then(mod => ({ 
    default: mod.default 
  })),
  { ssr: false }
);

// Composant de débogage pour les Web Vitals (uniquement en développement)
const WebVitalsDebugger = dynamic(() => 
  import('@/components/web-vitals/WebVitalsDebug').then(mod => ({
    default: mod.default
  })),
  { ssr: false }
);

// Composant Google Analytics (chargé côté client)
const GoogleAnalytics = dynamic(() => 
  import('@/components/analytics/GoogleAnalytics').then(mod => ({
    default: mod.default
  })),
  { ssr: false }
);

// Composant Google Tag Manager
const GoogleTagManager = dynamic(() => 
  import('@/components/analytics/GoogleTagManager').then(mod => ({
    default: mod.default
  })),
  { ssr: false }
);

// Définition de la police Changa One
const changaOne = Changa_One({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-changa-one',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
  userScalable: true,
  themeColor: '#ffffff'
}

export const metadata: Metadata = {
  metadataBase: new URL('https://www.domono.fr'),
  title: {
    default: "Domono Marseille",
    template: "%s | Domono Marseille"
  },
  description: "Expert en domotique et maisons connectées à Marseille et ses environs",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  formatDetection: {
    telephone: true,
    email: true,
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${changaOne.variable} overflow-x-hidden`}>
      <head>
        <link rel="dns-prefetch" href="https://www.domono.fr" />
        <link rel="preconnect" href="https://www.domono.fr" />
        
        {/* Google Analytics pour le suivi des performances */}
        <GoogleAnalytics />
        
        {/* Google Tag Manager */}
        <GoogleTagManager />
        
        {/* Préchargement optimisé des images critiques avec priorité et tailles adaptées */} 
        <link 
          rel="preload" 
          href="/assets/img/optimized/domono-bg-hero-480.webp" 
          as="image" 
          media="(max-width: 480px)" 
          fetchPriority="high"
          type="image/webp"
          imageSizes="100vw"
        />
        <link 
          rel="preload" 
          href="/assets/img/optimized/domono-bg-hero-768.webp" 
          as="image" 
          media="(min-width: 481px) and (max-width: 768px)" 
          fetchPriority="high" 
          type="image/webp"
          imageSizes="100vw"
        />
        <link 
          rel="preload" 
          href="/assets/img/optimized/domono-bg-hero-1280.webp" 
          as="image" 
          media="(min-width: 769px)" 
          fetchPriority="high"
          type="image/webp"
          imageSizes="100vw"
        />
        
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
        
        {/* Chargement CSS critique inline pour éviter les FOUC et améliorer LCP */}
        <style dangerouslySetInnerHTML={{ __html: `
          /* Styles critiques pour le premier affichage */
          :root {
            --color-teal: #0d9488;
            --color-orange: #f97316;
          }
          
          .hero-placeholder {
            background-image: linear-gradient(to bottom right, #0f766e, #134e4a);
          }
          
          @media (prefers-reduced-motion: no-preference) {
            .hero-image {
              transition: opacity 0.4s ease-in-out;
            }
          }
        `}} />
      </head>
      <body className="antialiased overflow-x-hidden w-full max-w-[100vw] font-changa-one">
        <Navbar />
        <div className="relative w-full">
          {children}
        </div>
        <Footer />
        {/* Chatbot flottant */}
        <ChatbotProvider />
        
        {/* Web Vitals tracking */}
        <WebVitalsScript />
        
        {/* Web Vitals debugger (dev only) */}
        <WebVitalsDebugger />
      </body>
    </html>
  );
}
