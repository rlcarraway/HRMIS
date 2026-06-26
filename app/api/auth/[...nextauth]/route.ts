import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import '@/lib/initOktaSettings'; // Initialize Okta settings from persistent storage

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
