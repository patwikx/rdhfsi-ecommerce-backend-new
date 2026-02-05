import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'CUSTOMER' | 'CORPORATE' | 'ADMIN' | 'MANAGER' | 'STAFF';
      phone?: string | null;
      companyName?: string | null;
      taxId?: string | null;
      creditLimit?: number | null;
      paymentTerms?: number | null;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: 'CUSTOMER' | 'CORPORATE' | 'ADMIN' | 'MANAGER' | 'STAFF';
    phone?: string | null;
    companyName?: string | null;
    taxId?: string | null;
    creditLimit?: number | null;
    paymentTerms?: number | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    role: 'CUSTOMER' | 'CORPORATE' | 'ADMIN' | 'MANAGER' | 'STAFF';
    phone?: string | null;
    companyName?: string | null;
    taxId?: string | null;
    creditLimit?: number | null;
    paymentTerms?: number | null;
  }
}
