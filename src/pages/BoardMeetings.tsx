import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Plus,
  Calendar,
  Building2,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Edit,
  Trash2,
  Eye,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { MeetingStatus } from "@/types/boardMeeting";

interface Company {
  id: string;
  name: string;
  industry: string | null;
}

interface BoardMeetingListItem {
  id: string;
  company_id: string;
  user_id: string;
  meeting_number: string | null;
  meeting_date: string;
  meeting_time: string | null;
  location: string | null;
  president_name: string;
  secretary_name: string | null;
  status: MeetingStatus;
  notes: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  company?: Company;
  attendee_count?: number;
  agenda_count?: number;
}

export default function BoardMeetings() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [meetings, setMeetings] = useState<BoardMeetingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    if (user) {
      fetchMeetings();
    }
  }, [user]);

  const fetchMeetings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log("📊 Fetching board meetings...");

      // Fetch meetings
      const { data: meetingsData, error: meetingsError } = await supabase
        .from("board_meetings")
        .select(`
          *,
          company:companies(id, name, industry)
        `)
        .eq("user_id", user.id)
        .order("meeting_date", { ascending: false });

      if (meetingsError) throw meetingsError;

      // Fetch counts for each meeting
      const meetingsWithCounts = await Promise.all(
        (meetingsData || []).map(async (meeting) => {
          // Get attendee count
          const { count: attendeeCount } = await supabase
            .from("meeting_attendees")
            .select("*", { count: "exact", head: true })
            .eq("meeting_id", meeting.id);

          // Get agenda count
          const { count: agendaCount } = await supabase
            .from("meeting_agenda")
            .select("*", { count: "exact", head: true })
            .eq("meeting_id", meeting.id);

          return {
            ...meeting,
            attendee_count: attendeeCount || 0,
            agenda_count: agendaCount || 0,
          };
        })
      );

      console.log("✅ Meetings fetched:", meetingsWithCounts);
      setMeetings(meetingsWithCounts as BoardMeetingListItem[]);
    } catch (error: any) {
      console.error("❌ Fetch meetings error:", error);
      toast.error("Toplantılar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm("Bu toplantıyı silmek istediğinize emin misiniz?")) return;

    try {
      const { error } = await supabase.from("board_meetings").delete().eq("id", meetingId);

      if (error) throw error;

      setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
      toast.success("✅ Toplantı silindi");
    } catch (error: any) {
      console.error("Delete meeting error:", error);
      toast.error("Toplantı silinemedi");
    }
  };

  const getStatusBadge = (status: MeetingStatus) => {
    const statusConfig = {
      draft: {
        label: "Taslak",
        icon: Clock,
        className: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
      },
      completed: {
        label: "Tamamlandı",
        icon: CheckCircle2,
        className: "bg-green-500/20 text-green-600 border-green-500/30",
      },
      cancelled: {
        label: "İptal",
        icon: XCircle,
        className: "bg-red-500/20 text-red-600 border-red-500/30",
      },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch =
      meeting.company?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.meeting_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "all" || meeting.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Toplantılar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            İSG Kurul Toplantıları
          </h1>
          <p className="text-slate-400 mt-1">Toplantıları yönetin, gündem oluşturun ve tutanak çıkarın</p>
        </div>

        <Button
          onClick={() => navigate("/board-meetings/new")}
          className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Plus className="h-4 w-4" />
          Yeni Toplantı
        </Button>
      </div>

      <div className="flex gap-2">
        {/* ✅ YENİ: Rehber Butonu */}
        <Button
        variant="outline"
        onClick={() => navigate("/board-meetings/guide")}
        className="gap-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
        >
        <BookOpen className="h-4 w-4" />
        Nasıl Kullanılır?
        </Button>

        <Button
        onClick={() => navigate("/board-meetings/new")}
        className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
        <Plus className="h-4 w-4" />
        Yeni Toplantı
        </Button>
    </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Toplam Toplantı</p>
                <p className="text-2xl font-bold text-white mt-1">{meetings.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Tamamlanan</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {meetings.filter((m) => m.status === "completed").length}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Taslak</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {meetings.filter((m) => m.status === "draft").length}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Bu Ay</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {meetings.filter((m) => new Date(m.meeting_date).getMonth() === new Date().getMonth()).length}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Firma, lokasyon veya toplantı no ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48 bg-slate-800 border-slate-700 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="draft">Taslak</SelectItem>
                <SelectItem value="completed">Tamamlandı</SelectItem>
                <SelectItem value="cancelled">İptal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Meetings List */}
      <div className="space-y-4">
        {filteredMeetings.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-12 text-center">
              <Users className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Henüz toplantı yok</h3>
              <p className="text-slate-400 mb-6">
                İlk İSG Kurul Toplantınızı oluşturmak için "Yeni Toplantı" butonuna tıklayın
              </p>
              <Button
                onClick={() => navigate("/board-meetings/new")}
                className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600"
              >
                <Plus className="h-4 w-4" />
                Yeni Toplantı Oluştur
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredMeetings.map((meeting) => (
            <Card key={meeting.id} className="bg-slate-900/50 border-slate-800 hover:border-blue-500/30 transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-bold text-white">{meeting.meeting_number || "Toplantı"}</h3>
                      {getStatusBadge(meeting.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Building2 className="h-4 w-4" />
                        <span>{meeting.company?.name}</span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-400">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(meeting.meeting_date).toLocaleDateString("tr-TR")}
                          {meeting.meeting_time && ` - ${meeting.meeting_time}`}
                        </span>
                      </div>

                      {meeting.location && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Users className="h-4 w-4" />
                          <span>{meeting.location}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-slate-400">
                        <FileText className="h-4 w-4" />
                        <span>
                          {meeting.attendee_count || 0} Katılımcı · {meeting.agenda_count || 0} Gündem
                        </span>
                      </div>
                    </div>

                    {meeting.president_name && (
                      <p className="text-sm text-slate-500 mt-2">Başkan: {meeting.president_name}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/board-meetings/${meeting.id}`)}
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/board-meetings/${meeting.id}/edit`)}
                      className="text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    {meeting.pdf_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(meeting.pdf_url!, "_blank")}
                        className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteMeeting(meeting.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}