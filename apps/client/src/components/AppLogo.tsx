import * as React from 'react';
import { cn } from '@/lib/utils';

type AppLogoProps = React.ComponentProps<'div'> & {
  size?: 'md' | 'lg';
};

const sizeClasses = {
  md: 'h-32',
  lg: 'h-40',
};

export function AppLogo({ className, size = 'md', ...props }: AppLogoProps) {
  return (
    <div className={cn('inline-flex items-center', className)} {...props}>
      <img
        src='/logo.jpeg'
        alt='صاحب القران'
        className={cn('w-auto object-contain', sizeClasses[size])}
      />
    </div>
  );
}
