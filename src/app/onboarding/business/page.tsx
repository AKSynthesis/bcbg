import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CreateOrganization } from "@clerk/nextjs";

export default async function OnboardingBusinessPage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/onboarding/business");
  }

  if (orgId) {
    // Already has an active organization — no need to create another.
    // (A stylist creating a second business is a real future feature, but
    // not part of this onboarding flow.)
    redirect("/onboarding/timezone");
  }

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <CreateOrganization afterCreateOrganizationUrl="/onboarding/timezone" />
    </div>
  );
}