interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function Container({ children, className = "" }: ContainerProps) {
  return (
    <div className={`mx-auto max-w-[1080px] px-6 sm:px-10 ${className}`}>
      {children}
    </div>
  );
}
