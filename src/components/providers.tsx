"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useEffect, useState } from "react";

export function RootProviders({ children }: { children: React.ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const [convex, setConvex] = useState<ConvexReactClient | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (convexUrl) setConvex(new ConvexReactClient(convexUrl));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [convexUrl]);
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (convexUrl && !convex) {
    return <div className="provider-loading" aria-label="Connecting Hypecast" />;
  }

  if (clerkKey) {
    return (
      <ClerkProvider publishableKey={clerkKey}>
        {convex ? (
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            {children}
          </ConvexProviderWithClerk>
        ) : (
          children
        )}
      </ClerkProvider>
    );
  }

  return convex ? <ConvexProvider client={convex}>{children}</ConvexProvider> : children;
}
