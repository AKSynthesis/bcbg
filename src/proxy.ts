import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// /admin/* = stylist dashboard. Requires a signed-in user who is a member
// of a Clerk Organization (their business). Per the guiding spec, the role
// check everywhere is simply "is this user an org member or not."
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

// /app/* = customer portal. Requires a signed-in user, org membership is
// irrelevant here — a stylist could even use /app to book with a peer.
const isCustomerRoute = createRouteMatcher(["/app(.*)", "/onboarding(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isAdminRoute(req)) {
    const authObject = await auth();

    if (!authObject.userId) {
      // Not signed in at all — send to sign-in, come back to /admin after.
      return authObject.redirectToSignIn({ returnBackUrl: req.url });
    }

    if (!authObject.orgId) {
      // Signed in but not an org member — this person is a customer, not
      // a stylist. They don't belong on the dashboard.
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (isCustomerRoute(req)) {
    await auth.protect(); // any signed-in user is fine here
  }

  // Everything else — the public /[stylistSlug] booking pages, marketing
  // pages, and the Clerk webhook route — stays unauthenticated.
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};