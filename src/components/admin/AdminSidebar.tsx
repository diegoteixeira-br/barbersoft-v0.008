import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Building2, 
  MessageSquare, 
  Settings, 
  LogOut,
  Shield,
  Handshake,
  FileText
} from "lucide-react";

const adminNavItems = [
  { 
    to: "/admin", 
    icon: LayoutDashboard, 
    label: "Dashboard",
    end: true
  },
  { 
    to: "/admin/companies", 
    icon: Building2, 
    label: "Barbearias" 
  },
  { 
    to: "/admin/feedbacks", 
    icon: MessageSquare, 
    label: "Feedbacks" 
  },
  { 
    to: "/admin/influencers", 
    icon: Handshake, 
    label: "Influenciadores" 
  },
  { 
    to: "/admin/blog", 
    icon: FileText, 
    label: "Blog" 
  },
  { 
    to: "/admin/settings", 
    icon: Settings, 
    label: "Configurações" 
  },
];

export function AdminSidebar() {
  const navigate = useNavigate();

  const handleExitAdmin = () => {
    navigate("/dashboard");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
      {/* Logo / Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">BarberSoft</h1>
          <span className="text-xs font-medium text-blue-400">Super Admin</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {adminNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={handleExitAdmin}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Voltar ao Sistema
        </button>
      </div>
    </aside>
  );
}
