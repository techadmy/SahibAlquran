import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from '@sahibalquran/shared';
import {
  LogOut,
  GraduationCap,
  Menu,
  X,
  Moon,
  Sun,
  UserCog,
  Settings,
  Users,
  ClipboardList,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

import { cn } from '@/lib/utils';
import { AppLogo } from '@/components/AppLogo';
import { FontSizeControl } from '@/components/FontSizeControl';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Typography } from '@/components/ui/typography';
import { UserBadge } from '@/modules/users';
import { NotificationBell } from '@/modules/notifications';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  children: ReactNode;
}

export default function Layout({ user, onLogout, children }: LayoutProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const sidebarId = 'app-sidebar';

  const navigation = [
    {
      name: 'المجموعات',
      href: '/groups',
      icon: Users,
      roles: ['ADMIN', 'MODERATOR', 'STUDENT'],
    },
    {
      name: 'المستخدمون',
      href: '/users',
      icon: UserCog,
      roles: ['ADMIN'],
    },
    {
      name: 'الطلاب',
      href: '/learners',
      icon: GraduationCap,
      roles: ['ADMIN', 'MODERATOR'],
    },
    {
      name: 'الطلبات',
      href: '/requests',
      icon: ClipboardList,
      roles: ['ADMIN', 'MODERATOR', 'STUDENT'],
    },
  ];

  const filteredNavigation = navigation.filter((item) => item.roles.includes(user.role));

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMenuOpen]);

  return (
    <div className='h-dvh overflow-hidden bg-muted/30'>
      {/* Sidebar */}
      <aside
        id={sidebarId}
        className={cn(
          'fixed inset-y-0 right-0 z-40 w-56 border-l border-border bg-card transition-transform duration-300 lg:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className='flex flex-col h-full min-h-0'>
          {/* Logo */}
          <div className='flex items-center justify-between gap-2 p-4 border-b border-border'>
            <AppLogo className='mx-auto' />
            <Button
              variant='ghost'
              color='muted'
              size='icon'
              className='lg:hidden'
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label='إغلاق القائمة'
            >
              <X className='w-5 h-5' />
            </Button>
          </div>

          {/* User Info */}
          <div className='p-3 border-b border-border flex items-center justify-between gap-2'>
            <div className='flex items-center gap-2 min-w-0'>
              <Avatar size='sm'>
                <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className='min-w-0'>
                <Typography as='div' size='sm' weight='medium' className='truncate'>
                  {user.name}
                </Typography>
                <UserBadge role={user.role} size='sm' />
              </div>
            </div>

            <div className='flex items-center gap-1'>
              <NotificationBell isAuthenticated />
              <Link to='/profile' className='p-1 rounded-md hover:bg-muted transition'>
                <Settings className='w-4 h-4 text-muted-foreground' />
              </Link>
            </div>
          </div>

          {/* Navigation */}
          <nav className='flex-1 min-h-0 overflow-y-auto p-3 space-y-1'>
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Button
                  key={item.name}
                  asChild
                  variant={isActive ? 'soft' : 'ghost'}
                  color={isActive ? 'primary' : 'muted'}
                  size='sm'
                  className='w-full justify-start gap-2'
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Link to={item.href}>
                    <item.icon className='w-4 h-4' />
                    <Typography as='span' size='sm'>
                      {item.name}
                    </Typography>
                  </Link>
                </Button>
              );
            })}
          </nav>

          {/* Theme Toggle */}
          <div className='p-3 border-t border-border'>
            <Button
              onClick={toggleTheme}
              variant='ghost'
              color='muted'
              size='sm'
              className='w-full justify-start gap-2'
            >
              {isDark ? <Sun className='w-4 h-4' /> : <Moon className='w-4 h-4' />}
              <Typography as='span' size='sm'>
                {isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
              </Typography>
            </Button>
          </div>

          {/* Font Size Controls */}
          <div className='px-3 py-2 border-t border-border'>
            <FontSizeControl />
          </div>

          {/* Logout */}
          <div className='p-3 border-t border-border'>
            <Button
              onClick={onLogout}
              variant='ghost'
              color='danger'
              size='sm'
              className='w-full justify-start gap-2'
            >
              <LogOut className='w-4 h-4' />
              <Typography as='span' size='sm'>
                تسجيل الخروج
              </Typography>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className='lg:hidden fixed inset-0 bg-foreground/45 z-30'
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden='true'
        />
      )}

      {/* Main Content */}
      <div className='h-full lg:pr-56 flex flex-col'>
        <div className='lg:hidden shrink-0 px-4 pt-4 flex items-center justify-between'>
          {!isMobileMenuOpen && (
            <Button
              onClick={() => setIsMobileMenuOpen(true)}
              variant='outline'
              color='muted'
              size='icon'
              aria-label='فتح القائمة'
              aria-expanded={isMobileMenuOpen}
              aria-controls={sidebarId}
            >
              <Menu className='w-5 h-5' />
            </Button>
          )}
          <NotificationBell isAuthenticated />
        </div>
        <main className='h-full overflow-y-auto p-4 lg:p-6'>{children}</main>
      </div>
    </div>
  );
}
