import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Package, ShoppingCart, TrendingUp } from 'lucide-react';

export default async function Home() {
  const session = await auth();

  // Redirect logged-in users to dashboard
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="flex justify-center">
            <Package className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Welcome to Our E-Commerce Platform
          </h1>
          <p className="text-xl text-muted-foreground">
            Your one-stop shop for quality products. Browse thousands of items, 
            manage your orders, and enjoy seamless shopping experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button asChild size="lg">
              <Link href="/auth/register">
                Get Started
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/login">
                Sign In
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center space-y-4 p-6 rounded-lg border">
            <div className="flex justify-center">
              <ShoppingCart className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Easy Shopping</h3>
            <p className="text-muted-foreground">
              Browse products, add to cart, and checkout with ease. 
              Track your orders in real-time.
            </p>
          </div>

          <div className="text-center space-y-4 p-6 rounded-lg border">
            <div className="flex justify-center">
              <Package className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Wide Selection</h3>
            <p className="text-muted-foreground">
              Thousands of products across multiple categories. 
              Find exactly what you need.
            </p>
          </div>

          <div className="text-center space-y-4 p-6 rounded-lg border">
            <div className="flex justify-center">
              <TrendingUp className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Best Prices</h3>
            <p className="text-muted-foreground">
              Competitive pricing, bulk discounts, and special offers 
              for corporate accounts.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-primary text-primary-foreground rounded-lg p-12 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Start Shopping?
          </h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Create your account today and get access to exclusive deals and offers.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link href="/auth/register">
              Create Account
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
