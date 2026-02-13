"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { loginStudio } from "@/presentation/lib/studio-settings-api";

type StudioLoginFormProps = {
  nextPath: string;
};

export function StudioLoginForm({ nextPath }: StudioLoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onLogin() {
    setIsSubmitting(true);
    setErrorMessage(null);

    const response = await loginStudio({
      username,
      password,
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setErrorMessage(response.error.message);
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle>Studio Login</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          value={username}
          placeholder="Username"
          onChange={(event) => {
            setUsername(event.target.value);
          }}
        />
        <Input
          type="password"
          value={password}
          placeholder="Password"
          onChange={(event) => {
            setPassword(event.target.value);
          }}
        />
        <Button
          className="w-full"
          disabled={isSubmitting}
          onClick={() => {
            void onLogin();
          }}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
        {errorMessage ? <p className="text-destructive text-xs">{errorMessage}</p> : null}
      </CardContent>
    </Card>
  );
}
