import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Shield, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Employees() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {id && (
            <Button variant="ghost" size="icon" onClick={() => navigate("/employees")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Users className="h-8 w-8 text-sky-500" />
          <div>
            <h1 className="text-3xl font-bold">{id ? "Çalışan Detayı" : "Çalışanlar"}</h1>
            <p className="text-sm text-muted-foreground">Personel yönetimi, eğitim takibi ve KKD işlemleri.</p>
          </div>
        </div>

        {!id && (
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => navigate("/ppe-management")}>
              <Shield className="h-4 w-4" />
              KKD Zimmet
            </Button>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Yeni Çalışan Ekle
            </Button>
          </div>
        )}
      </div>

      {id ? (
        <Card className="border-sky-200 bg-sky-50/50 dark:bg-sky-950/20">
          <CardHeader>
            <CardTitle className="text-sky-700 dark:text-sky-300">Çalışan ID: {id}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Durum</p>
              <p className="text-lg font-semibold">Eğitim ve zimmet incelemesi bekliyor</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Açıklama</p>
              <p>Çalışan detay ekranı genişletilecek. Bu aşamada KKD zimmet ve diğer operasyon akışlarına kısayol veriliyor.</p>
            </div>
            <div className="flex gap-2">
              <Button>Eğitim Ata</Button>
              <Button variant="outline" className="gap-2" onClick={() => navigate("/ppe-management")}>
                <Shield className="h-4 w-4" />
                KKD Zimmeti Aç
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Tüm Çalışanlar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-12 text-center text-muted-foreground">
              <Users className="mx-auto mb-4 h-16 w-16 opacity-20" />
              <p className="mb-2 text-lg">Henüz çalışan kaydı yok</p>
              <p className="mb-6 text-sm">Personel listesi, eğitim takibi ve KKD ilişkili işlemler burada yönetilecek.</p>
              <div className="flex justify-center gap-2">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  İlk Çalışanı Ekle
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => navigate("/ppe-management")}>
                  <Shield className="h-4 w-4" />
                  KKD Zimmete Git
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
