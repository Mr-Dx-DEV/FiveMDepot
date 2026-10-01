import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-heading font-bold text-red-400 mb-4">Oops!</h1>
        <p className="text-gray-400 text-lg mb-8">Something went wrong with authentication.</p>
        <Link href="/auth/login" className="btn-primary inline-block">
          Try Again
        </Link>
      </div>
    </div>
  );
}
