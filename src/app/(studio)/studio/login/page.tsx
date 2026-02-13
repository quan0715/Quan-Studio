import { StudioLoginForm } from "@/presentation/features/studio-auth/studio-login-form";

type StudioLoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function StudioLoginPage({ searchParams }: StudioLoginPageProps) {
  const params = await searchParams;
  const nextPath = params.next?.trim() ? params.next : "/studio/posts";

  return (
    <section className="space-y-4 py-10">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Quan Studio</h1>
        <p className="text-muted-foreground text-xs">
          Sign in to access sync monitor and Notion integration settings.
        </p>
      </div>
      <StudioLoginForm nextPath={nextPath} />
    </section>
  );
}
