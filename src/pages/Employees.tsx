import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, ArrowLeft } from "lucide-react";

export default function Employees() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {id && (
            <Button variant="ghost" size="icon" onClick={() => navigate('/employees')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Users className="h-8 w-8 text-purple-500" />
          <div>
            <h1 className="text-3xl font-bold">
              {id ? 'Çalışan Detayı' : 'Çalışanlar'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Personel yönetimi ve eğitim takibi
            </p>
          </div>
        </div>

        {!id && (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Yeni Çalışan Ekle
          </Button>
        )}
      </div>

      {/* Detail View */}
      {id && (
        <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
          <CardHeader>
            <CardTitle className="text-purple-600 dark:text-purple-400">
              Çalışan ID: {id}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Durum</p>
              <p className="text-lg font-semibold">İSG Eğitimi Bekleniyor</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Açıklama</p>
              <p>Çalışan detay sayfası yapım aşamasında. Bildirim sistemi başarıyla çalışıyor.</p>
            </div>
            <Button>Eğitim Ata</Button>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {!id && (
        <Card>
          <CardHeader>
            <CardTitle>Tüm Çalışanlar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg mb-2">Henüz çalışan kaydı yok</p>
              <p className="text-sm mb-6">
                Personel listesi ve eğitim takibi burada yapılacak
              </p>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                İlk Çalışanı Ekle
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}