import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {

  const [status,setStatus] = useState("Giriş doğrulanıyor...");
  const [success,setSuccess] = useState(false);

  useEffect(()=>{
    handleCallback();
  },[]);

  const handleCallback = async () => {

    try{

      const params = new URLSearchParams(window.location.search);
      const isExtension = params.get("ext") === "true";

      if(!isExtension){
        window.location.href="/";
        return;
      }

      // session bazen geç gelir
      for(let i=0;i<8;i++){

        const {data,error} = await supabase.auth.getSession();

        if(data?.session){

          const session = data.session;

          const payload = {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_in: session.expires_in,
            user: session.user
          };

          // extension'a aktarmak için localStorage
          localStorage.setItem(
            "denetron_extension_auth",
            JSON.stringify(payload)
          );

          setSuccess(true);
          setStatus("Giriş başarılı!");

          // otomatik kapatma denemesi
          setTimeout(()=>{
            window.close();
          },1500);

          return;
        }

        await new Promise(r=>setTimeout(r,400));

      }

      setStatus("Session alınamadı");

    }catch(e){

      console.error(e);
      setStatus("Giriş sırasında hata oluştu");

    }

  };

  return (

    <div style={{
      minHeight:"100vh",
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      background:"#020617",
      color:"white",
      flexDirection:"column",
      gap:"20px",
      textAlign:"center",
      padding:"40px"
    }}>

      <div style={{
        width:60,
        height:60,
        border:"4px solid #334155",
        borderTopColor:"#6366f1",
        borderRadius:"50%",
        animation:"spin 1s linear infinite"
      }}/>

      <h2>{status}</h2>

      {success && (

        <div style={{maxWidth:420,opacity:.9}}>

          <p>
          ✅ <b>Denetron hesabınıza başarıyla giriş yaptınız.</b>
          </p>

          <p style={{marginTop:10}}>
          Chrome Extension artık hesabınıza bağlandı.
          </p>

          <p style={{marginTop:10}}>
          👉 Devam etmek için <b>tarayıcıdaki Denetron Extension popup'ını açın.</b>
          </p>

          <p style={{marginTop:10,fontSize:13,opacity:.7}}>
          Bu sekme otomatik kapanmazsa aşağıdaki butona basabilirsiniz.
          </p>

        </div>

      )}

      <button
        onClick={()=>window.close()}
        style={{
          marginTop:10,
          padding:"10px 18px",
          borderRadius:10,
          background:"#4f46e5",
          border:"none",
          color:"white",
          cursor:"pointer"
        }}
      >
        Sekmeyi Kapat
      </button>

      <a
        href="/auth/login"
        style={{
          marginTop:5,
          fontSize:13,
          opacity:.7,
          color:"#94a3b8"
        }}
      >
        Tekrar giriş yap
      </a>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>

  );

}