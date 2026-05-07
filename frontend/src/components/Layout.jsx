import { Outlet, Link, useLocation } from 'react-router-dom'
import { BookOpen, ClipboardList, Brain, LogOut, User, LayoutDashboard, Sparkles, Gamepad2, Calendar } from 'lucide-react'

function Layout({ user, onLogout }) {
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Study Plans', href: '/study-plans', icon: BookOpen },
    { name: 'Quizzes', href: '/quizzes', icon: ClipboardList },
    { name: 'AI Quiz Generator', href: '/ai-quiz-generator', icon: Sparkles },
    { name: 'Mind Games', href: '/mind-games', icon: Gamepad2 },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-10">
        <div className="flex items-center h-16 px-6 border-b border-gray-200">
          <Brain className="w-8 h-8 text-primary-600 mr-3" />
          <span className="text-xl font-bold text-gray-900">SmartStudy</span>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className={`w-5 h-5 mr-3 ${isActive(item.href) ? 'text-primary-600' : 'text-gray-400'}`} />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="ml-64">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
