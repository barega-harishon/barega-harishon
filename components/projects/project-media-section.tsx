"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  removeProjectSitePhoto,
  removeProjectSketch,
  uploadProjectSitePhotos,
  uploadProjectSketch,
} from "@/actions/project-media-upload";
import { setProjectSitePhotoPathsRawFromForm } from "@/actions/project-site-details";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SignedMediaRef } from "@/types/signed-media";

interface ProjectMediaSectionProps {
  projectId: string;
  photos: SignedMediaRef[];
  sketchPath: string | null;
  sketchSignedUrl: string | null;
  manualPhotoPathsText: string;
}

export function ProjectMediaSection({
  projectId,
  photos,
  sketchPath,
  sketchSignedUrl,
  manualPhotoPathsText,
}: ProjectMediaSectionProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ variant: "error" | "success"; text: string } | null>(
    null,
  );
  const [pathsState, pathsAction, pathsPending] = useActionState(
    setProjectSitePhotoPathsRawFromForm,
    null,
  );

  useEffect(() => {
    if (pathsState?.success) {
      router.refresh();
    }
  }, [pathsState, router]);

  function handlePhotosSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await uploadProjectSitePhotos(formData);
      if (result.success) {
        setFeedback({ variant: "success", text: result.message });
        form.reset();
        router.refresh();
      } else {
        setFeedback({ variant: "error", text: result.message });
      }
    });
  }

  function handleSketchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await uploadProjectSketch(formData);
      if (result.success) {
        setFeedback({ variant: "success", text: result.message });
        form.reset();
        router.refresh();
      } else {
        setFeedback({ variant: "error", text: result.message });
      }
    });
  }

  function handleRemovePhoto(path: string) {
    startTransition(async () => {
      const result = await removeProjectSitePhoto({ projectId, path });
      if (result.success) {
        setFeedback({ variant: "success", text: result.message });
        router.refresh();
      } else {
        setFeedback({ variant: "error", text: result.message });
      }
    });
  }

  function handleRemoveSketch() {
    startTransition(async () => {
      const result = await removeProjectSketch({ projectId });
      if (result.success) {
        setFeedback({ variant: "success", text: result.message });
        router.refresh();
      } else {
        setFeedback({ variant: "error", text: result.message });
      }
    });
  }

  return (
    <div className="space-y-8 border-t border-border pt-6">
      {feedback ? (
        <p
          className={
            feedback.variant === "error"
              ? "text-sm text-destructive"
              : "text-sm text-emerald-700 dark:text-emerald-400"
          }
          role={feedback.variant === "error" ? "alert" : "status"}
        >
          {feedback.text}
        </p>
      ) : null}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">תמונות שטח</h3>
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין תמונות שהועלו עדיין.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((p) => (
              <li
                className="space-y-2 rounded-[var(--radius)] border border-border bg-muted/30 p-2"
                key={p.path}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs from Supabase */}
                <img
                  alt=""
                  className="h-40 w-full rounded-md object-cover"
                  height={160}
                  src={p.url}
                  width={320}
                />
                <p className="truncate font-mono text-[10px] text-muted-foreground" title={p.path}>
                  {p.path}
                </p>
                <Button
                  disabled={pending}
                  onClick={() => handleRemovePhoto(p.path)}
                  size="sm"
                  type="button"
                  variant="destructive"
                >
                  מחיקה
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form className="space-y-3" encType="multipart/form-data" onSubmit={handlePhotosSubmit}>
          <input name="projectId" type="hidden" value={projectId} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="photos">
              העלאת תמונות (עד 12, עד 5MB כל אחת)
            </label>
            <Input
              accept="image/jpeg,image/png,image/webp"
              className="cursor-pointer"
              id="photos"
              multiple
              name="photos"
              required
              type="file"
            />
          </div>
          <Button disabled={pending} type="submit" variant="outline">
            {pending ? "מעלים…" : "העלאת תמונות"}
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">סקיצה</h3>
        {sketchSignedUrl && sketchPath ? (
          <div className="space-y-2 rounded-[var(--radius)] border border-border bg-muted/30 p-3">
            {sketchPath.endsWith(".pdf") ? (
              <a
                className="text-sm font-medium text-primary underline"
                href={sketchSignedUrl}
                rel="noreferrer"
                target="_blank"
              >
                פתיחת קובץ PDF בלשונית חדשה
              </a>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="סקיצה"
                className="max-h-64 w-auto rounded-md border border-border"
                src={sketchSignedUrl}
              />
            )}
            <p className="truncate font-mono text-[10px] text-muted-foreground">{sketchPath}</p>
            <Button
              disabled={pending}
              onClick={handleRemoveSketch}
              size="sm"
              type="button"
              variant="destructive"
            >
              הסרת סקיצה
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">לא הועלתה סקיצה.</p>
        )}

        <form className="space-y-3" encType="multipart/form-data" onSubmit={handleSketchSubmit}>
          <input name="projectId" type="hidden" value={projectId} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="sketch">
              העלאת סקיצה (תמונה או PDF, עד 8MB)
            </label>
            <Input
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="cursor-pointer"
              id="sketch"
              name="sketch"
              type="file"
            />
          </div>
          <Button disabled={pending} type="submit" variant="outline">
            {pending ? "מעלים…" : "העלאת סקיצה"}
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">נתיבים ידניים (מתקדם)</h3>
        <p className="text-xs text-muted-foreground">
          מחליף את רשימת נתיבי התמונות השמורים במסד. השתמשו רק אם יודעים את הנתיב המדויק ב־bucket.
        </p>
        <form action={pathsAction} className="space-y-3">
          <input name="projectId" type="hidden" value={projectId} />
          <Textarea
            className="min-h-[100px] font-mono text-xs"
            defaultValue={manualPhotoPathsText}
            name="raw"
            placeholder={"שורה לכל נתיב בתוך ה־bucket project-site-photos"}
          />
          {pathsState && !pathsState.success ? (
            <p className="text-sm text-destructive">{pathsState.message}</p>
          ) : null}
          {pathsState?.success ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">{pathsState.message}</p>
          ) : null}
          <Button disabled={pathsPending} type="submit" variant="ghost">
            {pathsPending ? "שומרים…" : "עדכון נתיבים ידניים"}
          </Button>
        </form>
      </section>
    </div>
  );
}
