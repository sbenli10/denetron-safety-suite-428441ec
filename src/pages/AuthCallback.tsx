// ====================================================
// AUTH CALLBACK FOR CHROME EXTENSION (DEBUG VERSION)
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
    console.log("🔥 AuthCallback started");

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isExtension = urlParams.get('ext') === 'true';

      console.log("🔎 URL:", window.location.href);
      console.log("🔎 isExtension:", isExtension);
      console.log("🔎 chrome.runtime exists:", !!(window as any).chrome?.runtime);

      if (!isExtension) {
        console.log("➡️ Regular web login, redirecting...");
        navigate('/');
        return;
      }

      console.log("🔐 Getting session from Supabase...");

      const { data: { session }, error } = await supabase.auth.getSession();

      console.log("📦 Session result:", session);
      console.log("❌ Session error:", error);

      if (error) {
        throw error;
      }

      if (!session) {
        console.log("⏳ Session not ready, retrying in 500ms...");
        setTimeout(handleAuthCallback, 500);
        return;
      }

      console.log("✅ Session found, sending to extension...");

      if ((window as any).chrome?.runtime) {
        console.log("📡 Sending message to extension...");

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
          (response: any) => {
            console.log("📨 Extension response:", response);

            if ((window as any).chrome.runtime.lastError) {
              console.error("❌ Runtime error:",
                (window as any).chrome.runtime.lastError);
            }

            console.log("🚪 Closing tab...");
            window.close();
          }
        );
      } else {
        console.log("⚠️ chrome.runtime not available, using fallback");

        localStorage.setItem(
          'denetron_extension_auth',
          JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_in: session.expires_in,
            user: session.user,
          })
        );

        alert('✅ Giriş başarılı! Extension popup\'ını açın.');
      }

    } catch (error) {
      console.error("💥 Auth callback error:", error);
      alert("Auth callback error. Console'a bak.");
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