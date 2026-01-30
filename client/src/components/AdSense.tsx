import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdSenseProps {
  adSlot: string;
  adFormat?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  fullWidthResponsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// AdSense component for displaying Google Ads
// To use: Add your AdSense publisher ID to index.html and replace adSlot with your ad unit ID
export function AdSense({ 
  adSlot, 
  adFormat = 'auto', 
  fullWidthResponsive = true,
  className = '',
  style = {}
}: AdSenseProps) {
  const adRef = useRef<HTMLModElement>(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    if (isLoaded.current) return;
    
    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        window.adsbygoogle.push({});
        isLoaded.current = true;
      }
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  return (
    <div className={`adsense-container ${className}`} style={style}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // Replace with your AdSense publisher ID
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
      />
    </div>
  );
}

// Placeholder ad component for development/demo
export function AdPlaceholder({ 
  type = 'banner',
  className = ''
}: { 
  type?: 'banner' | 'sidebar' | 'in-article' | 'rectangle';
  className?: string;
}) {
  const sizes = {
    banner: { width: '100%', height: '90px', label: 'Banner Ad (728x90)' },
    sidebar: { width: '300px', height: '250px', label: 'Sidebar Ad (300x250)' },
    'in-article': { width: '100%', height: '280px', label: 'In-Article Ad (Responsive)' },
    rectangle: { width: '336px', height: '280px', label: 'Rectangle Ad (336x280)' },
  };

  const size = sizes[type];

  return (
    <div 
      className={`bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-500 ${className}`}
      style={{ width: size.width, height: size.height, minHeight: size.height }}
    >
      <div className="text-xs uppercase tracking-wider mb-1">Advertisement</div>
      <div className="text-[10px] text-gray-600">{size.label}</div>
      <div className="text-[10px] text-amber-500/50 mt-2">Connect AdSense to display ads</div>
    </div>
  );
}

// Instructions component for setting up AdSense
export function AdSenseSetupInstructions() {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-amber-400">Google AdSense Setup Instructions</h3>
      
      <div className="space-y-3 text-sm text-gray-300">
        <div className="flex gap-3">
          <span className="bg-amber-500 text-black w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold">1</span>
          <div>
            <p className="font-medium">Create AdSense Account</p>
            <p className="text-gray-500">Visit <a href="https://www.google.com/adsense/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">google.com/adsense</a> and sign up with your Google account.</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <span className="bg-amber-500 text-black w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold">2</span>
          <div>
            <p className="font-medium">Add Your Site</p>
            <p className="text-gray-500">Submit your website URL for review. Google will verify your site meets their policies.</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <span className="bg-amber-500 text-black w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold">3</span>
          <div>
            <p className="font-medium">Get Your Publisher ID</p>
            <p className="text-gray-500">Once approved, find your Publisher ID (ca-pub-XXXXXXXXXXXXXXXX) in your AdSense dashboard.</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <span className="bg-amber-500 text-black w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold">4</span>
          <div>
            <p className="font-medium">Create Ad Units</p>
            <p className="text-gray-500">Create ad units for different placements (banner, sidebar, in-article) and note their slot IDs.</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <span className="bg-amber-500 text-black w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold">5</span>
          <div>
            <p className="font-medium">Update Your Code</p>
            <p className="text-gray-500">Replace the placeholder IDs in <code className="bg-gray-800 px-1 rounded">AdSense.tsx</code> and <code className="bg-gray-800 px-1 rounded">index.html</code> with your actual IDs.</p>
          </div>
        </div>
      </div>
      
      <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 mt-4">
        <p className="text-amber-400 text-sm">
          <strong>Tip:</strong> AdSense approval typically takes 1-2 weeks. In the meantime, focus on creating quality content and driving traffic to your site.
        </p>
      </div>
    </div>
  );
}
