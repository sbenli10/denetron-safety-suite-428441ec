// src/pages/ISGBotDeleted.tsx

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, RotateCcw, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface DeletedCompany {
  deleted_record_id: string;
  company_name: string;
  sgk_no: string;
  employee_count: number;
  deleted_at: string;
}

export default function ISGBotDeleted() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [deletedCompanies, setDeletedCompanies] = useState<DeletedCompany[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    }
    getUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadDeletedCompanies();
    }
  }, [userId]);

  async function loadDeletedCompanies() {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", userId!)
        .single();

      if (!profile?.organization_id) {
        throw new Error("Organization not found");
      }

      const { data, error } = await supabase
        .from("isgkatip_deleted_companies_view")
        .select("*")
        .eq("org_id", profile.organization_id)
        .is("restored_at", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;

      setDeletedCompanies(data || []);
    } catch (error: any) {
      console.error("Load error:", error);
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(deletedRecordId: string, companyName: string) {
    try {
      const supabase = createClient();

      const { error } = await supabase.rpc("restore_isgkatip_company", {
        p_deleted_record_id: deletedRecordId,
      });

      if (error) throw error;

      toast({
        title: "Başarılı",
        description: `${companyName} geri getirildi`,
      });

      loadDeletedCompanies();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return <div className="text-center py-12">Yükleniyor...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-2"
          onClick={() => navigate("/isg-bot")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri Dön
        </Button>
        <h1 className="text-3xl font-bold">Silme Geçmişi</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Silinmiş Firmalar ({deletedCompanies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {deletedCompanies.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Silinmiş firma yok</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Firma</TableHead>
                  <TableHead>SGK No</TableHead>
                  <TableHead>Silinme Tarihi</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletedCompanies.map((company) => (
                  <TableRow key={company.deleted_record_id}>
                    <TableCell>{company.company_name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {company.sgk_no}
                    </TableCell>
                    <TableCell>
                      {new Date(company.deleted_at).toLocaleString("tr-TR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() =>
                          handleRestore(
                            company.deleted_record_id,
                            company.company_name
                          )
                        }
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Geri Getir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}