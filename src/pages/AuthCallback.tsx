// ====================================================
// AUTH CALLBACK FOR CHROME EXTENSION
// ====================================================

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Check if this is extension callback
      const urlParams = new URLSearchParams(window.location.search);
      const isExtension = urlParams.get('ext') === 'true';

      if (!isExtension) {
        // Regular web login
        navigate('/');
        return;
      }
      // Get session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        throw new Error('No session');
      }

      // Send auth data to extension (check if chrome API exists)
      if (typeof window !== 'undefined' && (window as any).chrome?.runtime) {
        (window as any).chrome.runtime.sendMessage(
          {
            type: 'DENETRON_AUTH_SUCCESS',
            data: {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_in: session.expires_in,
              user: session.user,
            },
          },
          () => {
            // Close this tab
            window.close();
          }
        );
      } else {
        // Fallback: Use localStorage and notify user
        localStorage.setItem('denetron_extension_auth', JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in,
          user: session.user,
        }));

        alert('✅ Giriş başarılı! Şimdi extension popup\'ını açın.');
        setTimeout(() => window.close(), 2000);
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      alert('Giriş başarısız. Lütfen tekrar deneyin.');
      window.close();
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        border: '4px solid #e2e8f0',
        borderTopColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <p>Extension'a yönlendiriliyor...</p>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}