'use client';

import { useEffect } from 'react';

export function PlaidScriptLoader() {
  useEffect(() => {
    // Check if script is already loaded
    if (document.querySelector('script[src*="plaid.com/link"]')) {
      return;
    }

    // Create and append the Plaid script
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup if component unmounts (though this rarely happens for layout components)
      const existingScript = document.querySelector('script[src*="plaid.com/link"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return null;
}
