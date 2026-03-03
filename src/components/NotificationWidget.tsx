import { Bell, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

export default function NotificationWidget() {
  const navigate = useNavigate();
  const { notifications, unreadCount } = useNotifications();

  const criticalNotifications = notifications.filter(
    n => !n.is_read && (n.priority === "critical" || n.priority === "high")
  ).slice(0, 3);

  return (
    <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-400" />
            Acil Bildirimler
          </div>
          {unreadCount > 0 && (
            <Badge className="bg-red-600 text-white">
              {unreadCount} yeni
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {criticalNotifications.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            ✅ Acil bildirim yok
          </div>
        ) : (
          <>
            {criticalNotifications.map((notification) => (
              <div
                key={notification.id}
                className="p-3 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-blue-500/50 transition-colors cursor-pointer"
                onClick={() => navigate(notification.action_url || "/notifications")}
              >
                <div className="flex items-start gap-2">
                  {notification.priority === "critical" ? (
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-orange-500 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white line-clamp-1">
                      {notification.title}
                    </p>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: tr,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full mt-3"
              onClick={() => navigate("/notifications")}
            >
              Tüm Bildirimleri Görüntüle
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}