import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SAfe_T',
  description: 'Stay Safe Anywhere',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('mock_geo') === '1' || localStorage.getItem('mock_geo') === '1') {
              localStorage.setItem('mock_geo', '1');
              const mockLocation = {
                coords: {
                  latitude: 20.3524,
                  longitude: 85.8189,
                  accuracy: 10,
                  altitude: null,
                  altitudeAccuracy: null,
                  heading: null,
                  speed: null
                },
                timestamp: Date.now()
              };
              navigator.geolocation.getCurrentPosition = function(success) {
                setTimeout(() => success(mockLocation), 50);
              };
              navigator.geolocation.watchPosition = function(success) {
                setTimeout(() => success(mockLocation), 50);
                return 123;
              };
              console.log("Geolocation mocked successfully to KIIT Area!");
            }
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
